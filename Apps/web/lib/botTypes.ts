export type PanelQuestion = {
  id?: string;
  label: string;
  style?: 'short' | 'paragraph';
  required?: boolean;
  placeholder?: string;
  minLength?: number | null;
  maxLength?: number | null;
};

export type PanelEmbed = {
  title?: string;
  description?: string;
  color?: string;
  authorName?: string;
  authorIconUrl?: string;
  footerText?: string;
  footerIconUrl?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  useServerBranding?: boolean;
  timestamp?: boolean;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
};

export type BotPanel = {
  messageId: string;
  channel: string;
  message: string;
  ask1?: string;
  ask2?: string;
  ask3?: string;
  ask4?: string;
  ask5?: string;
  questions?: PanelQuestion[];
  status: string;
  appliedCount: number;
  messageType?: string;
  buttonLabel?: string | null;
  buttonEmoji?: string | null;
  buttonColor?: string | null;
  requestsChannel?: string | null;
  applicationRole?: string | null;
  embed?: PanelEmbed | null;
};

export type PendingApplication = {
  id: string;
  userId: string;
  roleId: string;
  channelId: string;
  messageId: string;
  panelMessageId?: string;
  guildId: string;
  status: string;
  answers?: Array<{ qes: string; ans: string }>;
  createdAt?: string;
  decidedAt?: string;
  decidedBy?: string;
};

export type BotOverview = {
  botId: string;
  running: boolean;
  guildId: string | null;
  settings: {
    adminRoleId: string | null;
    logsChannelId: string | null;
    resultsChannelId?: string | null;
    language: 'Ar' | 'En';
    dmMode: { accept: string; reject: string };
  } | null;
  panels: BotPanel[];
  pending: PendingApplication[];
};

export type AccessInfo = {
  dashboardUrl: string;
  inviteUrl: string;
  slug: string;
};

export type SettingsDraft = {
  guildId: string;
  adminRoleId: string;
  logsChannelId: string;
  language: 'Ar' | 'En';
  dmAccept: string;
  dmReject: string;
};

export const EMPTY_SETTINGS: SettingsDraft = {
  guildId: '',
  adminRoleId: '',
  logsChannelId: '',
  language: 'Ar',
  dmAccept: 'off',
  dmReject: 'off',
};
