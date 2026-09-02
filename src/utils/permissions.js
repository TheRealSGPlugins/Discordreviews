const { PermissionFlagsBits } = require('discord.js');

function hasAdministrator(interaction) {
  return interaction.inGuild() && interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
}

function hasAllowedRole(interaction, allowedRoleIds) {
  if (!interaction.inGuild() || !Array.isArray(allowedRoleIds) || allowedRoleIds.length === 0) {
    return false;
  }

  const roles = interaction.member?.roles;
  const roleIds = roles?.cache ? [...roles.cache.keys()] : roles;
  return Array.isArray(roleIds) && allowedRoleIds.some(roleId => roleIds.includes(roleId));
}

module.exports = { hasAdministrator, hasAllowedRole };
