const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { updateGuildConfig } = require('../config/store');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-allowed-roles')
    .setDescription('Set which roles may submit reviews.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addStringOption(option => option
      .setName('roles')
      .setDescription('Mention one or more roles, separated by spaces.')
      .setRequired(true)),

  async execute(interaction) {
    const input = interaction.options.getString('roles', true);
    const ids = [...new Set([...input.matchAll(/<@&(\d{17,20})>|\b(\d{17,20})\b/g)]
      .map(match => match[1] ?? match[2]))];

    const roles = ids
      .map(id => interaction.guild.roles.cache.get(id))
      .filter(role => role && role.id !== interaction.guild.id && !role.managed);

    if (roles.length === 0) {
      return interaction.reply({
        content: 'No valid roles were found. Mention one or more roles, for example: `@Customer @Member`.',
        ephemeral: true
      });
    }

    updateGuildConfig(interaction.guildId, { allowedRoleIds: roles.map(role => role.id) });
    return interaction.reply({
      content: `Members may now submit reviews if they have at least one of: ${roles.join(', ')}`,
      ephemeral: true
    });
  }
};
