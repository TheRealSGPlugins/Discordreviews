const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const crypto = require('node:crypto');
const { getGuildConfig, updateGuildConfig } = require('../config/store');
const { ratingComponents, reviewActions } = require('../utils/components');
const { hasAdministrator, hasAllowedRole } = require('../utils/permissions');
const { refreshPanelAtBottom } = require('../utils/panel');

const SESSION_TTL = 15 * 60 * 1000;

function sessionFor(interaction) {
  const session = interaction.client.reviewSessions.get(interaction.user.id);
  if (session && Date.now() - session.createdAt <= SESSION_TTL && session.guildId === interaction.guildId) {
    return session;
  }
  interaction.client.reviewSessions.delete(interaction.user.id);
  return null;
}

async function silentDeny(interaction) {
  // An acknowledgement prevents Discord's red "interaction failed" banner while revealing nothing.
  if (interaction.isButton()) await interaction.deferUpdate();
}

function reviewModal() {
  return new ModalBuilder()
    .setCustomId('review:modal')
    .setTitle('Leave a Review')
    .addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('review:text')
        .setLabel('Tell us about your experience')
        .setPlaceholder('Write your honest review here...')
        .setStyle(TextInputStyle.Paragraph)
        .setMinLength(2)
        .setMaxLength(1000)
        .setRequired(true)
    ));
}

function reportModal(messageId) {
  return new ModalBuilder()
    .setCustomId(`review:report-modal:${messageId}`)
    .setTitle('Report Review')
    .addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('report:reason')
        .setLabel('Reason for report')
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(500)
        .setRequired(true)
    ));
}

async function handleCommand(interaction) {
  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) return;
  if (!hasAdministrator(interaction)) {
    return interaction.reply({ content: 'Administrator permission is required.', ephemeral: true });
  }
  await command.execute(interaction);
}

async function openReview(interaction) {
  const config = getGuildConfig(interaction.guildId);
  if (!config || interaction.message.id !== config.panelMessageId) return silentDeny(interaction);
  if (!hasAllowedRole(interaction, config.allowedRoleIds)) return silentDeny(interaction);
  return interaction.showModal(reviewModal());
}

async function receiveReview(interaction) {
  const config = getGuildConfig(interaction.guildId);
  if (!config || !hasAllowedRole(interaction, config.allowedRoleIds)) {
    return interaction.reply({ content: 'You are not allowed to submit reviews.', ephemeral: true });
  }

  interaction.client.reviewSessions.set(interaction.user.id, {
    guildId: interaction.guildId,
    review: interaction.fields.getTextInputValue('review:text').trim(),
    rating: 0,
    createdAt: Date.now()
  });

  return interaction.reply({
    content: '**Choose your rating**\nSelect a star from 1–5, then submit.',
    components: ratingComponents(),
    ephemeral: true
  });
}

async function selectRating(interaction) {
  const session = sessionFor(interaction);
  if (!session) {
    return interaction.update({ content: 'This review session expired. Open the review panel and try again.', components: [] });
  }
  session.rating = Number(interaction.customId.split(':')[2]);
  return interaction.update({
    content: `**Your rating: ${'★'.repeat(session.rating)}${'☆'.repeat(5 - session.rating)} (${session.rating}/5)**\nPress Submit Rating when ready.`,
    components: ratingComponents(session.rating)
  });
}

async function submitReview(interaction) {
  const session = sessionFor(interaction);
  if (!session?.rating) {
    return interaction.reply({ content: 'Select a star rating first.', ephemeral: true });
  }

  const config = getGuildConfig(interaction.guildId);
  const logChannel = config && await interaction.guild.channels.fetch(config.logChannelId).catch(() => null);
  if (!logChannel?.isTextBased()) {
    return interaction.update({ content: 'The review channel is unavailable. Please contact an administrator.', components: [] });
  }

  const recommendationId = crypto.randomInt(1000000, 9999999).toString();
  const rating = `${'★'.repeat(session.rating)}${'☆'.repeat(5 - session.rating)}`;
  const date = new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC'
  }).format(new Date());

  const embed = new EmbedBuilder()
    .setColor(0x2FE4DA)
    .setAuthor({
      name: interaction.user.username,
      iconURL: interaction.user.displayAvatarURL({ size: 128 })
    })
    .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: 'Voucher_For', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Rating', value: `${rating} (${session.rating}/5)`, inline: true },
      { name: 'Description', value: `> ${session.review}` }
    )
    .setFooter({ text: `⭐ ${interaction.client.user.username} - Recommendation ID: ${recommendationId} - ${date}` })
    .setTimestamp();

  await logChannel.send({ embeds: [embed], components: [reviewActions()] });

  if (config.panelChannelId === config.logChannelId) {
    const refreshedConfig = await refreshPanelAtBottom(interaction.guild, config, logChannel);
    if (refreshedConfig.panelMessageId !== config.panelMessageId) {
      updateGuildConfig(interaction.guildId, { panelMessageId: refreshedConfig.panelMessageId });
    }
  }

  interaction.client.reviewSessions.delete(interaction.user.id);
  await interaction.update({ content: '✅ Thank you! Your review was submitted successfully.', components: [] });
  setTimeout(() => {
    interaction.deleteReply().catch(() => null);
  }, 5_000);
}

async function handleReport(interaction) {
  return interaction.showModal(reportModal(interaction.message.id));
}

async function receiveReport(interaction) {
  const config = getGuildConfig(interaction.guildId);
  const logChannel = config && await interaction.guild.channels.fetch(config.logChannelId).catch(() => null);
  if (!logChannel?.isTextBased()) {
    return interaction.reply({ content: 'The report channel is unavailable.', ephemeral: true });
  }

  const messageId = interaction.customId.split(':')[2];
  const report = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle('🚩 Review Reported')
    .addFields(
      { name: 'Reported by', value: `${interaction.user} (${interaction.user.id})` },
      { name: 'Review message', value: `[Open review](https://discord.com/channels/${interaction.guildId}/${interaction.channelId}/${messageId})` },
      { name: 'Reason', value: interaction.fields.getTextInputValue('report:reason') }
    )
    .setTimestamp();

  await logChannel.send({ embeds: [report] });
  return interaction.reply({ content: 'Your report was sent to the server administrators.', ephemeral: true });
}

async function recommend(interaction) {
  const config = getGuildConfig(interaction.guildId);
  if (!config?.panelChannelId) {
    return interaction.reply({ content: 'The review panel is not configured.', ephemeral: true });
  }
  return interaction.reply({
    content: `Use the review panel in <#${config.panelChannelId}> to recommend someone or share your experience.`,
    ephemeral: true
  });
}

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    try {
      if (interaction.isChatInputCommand()) return await handleCommand(interaction);
      if (interaction.isButton()) {
        if (interaction.customId === 'review:open') return await openReview(interaction);
        if (interaction.customId.startsWith('review:star:')) return await selectRating(interaction);
        if (interaction.customId === 'review:submit') return await submitReview(interaction);
        if (interaction.customId === 'review:cancel') {
          interaction.client.reviewSessions.delete(interaction.user.id);
          return await interaction.update({ content: 'Review cancelled.', components: [] });
        }
        if (interaction.customId === 'review:report') return await handleReport(interaction);
        if (interaction.customId === 'review:recommend') return await recommend(interaction);
      }
      if (interaction.isModalSubmit()) {
        if (interaction.customId === 'review:modal') return await receiveReview(interaction);
        if (interaction.customId.startsWith('review:report-modal:')) return await receiveReport(interaction);
      }
    } catch (error) {
      console.error(`Interaction ${interaction.id} failed:`, error);
      const response = { content: 'Something went wrong. Please try again or contact an administrator.', ephemeral: true };
      if (interaction.deferred || interaction.replied) await interaction.followUp(response).catch(() => null);
      else await interaction.reply(response).catch(() => null);
    }
  }
};
