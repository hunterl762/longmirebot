const { EmbedBuilder } = require('discord.js');
const { formatDuration } = require('../lib/format');

module.exports = {
  name: 'uptime',
  description: 'Shows how long the bot process has been running.',
  usage: 'uptime',
  async execute({ client, message }) {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Bot Uptime')
      .setDescription(`⏱️ **${formatDuration(client.uptime || 0)}**`)
      .setTimestamp();

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  },
};
