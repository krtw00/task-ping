#!/usr/bin/env node

import { config } from 'dotenv';
import { sendNotification } from './notifier.js';
import type { NotificationType } from './types.js';

// Load environment variables
config();

function printUsage(): void {
  console.log(`
TaskPing - AI development notification bot

Usage:
  task-ping <message>                    Send info notification
  task-ping -t <type> <message>          Send typed notification
  task-ping --success <message>          Send success notification
  task-ping --error <message>            Send error notification
  task-ping --warning <message>          Send warning notification

Options:
  -t, --type <type>    Notification type: success, error, warning, info
  -p, --project <name> Project name (overrides env)
  -T, --title <title>  Custom title
  -m, --mention        Mention @here
  -h, --help           Show this help

Environment:
  DISCORD_WEBHOOK_URL  Webhook URL (required)
  PROJECT_NAME         Default project name

Examples:
  task-ping "Build completed"
  task-ping --success "All tests passed"
  task-ping --error "Build failed: missing dependency"
  task-ping -t warning -p MyProject "Review requested"
`);
}

interface ParsedArgs {
  type: NotificationType;
  message: string;
  project?: string;
  title?: string;
  mention: boolean;
  help: boolean;
}

function parseArgs(args: string[]): ParsedArgs {
  const result: ParsedArgs = {
    type: 'info',
    message: '',
    mention: false,
    help: false,
  };

  const positional: string[] = [];
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    switch (arg) {
      case '-h':
      case '--help':
        result.help = true;
        break;
      case '-t':
      case '--type':
        result.type = args[++i] as NotificationType;
        break;
      case '--success':
        result.type = 'success';
        break;
      case '--error':
        result.type = 'error';
        break;
      case '--warning':
        result.type = 'warning';
        break;
      case '--info':
        result.type = 'info';
        break;
      case '-p':
      case '--project':
        result.project = args[++i];
        break;
      case '-T':
      case '--title':
        result.title = args[++i];
        break;
      case '-m':
      case '--mention':
        result.mention = true;
        break;
      default:
        if (!arg.startsWith('-')) {
          positional.push(arg);
        }
    }
    i++;
  }

  result.message = positional.join(' ');
  return result;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printUsage();
    process.exit(0);
  }

  if (!args.message) {
    console.error('Error: Message is required');
    printUsage();
    process.exit(1);
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error('Error: DISCORD_WEBHOOK_URL environment variable is required');
    process.exit(1);
  }

  try {
    await sendNotification(
      {
        webhookUrl,
        project: args.project || process.env.PROJECT_NAME,
      },
      {
        type: args.type,
        message: args.message,
        title: args.title,
        mention: args.mention,
      }
    );
    console.log(`✓ Notification sent (${args.type})`);
  } catch (error) {
    console.error('Failed to send notification:', error);
    process.exit(1);
  }
}

main();
