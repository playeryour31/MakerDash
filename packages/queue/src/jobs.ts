export type BotJobPayload = {
  botClientId: string;
  payload: Record<string, unknown>;
  enqueuedAt?: string;
};

export type PanelCreateJob = BotJobPayload;
export type PanelUpdateJob = BotJobPayload;
export type PanelDeleteJob = BotJobPayload;
export type ApplyActionJob = BotJobPayload;
export type DashboardLogJob = BotJobPayload & {
  guildId?: string;
  channelId?: string;
};
