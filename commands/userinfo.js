const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'userinfo',
  aliases: ['whois'],
  description: 'Shows information about you or a mentioned member.',
  usage: 'userinfo [@user]',
  async execute({ message }) {
    const member = message.mentions.members.first() || message.member;
    const roles = member.roles.cache
      .filter((role) => role.id !== message.guild.id)
      .sort((a, b) => b.position - a.position)
      .map((role) => role.toString())
      .slice(0, 15)
      .join(', ') || 'None';

    const embed = new EmbedBuilder()
      .setColor(member.displayColor || 0x5865f2)
      .setTitle(member.user.tag)
      .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'Nickname', value: member.nickname || 'None', inline: true },
        { name: 'Bot', value: member.user.bot ? 'Yes' : 'No', inline: true },
        { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`, inline: false },
        { name: 'Joined Server', value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` : 'Unknown', inline: false },
        { name: 'Roles', value: roles, inline: false },
      )
      .setTimestamp();

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  },
};
