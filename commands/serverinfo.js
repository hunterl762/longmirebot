const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'serverinfo',
  description: 'Shows information about the current Discord server.',
  usage: 'serverinfo',
  async execute({ message }) {
    const guild = message.guild;
    const owner = await guild.fetchOwner().catch(() => null);
    const members = await guild.members.fetch().catch(() => guild.members.cache);
    const humans = members.filter((member) => !member.user.bot).size;
    const bots = members.filter((member) => member.user.bot).size;

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(guild.name)
      .setThumbnail(guild.iconURL({ size: 256 }))
      .addFields(
        { name: 'Owner', value: owner ? owner.user.tag : 'Unknown', inline: true },
        { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true },
        { name: 'Members', value: guild.memberCount.toLocaleString(), inline: true },
        { name: 'Humans', value: humans.toLocaleString(), inline: true },
        { name: 'Bots', value: bots.toLocaleString(), inline: true },
        { name: 'Channels', value: guild.channels.cache.size.toLocaleString(), inline: true },
      )
      .setTimestamp();

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  },
};
