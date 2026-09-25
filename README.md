# Longmire Bot v2

Longmire Bot has been modernized from the original `discord.js` v11 codebase to `discord.js` v14 and now includes a web dashboard for per-server command configuration.

## What changed

- Updated to `discord.js` `^14.27.0` and Discord API v10 conventions.
- Replaced legacy `RichEmbed`, old cache accessors, `message` event usage, and v11 presence APIs.
- Recovered the original commands from `commands.zip` and turned them into a normal `commands/` folder.
- Repaired commands that were broken or depended on undeclared packages.
- Removed hard-coded webhook credentials from the source code.
- Added Discord OAuth2 login for the dashboard.
- Added per-server command settings:
  - custom prefix
  - command enabled/disabled state
  - Manage Server-only mode
  - allowed roles
  - allowed channels
- Added persistent JSON settings in `data/guild-settings.json` (ignored by Git).

## Requirements

- Node.js 18 or newer
- A Discord application/bot
- The **Message Content Intent** enabled in the Discord Developer Portal
- The **Server Members Intent** enabled in the Discord Developer Portal

## Installation

```bash
git clone https://github.com/hunterl762/longmirebot.git
cd longmirebot
npm install
cp .env.example .env
```

Edit `.env` and provide at minimum:

```env
BOT_TOKEN=your-bot-token
DISCORD_CLIENT_ID=your-application-id
DISCORD_CLIENT_SECRET=your-oauth-client-secret
DASHBOARD_CALLBACK_URL=http://localhost:3000/auth/discord/callback
DASHBOARD_URL=http://localhost:3000
PORT=3000
SESSION_SECRET=use-a-long-random-value
DEFAULT_PREFIX=?
BOT_OWNER_ID=your-discord-user-id
```

Then start the bot and dashboard together:

```bash
npm start
```

Open `http://localhost:3000` and sign in with Discord.

## Discord OAuth setup

In the Discord Developer Portal for the same application as the bot:

1. Open **OAuth2**.
2. Add your exact callback URL to **Redirects**. For local development use:
   `http://localhost:3000/auth/discord/callback`
3. Put that exact same URL in `DASHBOARD_CALLBACK_URL`.
4. The dashboard requests the `identify` and `guilds` scopes.

Only users who have **Manage Server** or **Administrator** in a server can configure it, and the server must already contain Longmire Bot.

## Bot permissions

The bot normally needs:

- View Channels
- Send Messages
- Embed Links
- Read Message History

The `purge` command additionally needs **Manage Messages** in the channel where it is used.

## Command configuration

The dashboard lets a server manager control each command separately. A command can be disabled, restricted to server managers, limited to selected roles, or limited to selected channels.

Server managers bypass role/channel restrictions so they can troubleshoot configuration. A disabled command remains disabled until it is re-enabled from the dashboard.

Owner-only commands require `BOT_OWNER_ID`. The hidden `announce` command broadcasts an announcement to every server the bot is in and is rejected for every user except the configured bot owner. The legacy `webhook` command is disabled by default and only works when `OWNER_WEBHOOK_URL` is set.

## Commands

- `announce <message>` (bot owner only; hidden from normal help/dashboard)
- `avatar [@user]`
- `botinfo`
- `help`
- `ping`
- `purge <1-100>`
- `serverinfo`
- `stats`
- `set-stream <status text>`
- `uptime`
- `userinfo [@user]`
- `webhook` (owner-only, disabled by default)

## Security note

The original repository contained Discord webhook credentials directly in source files. Removing them from the current branch does **not** invalidate credentials that were previously exposed in Git history. Delete/rotate those webhooks in Discord before using this version.

Never commit `.env`, bot tokens, OAuth client secrets, session secrets, or webhook URLs.

## Development checks

```bash
npm run check
```

This performs a JavaScript syntax check across the project.
