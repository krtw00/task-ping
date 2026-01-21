#!/usr/bin/env node
/**
 * Hook handler for Claude Code Stop event
 * Reads stdin for hook data, extracts transcript, summarizes, and notifies
 */

import { config } from 'dotenv';
import { sendNotification } from './notifier.js';
import { summarize, extractRecentConversation } from './summarizer.js';

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

  // Extract and summarize conversation
  let summary = '作業完了';
  if (hookData.transcript_path) {
    try {
      const conversation = await extractRecentConversation(hookData.transcript_path);
      if (conversation) {
        const backend = (process.env.SUMMARY_BACKEND || 'ollama') as 'ollama' | 'anthropic';
        summary = await summarize(conversation, {
          backend,
          ollamaUrl: process.env.OLLAMA_URL,
          ollamaModel: process.env.OLLAMA_MODEL,
          anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        });
      }
    } catch (error) {
      console.error('Summary failed:', error);
    }
  }

  // Send notification
  try {
    await sendNotification(
      { webhookUrl, project: projectName },
      { type: 'info', message: summary, title: '入力待ち' }
    );
    console.log('✓ Notification sent');
  } catch (error) {
    console.error('Notification failed:', error);
    process.exit(1);
  }
}

main();
