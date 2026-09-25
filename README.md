# Longmire Bot

Modernized Longmire Bot using Discord.js v14 with a web dashboard for per-server command configuration.

## Upgrade summary

- Discord.js upgraded from v11 to `14.27.0`.
- Old v11 embed, cache, message-event, presence and webhook APIs were replaced.
- Hard-coded webhook credentials were removed. **Rotate/delete the old webhooks in Discord because Git history can still contain those exposed secrets.**
- Configuration now uses environment variables instead of `botconfig.json`.
- Server admins can sign into a web dashboard and change the server prefix or enable/disable individual commands.
- Per-server settings are stored in `data/settings.json`.

## Requirements

- Node.js 20+
- A Discord bot application
- **Message Content Intent** and **Server Members Intent** enabled in the Discord Developer Portal

## Setup

```bash
npm install
cp .env.example .env
npm start
```

Fill in `.env` before starting the bot. The dashboard defaults to `http://localhost:3000`.

For Discord OAuth2, add this local redirect URL in the Developer Portal:

```text
http://localhost:3000/auth/discord/callback
```

Then set `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`, and `SESSION_SECRET` in `.env`.

The dashboard requests only `identify` and `guilds`. A user can configure a server only if they have **Manage Server** or **Administrator** and the bot is present in that server.

## Commands

`avatar [@user]`, `botinfo`, `help`, `ping`, `purge <1-100>`, `serverinfo`, `stats`, `set-stream <status>`, `uptime`, `userinfo [@user]`.

`purge` requires Manage Messages. `set-stream` is restricted to `OWNER_ID`.

## Production dashboard note

Serve the dashboard over HTTPS and replace the default `express-session` MemoryStore with a persistent session store (for example Redis) before running multiple processes or instances.
