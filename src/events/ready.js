const { Events } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`Review bot is online as ${client.user.tag}.`);
  }
};
