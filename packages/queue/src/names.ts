/** BullMQ queue names for Dashboard → Discord bot work. */
export const QUEUE_NAMES = {
  PANEL_CREATE: 'bot.panel.create',
  PANEL_UPDATE: 'bot.panel.update',
  PANEL_DELETE: 'bot.panel.delete',
  APPLY_ACTION: 'bot.apply.action',
  DASHBOARD_LOG: 'bot.dashboard.log',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const ALL_QUEUE_NAMES: QueueName[] = Object.values(QUEUE_NAMES);
