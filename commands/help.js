const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'help',
  description: 'Lists commands that are available in this server.',
  usage: 'help',
  async execute({ client, message, prefix, settingsStore }) {
    const commands = [...client.commands.values()]
      .filter((command, index, all) => all.findIndex((item) => item.name === command.name) === index)
      .filter((command) => !command.hidden || message.author.id === process.env.BOT_OWNER_ID)
      .filter((command) => settingsStore.getCommandRule(message.guild.id, command).enabled)
      .sort((a, b) => a.name.localeCompare(b.name));

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`${client.user.username} Commands`)
      .setDescription(`Current prefix: \`${prefix}\`\nCommand access can be configured from the web dashboard.`)
      .addFields(commands.map((command) => ({
        name: `${prefix}${command.usage || command.name}`,
        value: command.description || 'No description provided.',
        inline: false,
      })))
      .setTimestamp();

    try {
      await message.author.send({ embeds: [embed] });
      await message.reply({ content: 'I sent the command list to your DMs.', allowedMentions: { repliedUser: false } });
    } catch {
      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
  },
};
