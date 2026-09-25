const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'avatar',
  aliases: ['pfp'],
  description: 'Shows your avatar or the avatar of a mentioned user.',
  usage: 'avatar [@user]',
  async execute({ message }) {
    const user = message.mentions.users.first() || message.author;
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`${user.username}'s avatar`)
      .setImage(user.displayAvatarURL({ size: 1024 }))
      .setTimestamp();

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  },
};
