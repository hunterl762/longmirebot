module.exports = {
  name: 'ping',
  description: 'Checks the bot response time and Discord gateway latency.',
  usage: 'ping',
  async execute({ client, message }) {
    const sent = await message.reply({ content: 'Pinging…', allowedMentions: { repliedUser: false } });
    const roundTrip = sent.createdTimestamp - message.createdTimestamp;
    await sent.edit(`🏓 Pong! Message round-trip: **${roundTrip}ms** · Gateway: **${Math.round(client.ws.ping)}ms**`);
  },
};
