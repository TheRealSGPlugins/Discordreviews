const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder
} = require('discord.js');
const { updateGuildConfig } = require('../config/store');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-panel')
    .setDescription('Create and pin the server review panel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addChannelOption(option => option
      .setName('channel')
      .setDescription('Channel where the review panel will be posted.')
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setRequired(true))
    .addStringOption(option => option
      .setName('emoji')
      .setDescription('Emoji shown on the review button.')
      .setRequired(true))
    .addChannelOption(option => option
      .setName('log_channel')
      .setDescription('Channel where completed reviews and reports are posted.')
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setRequired(true)),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel', true);
    const logChannel = interaction.options.getChannel('log_channel', true);
    const emoji = interaction.options.getString('emoji', true).trim();

    const me = interaction.guild.members.me;
    const required = [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.EmbedLinks,
      PermissionFlagsBits.ManageMessages
    ];

    if (!channel.permissionsFor(me)?.has(required)) {
      return interaction.reply({
        content: `I need View Channel, Send Messages, Embed Links, and Manage Messages in ${channel}.`,
        ephemeral: true
      });
    }

    if (!logChannel.permissionsFor(me)?.has([
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.EmbedLinks
    ])) {
      return interaction.reply({
        content: `I need View Channel, Send Messages, and Embed Links in ${logChannel}.`,
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x32E0D5)
      .setTitle('⭐ Share Your Experience')
      .setDescription([
        `Thank you for being part of **${interaction.guild.name}**!`,
        '',
        'Your experiences, opinions, and recommendations help our community grow. Press the button below to leave a review—it only takes a moment.'
      ].join('\n'))
      .setFooter({ text: 'Every review matters. Thank you for supporting our community.' });

    const button = new ButtonBuilder()
      .setCustomId('review:open')
      .setLabel('Leave a Review')
      .setStyle(ButtonStyle.Primary);

    try {
      button.setEmoji(emoji);
    } catch {
      return interaction.reply({ content: 'That emoji is not valid. Try a standard emoji such as ⭐.', ephemeral: true });
    }

    const message = await channel.send({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(button)]
    });
    await message.pin();

    updateGuildConfig(interaction.guildId, {
      panelChannelId: channel.id,
      panelMessageId: message.id,
      logChannelId: logChannel.id,
      emoji
    });

    return interaction.reply({
      content: `Review panel created and pinned in ${channel}. Completed reviews will be sent to ${logChannel}.`,
      ephemeral: true
    });
  }
};
