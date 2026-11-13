/** Log event catalog mirrored from Maker/Utils/Logs/Logs.json */

export const LOG_FEATURE_GROUPS = [
  'general',
  'members',
  'messages',
  'voice',
  'roles',
  'channels',
] as const;

export type LogsFeatureKey = (typeof LOG_FEATURE_GROUPS)[number];

export type LogEventId =
  | 'member-joined'
  | 'member-left'
  | 'member-kicked'
  | 'member-banned'
  | 'member-unbanned'
  | 'timeout'
  | 'nickname-changed'
  | 'message-deleted'
  | 'message-edited'
  | 'member-joined-channel'
  | 'member-left-channel'
  | 'voice-state'
  | 'member-disconnected'
  | 'role-created'
  | 'role-deleted'
  | 'role-updated'
  | 'role-given'
  | 'role-removed'
  | 'channel-created'
  | 'channel-deleted'
  | 'channel-updated'
  | 'channel-prems-updated'
  | 'thread-created'
  | 'thread-deleted'
  | 'thread-updated';

/** Events with live bot handlers today (updates may be partial). */
export const LOG_RUNTIME_READY: Record<LogEventId, boolean> = {
  'member-joined': true,
  'member-left': true,
  'member-kicked': true,
  'member-banned': true,
  'member-unbanned': true,
  timeout: true,
  'nickname-changed': true,
  'message-deleted': true,
  'message-edited': true,
  'member-joined-channel': true,
  'member-left-channel': true,
  'voice-state': true,
  'member-disconnected': true,
  'role-created': true,
  'role-deleted': true,
  'role-updated': true,
  'role-given': true,
  'role-removed': true,
  'channel-created': true,
  'channel-deleted': true,
  'channel-updated': true,
  'channel-prems-updated': true,
  'thread-created': true,
  'thread-deleted': true,
  'thread-updated': true,
};

export const LOG_EVENTS_BY_FEATURE: Record<
  Exclude<LogsFeatureKey, 'general'>,
  LogEventId[]
> = {
  members: [
    'member-joined',
    'member-left',
    'member-kicked',
    'member-banned',
    'member-unbanned',
    'timeout',
    'nickname-changed',
  ],
  messages: ['message-deleted', 'message-edited'],
  voice: [
    'member-joined-channel',
    'member-left-channel',
    'voice-state',
    'member-disconnected',
  ],
  roles: [
    'role-created',
    'role-deleted',
    'role-updated',
    'role-given',
    'role-removed',
  ],
  channels: [
    'channel-created',
    'channel-deleted',
    'channel-updated',
    'channel-prems-updated',
    'thread-created',
    'thread-deleted',
    'thread-updated',
  ],
};

export const ALL_LOG_EVENTS: LogEventId[] = Object.values(
  LOG_EVENTS_BY_FEATURE,
).flat();

export const NS_LOG = 'sys_log';

export function eventKey(
  event: string,
  guildId: string,
  botId: string,
): string {
  return `${event}_${guildId}_${botId}`;
}

export function configKey(guildId: string, botId: string): string {
  return `logsConfig_${guildId}_${botId}`;
}
