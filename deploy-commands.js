require('dotenv').config();

const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

if (!process.env.TOKEN || !process.env.CLIENT_ID) {
  throw new Error('TOKEN and CLIENT_ID must be set in .env.');
}

const commands = [];
const commandsPath = path.join(__dirname, 'src', 'commands');

for (const file of fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  const route = process.env.GUILD_ID
    ? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
    : Routes.applicationCommands(process.env.CLIENT_ID);

  console.log(`Deploying ${commands.length} command(s) ${process.env.GUILD_ID ? 'to the configured server' : 'globally'}...`);
  await rest.put(route, { body: commands });
  console.log('Slash commands deployed successfully.');
})().catch(error => {
  console.error('Failed to deploy slash commands:', error);
  process.exitCode = 1;
});
