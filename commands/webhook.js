const { EmbedBuilder, WebhookClient } = require('discord.js');

module.exports = {
  name: 'webhook',
  description: 'Sends a support/owner notice to the configured owner webhook.',
  usage: 'webhook',
  ownerOnly: true,
  defaultEnabled: false,
  async execute({ client, message }) {
    const url = process.env.OWNER_WEBHOOK_URL;
    if (!url) return message.reply('OWNER_WEBHOOK_URL is not configured.');

    const webhook = new WebhookClient({ url });
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Longmire Bot Owner Notice')
      .setDescription(`Requested by ${message.author.tag} (${message.author.id}) in ${message.guild.name}.`)
      .setFooter({ text: client.user.username })
      .setTimestamp();

    try {
      await webhook.send({ embeds: [embed] });
      return message.reply('Webhook notification sent.');
    } finally {
      webhook.destroy();
    }
  },
};
