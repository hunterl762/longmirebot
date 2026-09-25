const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const { getGuildSettings, setGuildSettings } = require('./settings');

const API = 'https://discord.com/api/v10';
const ADMINISTRATOR = 0x8n;
const MANAGE_GUILD = 0x20n;

const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Longmire Dashboard</title><style>
:root{font-family:Inter,system-ui,sans-serif;color:#f4f7fb;background:#0c1018;color-scheme:dark}
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at top,#17213a 0,#0c1018 45%)}
button,input{font:inherit}.shell{width:min(1180px,calc(100% - 32px));margin:auto;padding:48px 0}
.hero,.heading,.account{display:flex;justify-content:space-between;gap:20px;align-items:center}.hero{margin-bottom:28px}
h1{font-size:clamp(2rem,5vw,3.5rem);letter-spacing:-.04em}.eyebrow{color:#8da2fb;font-weight:800;font-size:.78rem;letter-spacing:.16em}
.muted,small{color:#98a2b3}.card{background:#181f2de8;border:1px solid #283247;border-radius:18px;padding:22px;box-shadow:0 16px 50px #0004}
.layout{display:grid;grid-template-columns:300px 1fr;gap:20px}.guilds,.commands{display:grid;gap:10px}
.guild{display:flex;gap:12px;align-items:center;text-align:left;border:1px solid #313d55;background:#141b28;color:inherit;border-radius:12px;padding:12px;cursor:pointer}
.guild:disabled{opacity:.5}.commands{grid-template-columns:repeat(2,minmax(0,1fr));margin-top:16px}
.command{display:flex;justify-content:space-between;gap:14px;align-items:center;border:1px solid #2c374d;border-radius:14px;padding:16px;background:#111824}
.command p{color:#a7b0c0}.button{display:inline-flex;border:0;border-radius:10px;padding:10px 15px;background:#5865f2;color:#fff;font-weight:800;text-decoration:none;cursor:pointer}
.secondary{background:#242d3f}.field{display:grid;gap:8px;margin:24px 0}#prefix{max-width:180px;border:1px solid #38445b;border-radius:10px;background:#0f1520;color:#fff;padding:10px 12px}
.hidden{display:none!important}.status{min-height:24px;color:#a9f0c1}@media(max-width:820px){.hero,.heading{align-items:flex-start;flex-direction:column}.layout{grid-template-columns:1fr}.commands{grid-template-columns:1fr}}
</style></head><body><main class="shell"><header class="hero"><div><p class="eyebrow">LONGMIRE BOT</p><h1>Server command control</h1><p class="muted">Set each server's prefix and choose which commands members can use.</p></div><div id="account"></div></header>
<section id="login" class="card hidden"><h2>Connect Discord</h2><p>Sign in to configure servers where you have Manage Server or Administrator.</p><a class="button" href="/auth/discord">Sign in with Discord</a></section>
<section id="dash" class="layout hidden"><aside class="card"><h2>Your servers</h2><div id="guilds" class="guilds"></div></aside><section class="card"><div id="empty"><h2>Select a server</h2><p class="muted">Only servers you manage are shown.</p></div>
<form id="form" class="hidden"><div class="heading"><div><p class="eyebrow">SERVER SETTINGS</p><h2 id="guild-name"></h2></div><button class="button" type="submit">Save changes</button></div>
<label class="field"><b>Command prefix</b><input id="prefix" maxlength="5" required><small>1-5 characters, no spaces.</small></label><h3>Commands</h3><div id="commands" class="commands"></div><p id="status" class="status"></p></form></section></section></main>
<script>
const $=s=>document.querySelector(s);let active=null;
async function api(url,o={}){const r=await fetch(url,{...o,headers:{'Content-Type':'application/json',...(o.headers||{})}});const p=r.status===204?null:await r.json().catch(()=>({}));if(!r.ok){const e=new Error(p?.error||'Request failed');e.status=r.status;throw e}return p}
function signedOut(){$('#login').classList.remove('hidden');$('#dash').classList.add('hidden')}
async function boot(){try{const u=await api('/api/me');$('#dash').classList.remove('hidden');$('#account').innerHTML='<div class="account"><b>'+u.username+'</b><button id="logout" class="button secondary">Log out</button></div>';$('#logout').onclick=async()=>{await api('/auth/logout',{method:'POST'});location.reload()};renderGuilds(await api('/api/guilds'))}catch(e){signedOut()}}
function renderGuilds(gs){const box=$('#guilds');box.innerHTML='';for(const g of gs){const b=document.createElement('button');b.className='guild';b.disabled=!g.botPresent;b.innerHTML='<span><b>'+g.name+'</b><br><small>'+(g.botPresent?'Configure':'Bot not installed')+'</small></span>';b.onclick=()=>loadGuild(g.id);box.appendChild(b)}}
async function loadGuild(id){const d=await api('/api/guilds/'+id+'/settings');active=id;$('#empty').classList.add('hidden');$('#form').classList.remove('hidden');$('#guild-name').textContent=d.guild.name;$('#prefix').value=d.settings.prefix;const box=$('#commands');box.innerHTML='';for(const c of d.commands){const l=document.createElement('label');l.className='command';l.innerHTML='<div><b>'+c.name+'</b><p>'+c.description+'</p><code>'+d.settings.prefix+c.usage+'</code></div><input type="checkbox" data-command="'+c.name+'" '+(d.settings.disabledCommands.includes(c.name)?'':'checked')+'>';box.appendChild(l)}}
$('#form').onsubmit=async e=>{e.preventDefault();const disabled=[...document.querySelectorAll('[data-command]')].filter(x=>!x.checked).map(x=>x.dataset.command);$('#status').textContent='Saving...';try{const r=await api('/api/guilds/'+active+'/settings',{method:'POST',body:JSON.stringify({prefix:$('#prefix').value,disabledCommands:disabled})});$('#prefix').value=r.settings.prefix;$('#status').textContent='Saved.'}catch(err){$('#status').textContent=err.message}};
boot();
</script></body></html>`;

function canManage(guild) {
  const p = BigInt(guild.permissions || '0');
  return (p & ADMINISTRATOR) === ADMINISTRATOR || (p & MANAGE_GUILD) === MANAGE_GUILD;
}

async function discord(path, token) {
  const r = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`Discord API ${r.status}: ${await r.text()}`);
  return r.json();
}

async function startDashboard(client) {
  if (String(process.env.DASHBOARD_ENABLED || 'true').toLowerCase() === 'false') return;
  const required = ['DISCORD_CLIENT_ID','DISCORD_CLIENT_SECRET','DISCORD_REDIRECT_URI','SESSION_SECRET'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) return console.warn(`Dashboard disabled; missing: ${missing.join(', ')}`);

  const app = express();
  if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
  app.use(express.json());
  app.use(session({
    secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 86400000 }
  }));
  app.get('/', (req, res) => res.type('html').send(page));

  app.get('/auth/discord', (req, res) => {
    const state = crypto.randomBytes(24).toString('hex');
    req.session.oauthState = state;
    const q = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      redirect_uri: process.env.DISCORD_REDIRECT_URI,
      response_type: 'code',
      scope: 'identify guilds',
      state
    });
    res.redirect(`https://discord.com/oauth2/authorize?${q}`);
  });

  app.get('/auth/discord/callback', async (req, res, next) => {
    try {
      if (!req.query.code || req.query.state !== req.session.oauthState) return res.status(400).send('Invalid OAuth request.');
      const body = new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: String(req.query.code),
        redirect_uri: process.env.DISCORD_REDIRECT_URI
      });
      const tr = await fetch(`${API}/oauth2/token`, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body
      });
      if (!tr.ok) throw new Error(`OAuth token exchange failed: ${tr.status}`);
      const token = await tr.json();
      const user = await discord('/users/@me', token.access_token);
      req.session.accessToken = token.access_token;
      req.session.user = { id: user.id, username: user.username };
      delete req.session.oauthState;
      res.redirect('/');
    } catch (e) { next(e); }
  });

  app.post('/auth/logout', (req, res) => req.session.destroy(() => res.status(204).end()));
  const auth = (req, res, next) => req.session.user && req.session.accessToken ? next() : res.status(401).json({ error: 'Not signed in' });

  async function guilds(req) {
    return (await discord('/users/@me/guilds', req.session.accessToken))
      .filter(canManage)
      .map(g => ({ id: g.id, name: g.name, botPresent: client.guilds.cache.has(g.id) }));
  }

  async function managed(req, res, next) {
    try {
      const g = (await guilds(req)).find(x => x.id === req.params.guildId);
      if (!g) return res.status(403).json({ error: 'You do not manage this server.' });
      if (!g.botPresent) return res.status(409).json({ error: 'The bot is not in this server.' });
      req.dashboardGuild = g;
      next();
    } catch (e) { next(e); }
  }

  app.get('/api/me', auth, (req, res) => res.json(req.session.user));
  app.get('/api/guilds', auth, async (req, res, next) => { try { res.json(await guilds(req)); } catch (e) { next(e); } });
  app.get('/api/guilds/:guildId/settings', auth, managed, (req, res) => {
    res.json({
      guild: req.dashboardGuild,
      settings: getGuildSettings(req.params.guildId),
      commands: client.commands.map(c => ({ name: c.name, description: c.description, usage: c.usage || c.name }))
    });
  });
  app.post('/api/guilds/:guildId/settings', auth, managed, (req, res) => {
    try {
      const valid = new Set(client.commands.keys());
      const disabled = Array.isArray(req.body.disabledCommands)
        ? req.body.disabledCommands.filter(x => valid.has(String(x))) : [];
      res.json({ settings: setGuildSettings(req.params.guildId, { prefix: req.body.prefix, disabledCommands: disabled }) });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  app.use((e, req, res, next) => {
    console.error('Dashboard error:', e);
    res.status(500).json({ error: 'Dashboard request failed.' });
  });

  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => console.log(`Dashboard listening on port ${port}`));
}

module.exports = { startDashboard };
