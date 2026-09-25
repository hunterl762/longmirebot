require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const {
  ActivityType,
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  PermissionFlagsBits,
} = require('discord.js');
const { SettingsStore } = require('./lib/settings');
const { startDashboard } = require('./dashboard/server');

if (!process.env.BOT_TOKEN) {
  throw new Error('BOT_TOKEN is required. Copy .env.example to .env and add your Discord bot token.');
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.commands = new Collection();
const commandDirectory = path.join(__dirname, 'commands');
for (const filename of fs.readdirSync(commandDirectory).filter((file) => file.endsWith('.js'))) {
  const command = require(path.join(commandDirectory, filename));
  if (!command.name || typeof command.execute !== 'function') {
    console.warn(`Skipping invalid command file: ${filename}`);
    continue;
  }

  client.commands.set(command.name.toLowerCase(), command);
  for (const alias of command.aliases || []) {
    client.commands.set(alias.toLowerCase(), command);
  }
}

const settingsStore = new SettingsStore({ defaultPrefix: process.env.DEFAULT_PREFIX || '?' });

function hasManageGuild(member) {
  return member.permissions.has(PermissionFlagsBits.Administrator)
    || member.permissions.has(PermissionFlagsBits.ManageGuild);
}

function isAllowedByRule(message, command, rule) {
  const isManager = hasManageGuild(message.member);

  if (!rule.enabled) {
    return { allowed: false, reason: 'That command is disabled in this server.' };
  }

  if (command.ownerOnly) {
    if (!process.env.BOT_OWNER_ID || message.author.id !== process.env.BOT_OWNER_ID) {
      return { allowed: false, reason: 'That command is restricted to the configured bot owner.' };
    }
    return { allowed: true };
  }

  if (rule.adminOnly && !isManager) {
    return { allowed: false, reason: 'That command is restricted to server managers.' };
  }

  if (!isManager && rule.allowedChannelIds.length > 0 && !rule.allowedChannelIds.includes(message.channel.id)) {
    return { allowed: false, reason: 'That command is not enabled in this channel.' };
  }

  if (!isManager && rule.allowedRoleIds.length > 0) {
    const hasAllowedRole = rule.allowedRoleIds.some((roleId) => message.member.roles.cache.has(roleId));
    if (!hasAllowedRole) {
      return { allowed: false, reason: 'You do not have a role that can use that command.' };
    }
  }

  return { allowed: true };
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`${readyClient.user.tag} is online in ${readyClient.guilds.cache.size} server(s).`);
  readyClient.user.setActivity(`${process.env.DEFAULT_PREFIX || '?'}help • ${readyClient.guilds.cache.size} servers`, {
    type: ActivityType.Watching,
  });

  startDashboard({ client: readyClient, settingsStore });
});

client.on(Events.GuildCreate, () => {
  client.user.setActivity(`${process.env.DEFAULT_PREFIX || '?'}help • ${client.guilds.cache.size} servers`, {
    type: ActivityType.Watching,
  });
});

client.on(Events.GuildDelete, () => {
  client.user.setActivity(`${process.env.DEFAULT_PREFIX || '?'}help • ${client.guilds.cache.size} servers`, {
    type: ActivityType.Watching,
  });
});

client.on(Events.MessageCreate, async (message) => {
  if (!message.guild || message.author.bot) return;

  const guildSettings = settingsStore.getGuild(message.guild.id);
  const prefix = guildSettings.prefix;
  if (!message.content.startsWith(prefix)) return;

  const raw = message.content.slice(prefix.length).trim();
  if (!raw) return;

  const [commandName, ...args] = raw.split(/\s+/);
  const command = client.commands.get(commandName.toLowerCase());
  if (!command) return;

  const rule = settingsStore.getCommandRule(message.guild.id, command);
  const access = isAllowedByRule(message, command, rule);
  if (!access.allowed) {
    await message.reply({ content: access.reason, allowedMentions: { repliedUser: false } }).catch(() => {});
    return;
  }

  try {
    await command.execute({ client, message, args, prefix, settingsStore });
  } catch (error) {
    console.error(`Command ${command.name} failed:`, error);
    await message.reply({
      content: 'Something went wrong while running that command.',
      allowedMentions: { repliedUser: false },
    }).catch(() => {});
  }
});

client.login(process.env.BOT_TOKEN);
