const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const session = require('express-session');
const { ChannelType } = require('discord.js');
const { escapeHtml } = require('../lib/format');

const DISCORD_API = 'https://discord.com/api/v10';
const MANAGE_GUILD = 0x20n;
const ADMINISTRATOR = 0x8n;

function uniqueCommands(client) {
  return [...client.commands.values()]
    .filter((command, index, all) => all.findIndex((item) => item.name === command.name) === index)
    .filter((command) => !command.hidden)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function hasManagePermission(guild) {
  const permissions = BigInt(guild.permissions || '0');
  return (permissions & ADMINISTRATOR) !== 0n || (permissions & MANAGE_GUILD) !== 0n;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value) return [value];
  return [];
}

function page(title, body, user = null) {
  const userBlock = user
    ? `<div class="user"><img src="${escapeHtml(user.avatarUrl)}" alt=""><span>${escapeHtml(user.username)}</span><a href="/logout">Log out</a></div>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} · Longmire Bot</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <header><a class="brand" href="/">Longmire Bot</a>${userBlock}</header>
  <main>${body}</main>
  <footer>Longmire Bot dashboard · Discord server configuration</footer>
</body>
</html>`;
}

function loginRequired(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  return next();
}

async function discordFetch(pathname, accessToken) {
  const response = await fetch(`${DISCORD_API}${pathname}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`Discord API ${response.status}: ${await response.text()}`);
  return response.json();
}

function startDashboard({ client, settingsStore }) {
  const app = express();
  const port = Number(process.env.PORT || 3000);
  const callbackUrl = process.env.DASHBOARD_CALLBACK_URL;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const sessionSecret = process.env.SESSION_SECRET;

  app.set('trust proxy', 1);
  app.use(express.urlencoded({ extended: false }));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(session({
    secret: sessionSecret || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 8,
    },
  }));

  if (!sessionSecret) {
    console.warn('SESSION_SECRET is not set. Sessions will be invalidated whenever the process restarts.');
  }

  app.get('/health', (req, res) => {
    res.json({ ok: true, ready: client.isReady(), guilds: client.guilds.cache.size });
  });

  app.get('/', (req, res) => {
    if (!req.session.user) {
      return res.send(page('Dashboard', `
        <section class="hero card">
          <p class="eyebrow">LONGMIRE BOT</p>
          <h1>Configure command access from the web.</h1>
          <p>Sign in with Discord to manage prefixes, enable or disable commands, and restrict commands by role or channel.</p>
          <a class="button" href="/login">Sign in with Discord</a>
        </section>
      `));
    }
    return res.redirect('/servers');
  });

  app.get('/login', (req, res) => {
    if (!clientId || !clientSecret || !callbackUrl) {
      return res.status(503).send(page('Setup required', `
        <section class="card"><h1>Dashboard OAuth is not configured.</h1>
        <p>Set <code>DISCORD_CLIENT_ID</code>, <code>DISCORD_CLIENT_SECRET</code>, and <code>DASHBOARD_CALLBACK_URL</code> in your environment.</p></section>
      `));
    }

    const state = crypto.randomBytes(24).toString('hex');
    req.session.oauthState = state;
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: callbackUrl,
      scope: 'identify guilds',
      state,
    });
    return res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
  });

  app.get('/auth/discord/callback', async (req, res) => {
    try {
      if (!req.query.code || !req.query.state || req.query.state !== req.session.oauthState) {
        return res.status(400).send(page('Login failed', '<section class="card"><h1>Invalid OAuth state.</h1><a href="/login">Try again</a></section>'));
      }

      const tokenBody = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: String(req.query.code),
        redirect_uri: callbackUrl,
      });
      const tokenResponse = await fetch(`${DISCORD_API}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenBody,
      });
      if (!tokenResponse.ok) throw new Error(`OAuth token exchange failed: ${await tokenResponse.text()}`);
      const token = await tokenResponse.json();

      const [user, guilds] = await Promise.all([
        discordFetch('/users/@me', token.access_token),
        discordFetch('/users/@me/guilds', token.access_token),
      ]);

      req.session.user = {
        id: user.id,
        username: user.global_name || user.username,
        avatarUrl: user.avatar
          ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
          : 'https://cdn.discordapp.com/embed/avatars/0.png',
      };
      req.session.guilds = guilds;
      req.session.csrf = crypto.randomBytes(24).toString('hex');
      delete req.session.oauthState;
      return res.redirect('/servers');
    } catch (error) {
      console.error('OAuth callback failed:', error);
      return res.status(500).send(page('Login failed', '<section class="card"><h1>Discord login failed.</h1><p>Check the OAuth credentials and callback URL, then try again.</p></section>'));
    }
  });

  app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/'));
  });

  app.get('/servers', loginRequired, (req, res) => {
    const manageable = (req.session.guilds || [])
      .filter(hasManagePermission)
      .filter((guild) => client.guilds.cache.has(guild.id));

    const cards = manageable.length
      ? manageable.map((guild) => {
        const live = client.guilds.cache.get(guild.id);
        const icon = guild.icon
          ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
          : 'https://cdn.discordapp.com/embed/avatars/0.png';
        return `<a class="server-card card" href="/guild/${guild.id}">
          <img src="${escapeHtml(icon)}" alt="">
          <div><strong>${escapeHtml(live?.name || guild.name)}</strong><span>Configure commands</span></div>
        </a>`;
      }).join('')
      : '<section class="card"><h2>No manageable servers found</h2><p>You need Manage Server or Administrator in a server where Longmire Bot is already installed.</p></section>';

    return res.send(page('Your servers', `<h1>Your servers</h1><div class="server-grid">${cards}</div>`, req.session.user));
  });

  app.get('/guild/:guildId', loginRequired, async (req, res) => {
    const authGuild = (req.session.guilds || []).find((guild) => guild.id === req.params.guildId && hasManagePermission(guild));
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!authGuild || !guild) return res.status(403).send(page('Forbidden', '<section class="card"><h1>You cannot manage this server.</h1></section>', req.session.user));

    const settings = settingsStore.getGuild(guild.id);
    const commands = uniqueCommands(client);
    const roles = guild.roles.cache
      .filter((role) => role.id !== guild.id && !role.managed)
      .sort((a, b) => b.position - a.position);
    const channels = guild.channels.cache
      .filter((channel) => [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum].includes(channel.type))
      .sort((a, b) => a.rawPosition - b.rawPosition);

    const commandCards = commands.map((command) => {
      const rule = settingsStore.getCommandRule(guild.id, command);
      const roleOptions = roles.map((role) => `<option value="${role.id}" ${rule.allowedRoleIds.includes(role.id) ? 'selected' : ''}>${escapeHtml(role.name)}</option>`).join('');
      const channelOptions = channels.map((channel) => `<option value="${channel.id}" ${rule.allowedChannelIds.includes(channel.id) ? 'selected' : ''}>#${escapeHtml(channel.name)}</option>`).join('');
      return `<article class="command-card card">
        <div class="command-heading"><div><h2>${escapeHtml(command.name)}</h2><p>${escapeHtml(command.description || '')}</p></div><code>${escapeHtml(settings.prefix)}${escapeHtml(command.usage || command.name)}</code></div>
        <div class="toggle-row">
          <label><input type="checkbox" name="cmd_${command.name}_enabled" ${rule.enabled ? 'checked' : ''}> Enabled</label>
          ${command.ownerOnly ? '<span class="badge">Bot owner only</span>' : `<label><input type="checkbox" name="cmd_${command.name}_admin" ${rule.adminOnly ? 'checked' : ''}> Manage Server only</label>`}
        </div>
        ${command.ownerOnly ? '' : `<div class="restrictions">
          <label>Allowed roles <small>Leave empty for everyone.</small><select multiple name="cmd_${command.name}_roles">${roleOptions}</select></label>
          <label>Allowed channels <small>Leave empty for every channel.</small><select multiple name="cmd_${command.name}_channels">${channelOptions}</select></label>
        </div>`}
      </article>`;
    }).join('');

    return res.send(page(`${guild.name} settings`, `
      <div class="page-heading"><div><a class="back" href="/servers">← Servers</a><h1>${escapeHtml(guild.name)}</h1><p>Changes apply immediately after saving.</p></div></div>
      <form method="post" action="/guild/${guild.id}" class="settings-form">
        <input type="hidden" name="csrf" value="${escapeHtml(req.session.csrf)}">
        <section class="card prefix-card"><label>Command prefix <input name="prefix" maxlength="5" value="${escapeHtml(settings.prefix)}" required></label><p>1–5 characters. Example: <code>?</code> or <code>!</code></p></section>
        <div class="commands-grid">${commandCards}</div>
        <div class="save-bar"><button class="button" type="submit">Save settings</button></div>
      </form>
    `, req.session.user));
  });

  app.post('/guild/:guildId', loginRequired, (req, res) => {
    const authGuild = (req.session.guilds || []).find((guild) => guild.id === req.params.guildId && hasManagePermission(guild));
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!authGuild || !guild) return res.sendStatus(403);
    if (!req.body.csrf || req.body.csrf !== req.session.csrf) return res.status(403).send('Invalid CSRF token.');

    const commands = {};
    for (const command of uniqueCommands(client)) {
      const current = settingsStore.getCommandRule(guild.id, command);
      commands[command.name] = {
        enabled: req.body[`cmd_${command.name}_enabled`] === 'on',
        adminOnly: command.ownerOnly ? current.adminOnly : req.body[`cmd_${command.name}_admin`] === 'on',
        allowedRoleIds: command.ownerOnly ? [] : asArray(req.body[`cmd_${command.name}_roles`]).filter((id) => guild.roles.cache.has(id)),
        allowedChannelIds: command.ownerOnly ? [] : asArray(req.body[`cmd_${command.name}_channels`]).filter((id) => guild.channels.cache.has(id)),
      };
    }

    settingsStore.updateGuild(guild.id, { prefix: req.body.prefix, commands });
    req.session.csrf = crypto.randomBytes(24).toString('hex');
    return res.redirect(`/guild/${guild.id}`);
  });

  app.use((req, res) => res.status(404).send(page('Not found', '<section class="card"><h1>Page not found.</h1><a href="/">Return home</a></section>', req.session?.user)));

  app.listen(port, () => {
    console.log(`Dashboard listening on port ${port}.`);
  });

  return app;
}

module.exports = { startDashboard };
