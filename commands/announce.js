const { ChannelType, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

function canSendTo(channel, me) {
  if (!channel || !me) return false;
  if (![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type)) return false;

  const permissions = channel.permissionsFor(me);
  return Boolean(
    permissions
      && permissions.has(PermissionFlagsBits.ViewChannel)
      && permissions.has(PermissionFlagsBits.SendMessages),
  );
}

function findAnnouncementChannel(guild) {
  const me = guild.members.me;
  if (canSendTo(guild.systemChannel, me)) return guild.systemChannel;

  return guild.channels.cache
    .filter((channel) => canSendTo(channel, me))
    .sort((a, b) => a.rawPosition - b.rawPosition)
    .first() || null;
}

module.exports = {
  name: 'announce',
  aliases: ['broadcast'],
  description: 'Broadcasts an owner announcement to every server using the bot.',
  usage: 'announce <message>',
  ownerOnly: true,
  hidden: true,

  async execute({ client, message, args }) {
    const announcement = args.join(' ').trim();
    if (!announcement) {
      return message.reply({
        content: 'Usage: `announce <message>`',
        allowedMentions: { repliedUser: false },
      });
    }

    const guilds = [...client.guilds.cache.values()];
    let sent = 0;
    const failures = [];

    const status = await message.reply({
      content: `📣 Broadcasting your announcement to **${guilds.length}** server(s)…`,
      allowedMentions: { repliedUser: false },
    });

    for (const guild of guilds) {
      try {
        const channel = findAnnouncementChannel(guild);
        if (!channel) {
          failures.push(`${guild.name} — no writable text channel`);
          continue;
        }

        const permissions = channel.permissionsFor(guild.members.me);
        const canEmbed = permissions?.has(PermissionFlagsBits.EmbedLinks);

        if (canEmbed) {
          const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setAuthor({
              name: `${client.user.username} Owner Announcement`,
              iconURL: client.user.displayAvatarURL(),
            })
            .setTitle('📣 Owner Announcement')
            .setDescription(announcement)
            .setFooter({ text: `Sent by the ${client.user.username} bot owner` })
            .setTimestamp();

          await channel.send({
            embeds: [embed],
            allowedMentions: { parse: [] },
          });
        } else {
          await channel.send({
            content: `📣 **${client.user.username} Owner Announcement**\n\n${announcement}`,
            allowedMentions: { parse: [] },
          });
        }

        sent += 1;
      } catch (error) {
        failures.push(`${guild.name} — ${error.message}`);
      }
    }

    const failed = guilds.length - sent;
    const failureSummary = failures.length
      ? `\n\n**Failed servers (first 10):**\n${failures.slice(0, 10).map((item) => `• ${item}`).join('\n')}`
      : '';

    await status.edit(
      `✅ Broadcast complete. Sent to **${sent}/${guilds.length}** server(s). Failed: **${failed}**.${failureSummary}`,
    );

    return undefined;
  },
};
