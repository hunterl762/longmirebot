const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'purge',
  aliases: ['clear'],
  description: 'Bulk deletes recent messages from the current channel.',
  usage: 'purge <1-100>',
  defaultAdminOnly: true,
  async execute({ message, args }) {
    if (!message.channel.isTextBased() || typeof message.channel.bulkDelete !== 'function') {
      return message.reply('This command can only be used in a server text channel.');
    }

    if (!message.guild.members.me.permissionsIn(message.channel).has(PermissionFlagsBits.ManageMessages)) {
      return message.reply('I need the **Manage Messages** permission in this channel.');
    }

    const amount = Number.parseInt(args[0], 10);
    if (!Number.isInteger(amount) || amount < 1 || amount > 100) {
      return message.reply('Please provide a number from 1 to 100.');
    }

    const deleted = await message.channel.bulkDelete(amount, true);
    const confirmation = await message.channel.send(`🧹 Deleted **${deleted.size}** message(s). Messages older than 14 days are skipped by Discord.`);
    setTimeout(() => confirmation.delete().catch(() => {}), 5000);
    return undefined;
  },
};
