const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');

function buildPanel(guildName, emoji) {
  const embed = new EmbedBuilder()
    .setColor(0x32E0D5)
    .setTitle('⭐ Share Your Experience')
    .setDescription([
      `Thank you for being part of **${guildName}**!`,
      '',
      'Your experiences, opinions, and recommendations help our community grow. Press the button below to leave a review—it only takes a moment.'
    ].join('\n'))
    .setFooter({ text: 'Every review matters. Thank you for supporting our community.' });

  const button = new ButtonBuilder()
    .setCustomId('review:open')
    .setLabel('Leave a Review')
    .setStyle(ButtonStyle.Primary)
    .setEmoji(emoji);

  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(button)]
  };
}

async function refreshPanelAtBottom(guild, config, channel) {
  if (!config || config.panelChannelId !== config.logChannelId || channel.id !== config.panelChannelId) {
    return config;
  }

  const oldPanel = await channel.messages.fetch(config.panelMessageId).catch(() => null);
  const newPanel = await channel.send(buildPanel(guild.name, config.emoji));
  await newPanel.pin();

  if (oldPanel) {
    await oldPanel.unpin().catch(() => null);
    await oldPanel.delete().catch(error => {
      console.error(`Could not remove old review panel ${oldPanel.id}:`, error);
    });
  }

  return { ...config, panelMessageId: newPanel.id };
}

module.exports = { buildPanel, refreshPanelAtBottom };
