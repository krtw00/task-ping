# TaskPing

AI development notification bot for parallel workflows.

Notify task completion, errors, and review requests from multiple AI coding sessions (Claude Code, Codex, etc.) to Discord.

## Features

- 🎨 Rich embed notifications with color coding
- ✅ Success (green), ❌ Error (red), ⚠️ Warning (yellow), ℹ️ Info (blue)
- 🏷️ Project name as bot username
- 📢 Optional @here mentions
- 🤖 AI-powered task summary (Ollama / Anthropic)
- 🔗 Claude Code Hooks integration
- 🚀 Auto-start Ollama when needed

## Installation

```bash
git clone https://github.com/krtw00/task-ping.git
cd task-ping
npm install
npm run build
npm link  # Install globally
```

## Setup

### 1. Create Discord Webhook

1. Open Discord channel settings → Integrations → Webhooks
2. Create new webhook → Copy URL

### 2. Configure Environment

Create wrapper script at `~/.claude/hooks/task-ping-notify.sh`:

```bash
#!/bin/bash
export DISCORD_WEBHOOK_URL="your-webhook-url"
export SUMMARY_BACKEND="ollama"  # or "anthropic"
export OLLAMA_MODEL="llama3.2"

task-ping-hook
```

```bash
chmod +x ~/.claude/hooks/task-ping-notify.sh
```

### 3. Configure Claude Code Hooks

Add to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/task-ping-notify.sh 2>/dev/null || true"
          }
        ]
      }
    ]
  }
}
```

### 4. Install Ollama (for local summarization)

```bash
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull llama3.2
sudo systemctl enable ollama  # Auto-start on boot
```

## How It Works

```
Claude Code completes response
    ↓ Stop event
~/.claude/hooks/task-ping-notify.sh
    ↓
task-ping-hook
    ↓ (Auto-starts Ollama if needed)
Summarize with LLM → Discord notification
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
import { sendNotification } from 'task-ping';

await sendNotification(
  { webhookUrl: process.env.DISCORD_WEBHOOK_URL },
  {
    type: 'success',
    message: 'Build completed!',
    project: 'MyProject',
  }
);
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
| `DISCORD_WEBHOOK_URL` | Yes | Discord webhook URL |
| `PROJECT_NAME` | No | Default project name (auto-detected from directory) |
| `SUMMARY_BACKEND` | No | `ollama` (default) or `anthropic` |
| `OLLAMA_URL` | No | Ollama API URL (default: `http://localhost:11434`) |
| `OLLAMA_MODEL` | No | Ollama model (default: `llama3.2`) |
| `ANTHROPIC_API_KEY` | No | Required if using Anthropic backend |

## License

MIT
