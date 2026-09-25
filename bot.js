require('dotenv').config();
const os = require('os');
const {
  ActivityType, Client, Collection, EmbedBuilder, Events,
  GatewayIntentBits, PermissionFlagsBits, WebhookClient, version
} = require('discord.js');
const { getGuildSettings } = require('./settings');
const { startDashboard } = require('./dashboard');

if (!process.env.DISCORD_TOKEN) throw new Error('DISCORD_TOKEN is required. Copy .env.example to .env.');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.commands = new Collection();
const add = (command) => client.commands.set(command.name, command);

add({
  name: 'avatar', description: "Show a user's avatar.", usage: 'avatar [@user]',
  async execute(c, m) {
    const u = m.mentions.users.first() || m.author;
    await m.channel.send({ embeds: [new EmbedBuilder()
      .setColor(0x5865f2).setTitle(`${u.username}'s avatar`)
      .setImage(u.displayAvatarURL({ size: 1024 })).setTimestamp()] });
  }
});

add({
  name: 'botinfo', description: 'Show information about the bot.', usage: 'botinfo',
  async execute(c, m) {
    await m.channel.send({ embeds: [new EmbedBuilder().setColor(0x5865f2)
      .setTitle('Bot Information').setThumbnail(c.user.displayAvatarURL())
      .addFields(
        { name: 'Bot', value: c.user.tag, inline: true },
        { name: 'Servers', value: String(c.guilds.cache.size), inline: true },
        { name: 'Discord.js', value: `v${version}`, inline: true },
        { name: 'Created', value: `<t:${Math.floor(c.user.createdTimestamp / 1000)}:F>` }
      ).setTimestamp()] });
  }
});

add({
  name: 'help', description: 'List available commands.', usage: 'help',
  async execute(c, m, a, s) {
    const fields = c.commands
      .filter(x => !s.disabledCommands.includes(x.name))
      .map(x => ({ name: `${s.prefix}${x.usage || x.name}`, value: x.description }));
    await m.channel.send({ embeds: [new EmbedBuilder().setColor(0x5865f2)
      .setTitle(`${c.user.username} Commands`)
      .setDescription(`Current prefix: \`${s.prefix}\``)
      .addFields(fields.slice(0, 25))
      .setFooter({ text: 'Commands can be enabled or disabled from the web dashboard.' })] });
  }
});

add({
  name: 'ping', description: 'Show bot and Discord gateway latency.', usage: 'ping',
  async execute(c, m) {
    const sent = await m.channel.send('🏓 Pinging...');
    await sent.edit(`🏓 Pong! Round trip: **${sent.createdTimestamp - m.createdTimestamp}ms** • Gateway: **${Math.round(c.ws.ping)}ms**`);
  }
});

add({
  name: 'purge', description: 'Bulk-delete recent messages.', usage: 'purge <1-100>',
  async execute(c, m, a) {
    if (!m.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return m.reply('You need **Manage Messages** to use this command.');
    if (!m.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages))
      return m.reply('I need **Manage Messages** to do that.');
    const n = Number.parseInt(a[0], 10);
    if (!Number.isInteger(n) || n < 1 || n > 100) return m.reply('Choose a number from 1 to 100.');
    const deleted = await m.channel.bulkDelete(n, true);
    const note = await m.channel.send(`Deleted **${deleted.size}** message(s).`);
    setTimeout(() => note.delete().catch(() => {}), 3000);
  }
});

add({
  name: 'serverinfo', description: 'Show information about this Discord server.', usage: 'serverinfo',
  async execute(c, m) {
    const owner = await m.guild.fetchOwner();
    const members = await m.guild.members.fetch();
    const bots = members.filter(x => x.user.bot).size;
    await m.channel.send({ embeds: [new EmbedBuilder().setColor(0x5865f2)
      .setTitle(m.guild.name).setThumbnail(m.guild.iconURL({ size: 256 }))
      .addFields(
        { name: 'Owner', value: owner.user.tag, inline: true },
        { name: 'Members', value: String(m.guild.memberCount), inline: true },
        { name: 'Humans', value: String(members.size - bots), inline: true },
        { name: 'Bots', value: String(bots), inline: true },
        { name: 'Channels', value: String(m.guild.channels.cache.size), inline: true },
        { name: 'Created', value: `<t:${Math.floor(m.guild.createdTimestamp / 1000)}:F>` }
      ).setTimestamp()] });
  }
});

add({
  name: 'stats', description: 'Show runtime and host statistics.', usage: 'stats',
  async execute(c, m) {
    const sec = Math.floor(c.uptime / 1000);
    const up = `${Math.floor(sec / 86400)}d ${Math.floor(sec % 86400 / 3600)}h ${Math.floor(sec % 3600 / 60)}m ${sec % 60}s`;
    const users = c.guilds.cache.reduce((n, g) => n + g.memberCount, 0);
    await m.channel.send({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle('Bot Stats')
      .addFields(
        { name: 'Uptime', value: up, inline: true },
        { name: 'Servers', value: c.guilds.cache.size.toLocaleString(), inline: true },
        { name: 'Users', value: users.toLocaleString(), inline: true },
        { name: 'Channels', value: c.channels.cache.size.toLocaleString(), inline: true },
        { name: 'Memory', value: `${(process.memoryUsage().heapUsed / 1048576).toFixed(1)} MB`, inline: true },
        { name: 'Discord.js', value: `v${version}`, inline: true },
        { name: 'Node', value: process.version, inline: true },
        { name: 'Platform', value: `${os.platform()} ${os.arch()}`, inline: true }
      ).setTimestamp()] });
  }
});

add({
  name: 'set-stream', description: 'Set the bot streaming status (owner only).', usage: 'set-stream <status>',
  async execute(c, m, a) {
    if (!process.env.OWNER_ID || m.author.id !== process.env.OWNER_ID)
      return m.reply('This command is restricted to the bot owner.');
    const status = a.join(' ').trim();
    if (!status) return m.reply('Provide a streaming status.');
    c.user.setPresence({
      activities: [{ name: status, type: ActivityType.Streaming, url: process.env.STREAM_URL || 'https://twitch.tv/' }],
      status: 'online'
    });
    await m.channel.send('✅ Streaming status updated.');
  }
});

add({
  name: 'uptime', description: 'Show how long the bot has been online.', usage: 'uptime',
  async execute(c, m) {
    const s = Math.floor(c.uptime / 1000);
    await m.channel.send({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle('Bot Uptime')
      .addFields(
        { name: 'Days', value: String(Math.floor(s / 86400)), inline: true },
        { name: 'Hours', value: String(Math.floor(s % 86400 / 3600)), inline: true },
        { name: 'Minutes', value: String(Math.floor(s % 3600 / 60)), inline: true },
        { name: 'Seconds', value: String(s % 60), inline: true }
      ).setTimestamp()] });
  }
});

add({
  name: 'userinfo', description: 'Show information about a server member.', usage: 'userinfo [@user]',
  async execute(c, m) {
    const x = m.mentions.members.first() || m.member;
    const roles = x.roles.cache.filter(r => r.id !== m.guild.id).map(r => r.toString()).slice(0, 15).join(', ') || 'None';
    await m.channel.send({ embeds: [new EmbedBuilder().setColor(x.displayColor || 0x5865f2)
      .setTitle(x.user.tag).setThumbnail(x.user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'Nickname', value: x.nickname || 'None', inline: true },
        { name: 'Bot', value: x.user.bot ? 'Yes' : 'No', inline: true },
        { name: 'Joined', value: x.joinedTimestamp ? `<t:${Math.floor(x.joinedTimestamp / 1000)}:F>` : 'Unknown' },
        { name: 'Account Created', value: `<t:${Math.floor(x.user.createdTimestamp / 1000)}:F>` },
        { name: 'Roles', value: roles }
      ).setTimestamp()] });
  }
});

function updateActivity() {
  if (client.user) client.user.setActivity(`${client.guilds.cache.size} servers • ${process.env.DEFAULT_PREFIX || '!'}help`, { type: ActivityType.Playing });
}

client.once(Events.ClientReady, async ready => {
  console.log(`${ready.user.tag} is online on ${ready.guilds.cache.size} server(s).`);
  updateActivity();
  if (process.env.LOG_WEBHOOK_URL) {
    new WebhookClient({ url: process.env.LOG_WEBHOOK_URL })
      .send(`${ready.user.tag} is online on ${ready.guilds.cache.size} server(s).`)
      .catch(e => console.error('Startup webhook failed:', e.message));
  }
});

client.on(Events.GuildCreate, updateActivity);
client.on(Events.GuildDelete, updateActivity);

client.on(Events.GuildMemberAdd, async member => {
  const id = process.env.WELCOME_CHANNEL_ID;
  if (!id) return;
  const ch = member.guild.channels.cache.get(id);
  if (!ch || typeof ch.send !== 'function') return;
  await ch.send({ embeds: [new EmbedBuilder().setColor(0x5865f2)
    .setTitle(`Welcome to ${member.guild.name}!`)
    .setDescription(`Welcome ${member}. We're glad you're here.`)
    .setThumbnail(member.user.displayAvatarURL()).setTimestamp()] })
    .catch(e => console.error('Welcome failed:', e.message));
});

client.on(Events.MessageCreate, async m => {
  if (m.author.bot || !m.guild) return;
  const s = getGuildSettings(m.guild.id);
  if (!m.content.startsWith(s.prefix)) return;
  const body = m.content.slice(s.prefix.length).trim();
  if (!body) return;
  const [raw, ...args] = body.split(/\s+/);
  const name = raw.toLowerCase();
  const cmd = client.commands.get(name);
  if (!cmd) return;
  if (s.disabledCommands.includes(name)) return m.reply(`The \`${name}\` command is disabled on this server.`);
  try { await cmd.execute(client, m, args, s); }
  catch (e) {
    console.error(`Command ${name} failed:`, e);
    await m.reply('That command ran into an error.').catch(() => {});
  }
});

startDashboard(client).catch(e => console.error('Dashboard failed to start:', e));
client.login(process.env.DISCORD_TOKEN);
