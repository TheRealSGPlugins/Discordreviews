const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function ratingComponents(selectedRating = 0) {
  const stars = new ActionRowBuilder();
  for (let rating = 1; rating <= 5; rating += 1) {
    stars.addComponents(
      new ButtonBuilder()
        .setCustomId(`review:star:${rating}`)
        .setLabel(rating <= selectedRating ? '★' : '☆')
        .setStyle(rating <= selectedRating ? ButtonStyle.Primary : ButtonStyle.Secondary)
    );
  }

  const submit = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('review:submit')
      .setLabel('Submit Rating')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success)
      .setDisabled(selectedRating === 0),
    new ButtonBuilder()
      .setCustomId('review:cancel')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger)
  );

  return [stars, submit];
}

function reviewActions() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('review:report')
      .setLabel('Report')
      .setEmoji('🚩')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('review:recommend')
      .setLabel('Recommend Someone')
      .setEmoji('📝')
      .setStyle(ButtonStyle.Primary)
  );
}

module.exports = { ratingComponents, reviewActions };
