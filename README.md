# SG Review Bot

A production-ready Discord review/vouch bot built with discord.js v14. It provides an administrator-created pinned panel, role-gated review submissions, an interactive five-star picker, polished review cards, reports, and persistent per-server configuration.

## Requirements

- Node.js 24.17.0 or newer (required by discord.js 14.27.0)
- A Discord application and bot
- A server where you have Administrator permission

## 1. Create the Discord application

1. Open the [Discord Developer Portal](https://discord.com/developers/applications) and create an application.
2. Open **Bot**, create the bot, and copy/reset its token.
3. Do not place the token in GitHub or send it to anyone.
4. Under **OAuth2 > URL Generator**, select `bot` and `applications.commands`.
5. Give the bot these permissions: View Channels, Send Messages, Embed Links, Read Message History, Manage Messages, and Use Application Commands.
6. Open the generated URL and add the bot to your server.

No privileged gateway intents are required.

## 2. Install and configure

```bash
npm install
```

Copy `.env.example` to `.env` and fill in:

```env
TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_application_id
GUILD_ID=your_discord_server_id
```

`GUILD_ID` is recommended during setup because server commands update immediately. Without it, commands are registered globally and Discord may take time to show them.

## 3. Deploy commands and start

```bash
npm run deploy
npm start
```

Run `/setup-panel`, selecting the panel channel, button emoji, and review log channel. Then run `/set-allowed-roles` and enter one or more role mentions in the single field, such as:

```text
@Customer @Member @Buyer
```

Only administrators can see/use the setup commands. Members need at least one configured role to open the review modal.

## Persistence

Server configuration is stored in `data/config.json` with atomic writes. The file is intentionally ignored by Git because it contains live server IDs.

If you deploy on a platform with an ephemeral filesystem, attach a persistent disk at the project's `data` directory. Render's absolute mount path should end in `/data`. Alternatively, replace the JSON store with a hosted database for multi-instance deployments.

## Render deployment

This repository includes `render.yaml` for a Render background worker.

1. Push the project to GitHub.
2. In Render, create a **Blueprint** from the repository.
3. Enter `TOKEN`, `CLIENT_ID`, and `GUILD_ID` as environment variables.
4. Deploy the worker.
5. For persistent JSON configuration, add a persistent disk mounted at the absolute `data` directory used by the service. If your plan does not support a disk, rerun the two setup commands after a fresh deployment or switch the store to a hosted database.

The bot token must exist only in `.env` locally or Render's secret environment variables—not in GitHub.

## Commands

- `/setup-panel channel emoji log_channel` — creates and pins the review panel.
- `/set-allowed-roles roles` — replaces the allowed-role list with all valid mentioned roles.

## Review flow

1. An allowed member clicks **Leave a Review**.
2. They write up to 1,000 characters in a modal.
3. They choose 1–5 stars. The same ephemeral message updates smoothly.
4. They press **Submit Rating**.
5. The bot posts the final cyan-accented review card with their Discord avatar, review, rating, recommendation ID, and timestamp.

When the panel channel and log channel are the same, the bot automatically recreates and repins the panel after every review. This keeps all completed reviews together while the submission panel remains the newest message at the bottom.

Review sessions remain in memory for 15 minutes and are removed after submission or cancellation.
