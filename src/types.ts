/**
 * Notification types with associated colors
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

/**
 * Color codes for Discord embeds
 */
export const NotificationColors: Record<NotificationType, number> = {
  success: 0x22c55e, // green
  error: 0xef4444,   // red
  warning: 0xeab308, // yellow
  info: 0x3b82f6,    // blue
};

/**
 * Notification payload
 */
export interface NotificationPayload {
  /** Notification type determines the color */
  type: NotificationType;
  /** Main message content */
  message: string;
  /** Optional title for the embed */
  title?: string;
  /** Project name for tagging */
  project?: string;
  /** Whether to mention @here */
  mention?: boolean;
}

/**
 * Configuration for TaskPing
 */
export interface TaskPingConfig {
  /** Discord webhook URL */
  webhookUrl: string;
  /** Default project name */
  project?: string;
}

/**
 * Discord Embed structure
 */
export interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
  footer?: { text: string };
  timestamp: string;
}

/**
 * Discord Webhook payload
 */
export interface DiscordWebhookPayload {
  content?: string;
  username?: string;
  embeds: DiscordEmbed[];
}
