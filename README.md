# Luna

A Facebook Messenger group bot that behaves like a real user.

Luna logs in with a real Facebook account (via cookies) and sits inside group chats, replying to commands like a person would. No webhooks, no Facebook apps, no pages — just an account and Node.js.

I'm building this to learn Node.js and to have fun. It's a long-term project, so expect new features to appear slowly over time.

## What it can do right now

- Login as a real Facebook account using `appstate.json`
- Reply to commands in group chats (`/help`, `/ping`, ...)
- Auto-load commands — drop a file in `src/commands/` and it just works
- Friendly fallback when someone types a command that doesn't exist

The whole thing is built to stay flexible: commands are single files, settings live in `.env`, and the core code almost never needs to change.

## ⚠️ Before anything else — read this

- **Do not run this on your main Facebook account.** Use a spare account. Facebook can and does restrict accounts that use unofficial APIs. If one gets banned, it should be an account you don't care about.
- `appstate.json` is basically your password. Don't commit it, don't paste it in Issues, don't send it to anyone. This repo doesn't include it on purpose.
- Same goes for `.env` and `e2ee_device.json`.
- If your cookies ever leak, change the account's password right away — that kills the old session.

## Setup

1. Install dependencies:

```bash
npm install
```

2. (Optional) Copy `.env.example` to `.env` if you want to change the defaults:

```bash
cp .env.example .env
```

If you skip it, the defaults are:
- Prefix: `/`
- Bot name: `Luna`
- Appstate file: `appstate.json`

3. Get your cookies. Log into Facebook with the bot account, export the cookies as a JSON array (extensions like [EditThisCookie](https://chrome.google.com/webstore/detail/editthiscookie/fngmhnnpilhplaeedifhccceomclgfbg) or [c3c-fbstate](https://github.com/c3cbot/c3c-fbstate) do this), and save them as `appstate.json` in the project root. `appstate.example.json` shows the expected shape.

4. Start it:

```bash
npm start
```

If the terminal says "Logged in successfully", Luna is alive. Go say hi to your group.

## Adding a command

This is the fun part. You don't touch any core file. Create a file in `src/commands/`, for example `ping.js`:

```js
module.exports = {
  name: 'ping',
  description: 'Replies with Pong!',
  aliases: ['p'],
  async execute(senderId, threadId, args, sendMessageCallback, commandsMap, config) {
    await sendMessageCallback(threadId, 'Pong!');
  }
};
```

Restart the bot. Type `/ping` in a group. That's it — your command is live and shows up in `/help` automatically.

## When someone types a wrong command

Luna replies:

> I dont recognise it, try /help to know every command

## Coming someday (slowly)

- Welcome messages when someone joins a group
- Admins and per-group settings
- Tracking and fun stats
- Whatever I learn next

## License

MIT — do whatever you want with it, just don't blame me if Facebook gets angry at your account.