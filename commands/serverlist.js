const { EmbedBuilder } = require('discord.js');

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

module.exports = {
  name: 'serverlist',
  aliases: ['servers', 'guilds'],
  description: 'Shows every Discord server currently using the bot.',
  usage: 'serverlist',
  ownerOnly: true,

  async execute({ client, message }) {
    const guilds = [...client.guilds.cache.values()]
      .sort((a, b) => a.name.localeCompare(b.name));

    if (guilds.length === 0) {
      return message.reply({
        content: 'I am not currently connected to any Discord servers.',
        allowedMentions: { repliedUser: false },
      });
    }

    const rows = [];
    for (const guild of guilds) {
      const owner = await guild.fetchOwner().catch(() => null);
      rows.push({
        name: guild.name,
        value: [
          `**Server ID:** \`${guild.id}\``,
          `**Members:** ${guild.memberCount.toLocaleString()}`,
          `**Owner:** ${owner ? `${owner.user.tag} (\`${owner.id}\`)` : 'Unknown'}`,
        ].join('\n'),
      });
    }

    const pages = chunk(rows, 10).map((fields, index, all) => (
      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`Longmire Bot Server List — ${guilds.length} server(s)`)
        .setDescription('Bot-owner-only server inventory.')
        .addFields(fields)
        .setFooter({ text: `Page ${index + 1} of ${all.length}` })
        .setTimestamp()
    ));

    try {
      for (const group of chunk(pages, 10)) {
        await message.author.send({ embeds: group });
      }

      return message.reply({
        content: `📋 I sent the full server list for **${guilds.length}** server(s) to your DMs.`,
        allowedMentions: { repliedUser: false },
      });
    } catch {
      return message.reply({
        content: 'I could not DM you the server list. Please enable DMs from server members and try again.',
        allowedMentions: { repliedUser: false },
      });
    }
  },
};
