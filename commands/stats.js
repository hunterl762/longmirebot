const os = require('node:os');
const { EmbedBuilder, version } = require('discord.js');
const { formatDuration } = require('../lib/format');

module.exports = {
  name: 'stats',
  description: 'Shows runtime and system statistics for the bot.',
  usage: 'stats',
  async execute({ client, message }) {
    const memoryMb = process.memoryUsage().heapUsed / 1024 / 1024;
    const totalMemoryMb = os.totalmem() / 1024 / 1024;
    const load = os.loadavg()[0];

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Longmire Bot Stats')
      .addFields(
        { name: 'Uptime', value: formatDuration(client.uptime || 0), inline: true },
        { name: 'Servers', value: client.guilds.cache.size.toLocaleString(), inline: true },
        { name: 'Cached Users', value: client.users.cache.size.toLocaleString(), inline: true },
        { name: 'Channels', value: client.channels.cache.size.toLocaleString(), inline: true },
        { name: 'Gateway Ping', value: `${Math.round(client.ws.ping)}ms`, inline: true },
        { name: 'Memory', value: `${memoryMb.toFixed(1)} / ${totalMemoryMb.toFixed(0)} MB`, inline: true },
        { name: '1m Load Average', value: load.toFixed(2), inline: true },
        { name: 'discord.js', value: `v${version}`, inline: true },
        { name: 'Node.js', value: process.version, inline: true },
      )
      .setTimestamp();

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  },
};
