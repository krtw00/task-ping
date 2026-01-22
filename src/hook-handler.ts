#!/usr/bin/env node
/**
 * Hook handler for Claude Code Stop event
 * Reads stdin for hook data, extracts transcript, summarizes, and notifies
 */

import { config } from 'dotenv';
import { sendNotification } from './notifier.js';
import { extractRecentConversation, detectStopReason, STOP_REASON_TITLES } from './summarizer.js';

config();

interface HookInput {
  session_id?: string;
  transcript_path?: string;
  hook_event_name?: string;
}

async function main(): Promise<void> {
  // Read stdin
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let hookData: HookInput = {};
  try {
    hookData = JSON.parse(input);
  } catch {
    // No stdin data, use defaults
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('DISCORD_WEBHOOK_URL is required');
    process.exit(1);
  }

  // Get project name from current directory
  const projectName = process.env.PROJECT_NAME || process.cwd().split('/').pop() || 'Unknown';

  // Extract first user request and detect stop reason
  let message = '作業中';
  let title = '入力待ち';

  if (hookData.transcript_path) {
    try {
      // Detect stop reason for appropriate title
      const stopReason = await detectStopReason(hookData.transcript_path);
      title = STOP_REASON_TITLES[stopReason];

      // Get first user request (no summarization, show actual request)
      const userRequest = await extractRecentConversation(hookData.transcript_path);
      if (userRequest) {
        // Truncate if too long, but keep enough context
        message = userRequest.length > 200
          ? userRequest.slice(0, 200) + '...'
          : userRequest;
      }
    } catch (error) {
      console.error('Failed to extract context:', error);
    }
  }

  // Send notification
  try {
    await sendNotification(
      { webhookUrl, project: projectName },
      { type: 'info', message, title }
    );
    console.log(`✓ Notification sent (${title})`);
  } catch (error) {
    console.error('Notification failed:', error);
    process.exit(1);
  }
}

main();
