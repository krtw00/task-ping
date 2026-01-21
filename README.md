# TaskPing

AI development notification bot for parallel workflows.

Notify task completion, errors, and review requests from multiple AI coding sessions (Claude Code, Codex, etc.) to Discord.

## Features

- 🎨 Rich embed notifications with color coding
- ✅ Success (green), ❌ Error (red), ⚠️ Warning (yellow), ℹ️ Info (blue)
- 🏷️ Project tagging
- 📢 Optional @here mentions
- 🔧 CLI and programmatic API

## Installation

```bash
npm install task-ping
```

## Setup

1. Create a Discord bot at [Discord Developer Portal](https://discord.com/developers/applications)
2. Get your bot token and channel ID
3. Create `.env` file:

```env
DISCORD_TOKEN=your-bot-token
DISCORD_CHANNEL_ID=your-channel-id
PROJECT_NAME=MyProject  # optional
```

## CLI Usage

```bash
# Basic notification
task-ping "Build completed"

# Typed notifications
task-ping --success "All tests passed"
task-ping --error "Build failed"
task-ping --warning "Review requested"

# With options
task-ping -t success -p AgentMine "Feature implemented"
task-ping --error --mention "Critical failure!"
task-ping -T "Custom Title" "Message here"
```

## Programmatic Usage

```typescript
import { TaskPing, sendNotification } from 'task-ping';

// One-off notification
await sendNotification(
  {
    token: process.env.DISCORD_TOKEN,
    channelId: process.env.DISCORD_CHANNEL_ID,
  },
  {
    type: 'success',
    message: 'Build completed!',
    project: 'MyProject',
  }
);

// Persistent client (for multiple notifications)
const client = new TaskPing({
  token: process.env.DISCORD_TOKEN,
  channelId: process.env.DISCORD_CHANNEL_ID,
  project: 'MyProject',
});

await client.notify({ type: 'info', message: 'Starting build...' });
await client.notify({ type: 'success', message: 'Build completed!' });
await client.disconnect();
```

## Notification Types

| Type | Color | Default Title | Use Case |
|------|-------|---------------|----------|
| `success` | 🟢 Green | ✅ Task Completed | Task finished successfully |
| `error` | 🔴 Red | ❌ Error | Failures, exceptions |
| `warning` | 🟡 Yellow | ⚠️ Attention Required | Review requests, warnings |
| `info` | 🔵 Blue | ℹ️ Info | General information |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_TOKEN` | Yes | Discord bot token |
| `DISCORD_CHANNEL_ID` | Yes | Default channel for notifications |
| `PROJECT_NAME` | No | Default project name for tagging |

## License

MIT
