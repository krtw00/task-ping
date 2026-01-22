#!/usr/bin/env node
/**
 * Permission notification handler for Claude Code hooks
 * Extracts tool details from transcript and sends detailed notification
 */

import { config } from 'dotenv';
import { sendNotification } from './notifier.js';
import * as fs from 'fs/promises';
import * as path from 'path';

config();

interface NotificationInput {
  notification_type?: string;
  message?: string;
  cwd?: string;
  transcript_path?: string;
}

interface ToolDetails {
  toolName: string;
  description: string;
}

/**
 * Extract last tool use details from transcript
 */
async function extractLastToolUse(transcriptPath: string): Promise<ToolDetails | null> {
  try {
    const content = await fs.readFile(transcriptPath, 'utf-8');
    const lines = content.trim().split('\n');

    // Search from end for the last tool_use
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const parsed = JSON.parse(lines[i]);

        if (parsed.type === 'assistant' && parsed.message) {
          const message = parsed.message;

          // Handle {type: "message", content: [...]} format
          const content = message.content || (Array.isArray(message) ? message : null);

          if (Array.isArray(content)) {
            for (const item of content) {
              if (item.type === 'tool_use') {
                const toolName = item.name || 'unknown';
                const input = item.input || {};

                // Build description based on tool type
                let description = '';

                if (toolName === 'Bash') {
                  const cmd = input.command || '';
                  const desc = input.description || '';
                  // Build detailed message
                  if (desc) {
                    description = `${desc}\n\`${cmd.slice(0, 200)}\``;
                  } else {
                    description = `コマンドを実行しようとしています\n\`${cmd.slice(0, 200)}\``;
                  }
                  if (cmd.length > 200) description += '...';
                } else if (toolName === 'Edit') {
                  const filePath = input.file_path || '';
                  const oldStr = input.old_string || '';
                  description = `ファイルを編集しようとしています\n📄 ${filePath}\n変更箇所: "${oldStr.slice(0, 50)}${oldStr.length > 50 ? '...' : ''}"`;
                } else if (toolName === 'Write') {
                  const filePath = input.file_path || '';
                  description = `ファイルを作成/上書きしようとしています\n📄 ${filePath}`;
                } else if (toolName === 'Read') {
                  const filePath = input.file_path || '';
                  description = `ファイルを読み込もうとしています\n📄 ${filePath}`;
                } else {
                  description = `${toolName} を実行しようとしています`;
                }

                return { toolName, description };
              }
            }
          }
        }
      } catch {
        // Skip invalid lines
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to read transcript:', error);
    return null;
  }
}

async function main(): Promise<void> {
  // Read input from stdin
  let inputData = '';
  for await (const chunk of process.stdin) {
    inputData += chunk;
  }

  let input: NotificationInput;
  try {
    input = JSON.parse(inputData);
  } catch {
    console.error('Failed to parse input JSON');
    process.exit(1);
  }

  // Only handle permission_prompt notifications
  if (input.notification_type !== 'permission_prompt') {
    process.exit(0);
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('DISCORD_WEBHOOK_URL not set');
    process.exit(1);
  }

  // Get project name
  const projectName = input.cwd
    ? path.basename(input.cwd)
    : process.env.PROJECT_NAME || 'Unknown';

  // Extract tool details from transcript
  let title = '確認待ち';
  let message = '実行許可を待っています';

  if (input.transcript_path) {
    const toolDetails = await extractLastToolUse(input.transcript_path);
    if (toolDetails) {
      title = `${toolDetails.toolName} 確認待ち`;
      message = toolDetails.description;
    }
  }

  // Fallback: extract tool name from notification message
  if (message === '実行許可を待っています' && input.message) {
    const match = input.message.match(/permission to use (\w+)/);
    if (match) {
      title = `${match[1]} 確認待ち`;
    }
  }

  // Send notification
  try {
    await sendNotification(
      { webhookUrl, project: projectName },
      { type: 'warning', message, title }
    );
    console.log('✓ Permission notification sent');
  } catch (error) {
    console.error('Notification failed:', error);
    process.exit(1);
  }
}

main();
