const fs = require('node:fs');
const path = require('node:path');

class SettingsStore {
  constructor({ filePath, defaultPrefix = '?' } = {}) {
    this.filePath = filePath || path.join(__dirname, '..', 'data', 'guild-settings.json');
    this.defaultPrefix = defaultPrefix;
    this.data = { guilds: {} };
    this.load();
  }

  load() {
    try {
      if (!fs.existsSync(this.filePath)) {
        this.ensureDirectory();
        return;
      }

      const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      if (parsed && typeof parsed === 'object' && parsed.guilds && typeof parsed.guilds === 'object') {
        this.data = parsed;
      }
    } catch (error) {
      console.error('Could not load guild settings:', error);
    }
  }

  ensureDirectory() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
  }

  getGuild(guildId) {
    const existing = this.data.guilds[guildId] || {};
    return {
      prefix: typeof existing.prefix === 'string' && existing.prefix.trim() ? existing.prefix : this.defaultPrefix,
      commands: existing.commands && typeof existing.commands === 'object' ? existing.commands : {},
    };
  }

  getCommandRule(guildId, command) {
    const guild = this.getGuild(guildId);
    const saved = guild.commands[command.name] || {};
    return {
      enabled: typeof saved.enabled === 'boolean' ? saved.enabled : command.defaultEnabled !== false,
      adminOnly: typeof saved.adminOnly === 'boolean' ? saved.adminOnly : Boolean(command.defaultAdminOnly),
      allowedRoleIds: Array.isArray(saved.allowedRoleIds) ? saved.allowedRoleIds : [],
      allowedChannelIds: Array.isArray(saved.allowedChannelIds) ? saved.allowedChannelIds : [],
    };
  }

  updateGuild(guildId, next) {
    const current = this.getGuild(guildId);
    const prefix = typeof next.prefix === 'string' ? next.prefix.trim().slice(0, 5) : current.prefix;

    this.data.guilds[guildId] = {
      prefix: prefix || this.defaultPrefix,
      commands: next.commands && typeof next.commands === 'object' ? next.commands : current.commands,
    };

    this.save();
    return this.getGuild(guildId);
  }

  save() {
    this.ensureDirectory();
    const temp = `${this.filePath}.tmp`;
    fs.writeFileSync(temp, `${JSON.stringify(this.data, null, 2)}\n`, 'utf8');
    fs.renameSync(temp, this.filePath);
  }
}

module.exports = { SettingsStore };
