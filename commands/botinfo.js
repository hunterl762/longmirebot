const { EmbedBuilder, version } = require('discord.js');

module.exports = {
  name: 'botinfo',
  description: 'Shows information about Longmire Bot.',
  usage: 'botinfo',
  async execute({ client, message }) {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Longmire Bot Information')
      .setThumbnail(client.user.displayAvatarURL())
      .addFields(
        { name: 'Bot', value: client.user.tag, inline: true },
        { name: 'Created', value: `<t:${Math.floor(client.user.createdTimestamp / 1000)}:F>`, inline: true },
        { name: 'Servers', value: client.guilds.cache.size.toLocaleString(), inline: true },
        { name: 'discord.js', value: `v${version}`, inline: true },
        { name: 'Node.js', value: process.version, inline: true },
      )
      .setTimestamp();

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  },
};
