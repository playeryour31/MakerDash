import { BadRequestException, Injectable } from '@nestjs/common';
import { FeatureRepository } from '../prisma/repositories/feature.repository';
import { LogsService } from './logs.service';
import {
  ALL_LOG_EVENTS,
  LOG_EVENTS_BY_FEATURE,
  LOG_FEATURE_GROUPS,
  LOG_RUNTIME_READY,
  NS_LOG,
  configKey,
  eventKey,
  type LogEventId,
  type LogsFeatureKey,
} from './logs.catalog';

export type LogEventState = {
  id: LogEventId;
  enabled: boolean;
  channelId: string | null;
  color: string;
  runtimeReady: boolean;
};

export type LogsGeneralConfig = {
  defaultChannelId: string | null;
  defaultColor: string;
};

function asObj(v: unknown): Record<string, any> | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  return v as Record<string, any>;
}

function normalizeColor(raw: unknown, fallback = 'Green'): string {
  if (typeof raw !== 'string') return fallback;
  const s = raw.trim();
  if (!s) return fallback;
  if (/^#?[0-9a-fA-F]{6}$/.test(s)) {
    return s.startsWith('#') ? s : `#${s}`;
  }
  const named = [
    'Default',
    'White',
    'Aqua',
    'Green',
    'Blue',
    'Yellow',
    'Purple',
    'LuminousVividPink',
    'Fuchsia',
    'Gold',
    'Orange',
    'Red',
    'Grey',
    'Navy',
    'DarkAqua',
    'DarkGreen',
    'DarkBlue',
    'DarkPurple',
    'DarkVividPink',
    'DarkGold',
    'DarkOrange',
    'DarkRed',
    'DarkGrey',
    'DarkerGrey',
    'LightGrey',
    'DarkNavy',
    'Blurple',
    'Greyple',
    'DarkButNotBlack',
    'NotQuiteBlack',
    'Random',
  ];
  const hit = named.find((n) => n.toLowerCase() === s.toLowerCase());
  return hit || s;
}

@Injectable()
export class LogsFeaturesService {
  constructor(
    private readonly features: FeatureRepository,
    private readonly logs: LogsService,
  ) {}

  list() {
    return LOG_FEATURE_GROUPS.filter((f) => f !== 'general');
  }

  private async resolveGuild(botId: string) {
    const bot = await this.logs.ensureLogsBot(botId);
    const guildId = this.logs.guildIdOf(bot);
    if (!guildId) {
      throw new BadRequestException('Bot is not linked to a guild');
    }
    return { bot, guildId };
  }

  private readEvent(
    map: Record<string, any>,
    event: LogEventId,
    guildId: string,
    botId: string,
  ): LogEventState {
    const raw = asObj(map[eventKey(event, guildId, botId)]);
    const channelId =
      raw?.channel != null && String(raw.channel).trim()
        ? String(raw.channel).trim()
        : null;
    return {
      id: event,
      enabled: Boolean(channelId),
      channelId,
      color: normalizeColor(raw?.color, 'Green'),
      runtimeReady: LOG_RUNTIME_READY[event] !== false,
    };
  }

  private async readGeneral(
    guildId: string,
    botId: string,
  ): Promise<LogsGeneralConfig> {
    const raw = asObj(await this.features.get(NS_LOG, configKey(guildId, botId)));
    return {
      defaultChannelId:
        raw?.defaultChannelId != null && String(raw.defaultChannelId).trim()
          ? String(raw.defaultChannelId).trim()
          : null,
      defaultColor: normalizeColor(raw?.defaultColor, 'Green'),
    };
  }

  async overviewExtras(botId: string) {
    const bot = await this.logs.ensureLogsBot(botId);
    const guildId = this.logs.guildIdOf(bot);
    if (!guildId) {
      return {
        features: this.list().map((id) => ({
          id,
          enabled: 0,
          total: LOG_EVENTS_BY_FEATURE[id].length,
        })),
        eventsEnabled: 0,
        eventsTotal: ALL_LOG_EVENTS.length,
        general: { defaultChannelId: null, defaultColor: 'Green' },
      };
    }

    const map = await this.features.getNamespaceMap(NS_LOG);
    const general = await this.readGeneral(guildId, botId);
    let eventsEnabled = 0;
    const features = this.list().map((id) => {
      const events = LOG_EVENTS_BY_FEATURE[id];
      let enabled = 0;
      for (const ev of events) {
        if (this.readEvent(map, ev, guildId, botId).enabled) enabled += 1;
      }
      eventsEnabled += enabled;
      return { id, enabled, total: events.length };
    });

    return {
      features,
      eventsEnabled,
      eventsTotal: ALL_LOG_EVENTS.length,
      general,
    };
  }

  async getFeature(botId: string, feature: string) {
    const key = String(feature || '')
      .trim()
      .toLowerCase() as LogsFeatureKey;
    if (!(LOG_FEATURE_GROUPS as readonly string[]).includes(key)) {
      throw new BadRequestException(`Unknown feature: ${feature}`);
    }

    const { guildId } = await this.resolveGuild(botId);

    if (key === 'general') {
      const general = await this.readGeneral(guildId, botId);
      return { feature: key, ...general };
    }

    const map = await this.features.getNamespaceMap(NS_LOG);
    const general = await this.readGeneral(guildId, botId);
    const events = LOG_EVENTS_BY_FEATURE[key].map((ev) =>
      this.readEvent(map, ev, guildId, botId),
    );
    return { feature: key, general, events };
  }

  async updateFeature(
    botId: string,
    feature: string,
    body: Record<string, unknown>,
  ) {
    const key = String(feature || '')
      .trim()
      .toLowerCase() as LogsFeatureKey;
    if (!(LOG_FEATURE_GROUPS as readonly string[]).includes(key)) {
      throw new BadRequestException(`Unknown feature: ${feature}`);
    }

    const { guildId } = await this.resolveGuild(botId);

    if (key === 'general') {
      const prev = await this.readGeneral(guildId, botId);
      const next: LogsGeneralConfig = {
        defaultChannelId:
          body.defaultChannelId === undefined
            ? prev.defaultChannelId
            : body.defaultChannelId == null ||
                String(body.defaultChannelId).trim() === ''
              ? null
              : String(body.defaultChannelId).trim(),
        defaultColor:
          body.defaultColor === undefined
            ? prev.defaultColor
            : normalizeColor(body.defaultColor, prev.defaultColor),
      };
      await this.features.set(
        NS_LOG,
        configKey(guildId, botId),
        next,
        botId,
      );
      return this.getFeature(botId, 'general');
    }

    const allowed = new Set(LOG_EVENTS_BY_FEATURE[key]);
    const general = await this.readGeneral(guildId, botId);
    const incoming = Array.isArray(body.events) ? body.events : null;
    if (!incoming) {
      throw new BadRequestException('events array required');
    }

    for (const item of incoming) {
      const row = asObj(item);
      if (!row) continue;
      const id = String(row.id || '').trim() as LogEventId;
      if (!allowed.has(id)) {
        throw new BadRequestException(`Event ${id} not in ${key}`);
      }

      const enabled = Boolean(row.enabled);
      let channelId =
        row.channelId != null && String(row.channelId).trim()
          ? String(row.channelId).trim()
          : null;
      if (enabled && !channelId) {
        channelId = general.defaultChannelId;
      }
      const color = normalizeColor(
        row.color,
        general.defaultColor || 'Green',
      );
      const k = eventKey(id, guildId, botId);

      if (!enabled || !channelId) {
        await this.features.delete(NS_LOG, k);
        continue;
      }

      await this.features.set(
        NS_LOG,
        k,
        { channel: channelId, color },
        botId,
      );
    }

    return this.getFeature(botId, key);
  }
}
