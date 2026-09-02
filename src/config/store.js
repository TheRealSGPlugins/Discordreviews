const fs = require('node:fs');
const path = require('node:path');

const dataDirectory = path.join(__dirname, '..', '..', 'data');
const dataFile = path.join(dataDirectory, 'config.json');

function ensureStore() {
  fs.mkdirSync(dataDirectory, { recursive: true });
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, '{}\n', 'utf8');
  }
}

function readAll() {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  } catch (error) {
    console.error('The config database could not be read:', error);
    return {};
  }
}

function writeAll(config) {
  ensureStore();
  const temporaryFile = `${dataFile}.tmp`;
  fs.writeFileSync(temporaryFile, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  fs.renameSync(temporaryFile, dataFile);
}

function getGuildConfig(guildId) {
  return readAll()[guildId] ?? null;
}

function updateGuildConfig(guildId, updates) {
  const config = readAll();
  config[guildId] = {
    allowedRoleIds: [],
    ...config[guildId],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  writeAll(config);
  return config[guildId];
}

module.exports = { getGuildConfig, updateGuildConfig };
