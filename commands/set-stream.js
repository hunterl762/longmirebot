const { ActivityType, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'set-stream',
  aliases: ['stream'],
  description: 'Changes the bot streaming activity. Bot owner only.',
  usage: 'set-stream <status text>',
  ownerOnly: true,
  async execute({ client, message, args }) {
    const status = args.join(' ').trim();
    if (!status) return message.reply('Provide the streaming status text you want me to display.');

    client.user.setPresence({
      activities: [{ name: status, type: ActivityType.Streaming, url: 'https://twitch.tv/' }],
      status: 'online',
    });

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setDescription(`✅ Streaming status changed to **${status}**.`);
    return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  },
};
