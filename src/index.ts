/**
 * TaskPing - AI development notification bot
 *
 * @example
 * ```ts
 * import { sendNotification } from 'task-ping';
 *
 * await sendNotification(
 *   { webhookUrl: process.env.DISCORD_WEBHOOK_URL },
 *   { type: 'success', message: 'Build completed!' }
 * );
 * ```
 */

export { sendNotification } from './notifier.js';
export { summarize, extractRecentConversation } from './summarizer.js';
export type {
  NotificationType,
  NotificationPayload,
  TaskPingConfig,
} from './types.js';
export { NotificationColors } from './types.js';
