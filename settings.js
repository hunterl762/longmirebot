const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const settingsFile = path.join(dataDir, 'settings.json');

function readAll() {
  try { return JSON.parse(fs.readFileSync(settingsFile, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') console.error('Failed to read settings:', error);
    return {};
  }
}

function writeAll(settings) {
  fs.mkdirSync(dataDir, { recursive: true });
  const temp = `${settingsFile}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(settings, null, 2));
  fs.renameSync(temp, settingsFile);
}

function getGuildSettings(guildId) {
  const all = readAll();
  return {
    prefix: process.env.DEFAULT_PREFIX || '!',
    disabledCommands: [],
    ...(all[guildId] || {})
  };
}

function setGuildSettings(guildId, input) {
  const prefix = String(input.prefix || '').trim();
  if (!prefix || prefix.length > 5 || /\s/.test(prefix)) throw new Error('Prefix must be 1-5 non-whitespace characters.');
  const disabledCommands = Array.isArray(input.disabledCommands)
    ? [...new Set(input.disabledCommands.map(String))]
    : [];
  const all = readAll();
  all[guildId] = { prefix, disabledCommands };
  writeAll(all);
  return all[guildId];
}

module.exports = { getGuildSettings, setGuildSettings };
