require('dotenv').config();

const { Client, Collection, GatewayIntentBits } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

if (!process.env.TOKEN) {
  throw new Error('TOKEN is missing. Copy .env.example to .env and add the bot token.');
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.commands = new Collection();
client.reviewSessions = new Map();

const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

const eventsPath = path.join(__dirname, 'events');
for (const file of fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'))) {
  const event = require(path.join(eventsPath, file));
  const handler = (...args) => event.execute(...args);
  event.once ? client.once(event.name, handler) : client.on(event.name, handler);
}

process.on('unhandledRejection', error => console.error('Unhandled rejection:', error));
process.on('uncaughtException', error => console.error('Uncaught exception:', error));

client.login(process.env.TOKEN);
