# blsbot

A Discord bot that:
- welcomes new members in the server and via DM
- sends a basic security snapshot for the server using /security

## Setup
1. Install dependencies:
   npm install
2. Copy .env.example to .env and fill in your values:
   cp .env.example .env
3. Start the bot:
   npm start

## Required bot permissions
- View Channels
- Send Messages
- Read Message History
- Embed Links

## Notes
- In the Discord Developer Portal, enable the following under Bot -> Privileged Gateway Intents:
  - Server Members Intent
- For DMs, the user must allow direct messages from server members.
