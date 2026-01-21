import {
  NotificationPayload,
  NotificationColors,
  TaskPingConfig,
  DiscordWebhookPayload,
  DiscordEmbed,
} from './types.js';

/**
 * Get default title based on notification type
 */
function getDefaultTitle(type: NotificationPayload['type']): string {
  switch (type) {
    case 'success':
      return '✅ Task Completed';
    case 'error':
      return '❌ Error';
    case 'warning':
      return '⚠️ Attention Required';
    case 'info':
      return 'ℹ️ Info';
  }
}

/**
 * Build Discord embed from payload
 */
function buildEmbed(payload: NotificationPayload): DiscordEmbed {
  const title = payload.title || getDefaultTitle(payload.type);

  return {
    title,
    description: payload.message,
    color: NotificationColors[payload.type],
    timestamp: new Date().toISOString(),
  };
}

/**
 * Send notification via Discord Webhook
 */
export async function sendNotification(
  config: TaskPingConfig,
  payload: NotificationPayload
): Promise<void> {
  const embed = buildEmbed(payload);
  const projectName = payload.project || config.project;

  const webhookPayload: DiscordWebhookPayload = {
    embeds: [embed],
  };

  // Use project name as bot username
  if (projectName) {
    webhookPayload.username = projectName;
  }

  if (payload.mention) {
    webhookPayload.content = '@here';
  }

  const response = await fetch(config.webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(webhookPayload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Webhook failed: ${response.status} ${text}`);
  }
}
