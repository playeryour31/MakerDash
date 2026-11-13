import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { ApplyStoreService } from '../apply/apply-store.service';
import { FeatureRepository } from '../prisma/repositories/feature.repository';
import { shouldWriteJson, shouldWritePostgres } from '@maker/database';

export type AzkarMode = 'embed' | 'message';

export type AzkarSettings = {
  Mode: AzkarMode;
  Channel: string;
  enabled?: boolean;
  /** Minutes between each post (default 5) */
  intervalMinutes?: number;
  /** Extra seconds to wait after each post */
  slowdownSeconds?: number;
  /** Indices into Azkar.json; empty = all */
  selectedAzkar?: number[];
};

@Injectable()
export class AzkarService {
  private readonly namespace = 'azkar';
  private readonly jsonFile = path.resolve(
    process.cwd(),
    'Maker',
    'Json-Database',
    'Settings',
    'Azkar.json',
  );
  private readonly azkarCatalogFile = path.resolve(
    process.cwd(),
    'Maker',
    'Utils',
    'Azkar',
    'Azkar.json',
  );

  constructor(
    private readonly store: ApplyStoreService,
    private readonly features: FeatureRepository,
  ) {}

  private key(botId: string) {
    return `Azkar_${botId}`;
  }

  isAzkarBot(bot: any): boolean {
    const t = String(bot?.Type || bot?.type || '')
      .trim()
      .toLowerCase();
    return t === 'azkar' || t === 'muslim';
  }

  async ensureAzkarBot(botId: string) {
    const bot =
      (await this.store.getBotAsync(botId)) || this.store.getBot(botId);
    if (!bot) throw new NotFoundException('Bot not found');
    if (!this.isAzkarBot(bot)) {
      throw new BadRequestException('Bot is not a Muslim bot');
    }
    return bot;
  }

  private readJsonMap(): Record<string, any> {
    try {
      if (!fs.existsSync(this.jsonFile)) return {};
      return JSON.parse(fs.readFileSync(this.jsonFile, 'utf8') || '{}') || {};
    } catch {
      return {};
    }
  }

  private writeJsonMap(map: Record<string, any>) {
    const dir = path.dirname(this.jsonFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.jsonFile, JSON.stringify(map, null, 4), 'utf8');
  }

  private normalize(raw: any): AzkarSettings | null {
    if (!raw || typeof raw !== 'object') return null;
    const mode = String(raw.Mode || '').toLowerCase();
    const channel = String(raw.Channel || '').trim();
    if (!channel) return null;
    if (mode !== 'embed' && mode !== 'message') return null;
    const enabled =
      raw.enabled === undefined || raw.enabled === null
        ? true
        : Boolean(raw.enabled);
    const intervalMinutes = Number(raw.intervalMinutes);
    const slowdownSeconds = Number(raw.slowdownSeconds);
    const selectedRaw = raw.selectedAzkar;
    const selectedAzkar = Array.isArray(selectedRaw)
      ? selectedRaw
          .map((n) => Number(n))
          .filter((n) => Number.isInteger(n) && n >= 0)
      : undefined;
    return {
      Mode: mode as AzkarMode,
      Channel: channel,
      enabled,
      intervalMinutes: Number.isFinite(intervalMinutes)
        ? Math.max(1, Math.min(1440, Math.round(intervalMinutes)))
        : 5,
      slowdownSeconds: Number.isFinite(slowdownSeconds)
        ? Math.max(0, Math.min(3600, Math.round(slowdownSeconds)))
        : 0,
      selectedAzkar: selectedAzkar?.length ? selectedAzkar : undefined,
    };
  }

  listCatalog(): Array<{ index: number; text: string }> {
    try {
      if (!fs.existsSync(this.azkarCatalogFile)) return [];
      const parsed = JSON.parse(fs.readFileSync(this.azkarCatalogFile, 'utf8'));
      const list = Array.isArray(parsed?.Azkar) ? parsed.Azkar : [];
      return list.map((text: string, index: number) => ({
        index,
        text: String(text || '').trim(),
      }));
    } catch {
      return [];
    }
  }

  async getSettings(botId: string): Promise<AzkarSettings | null> {
    await this.ensureAzkarBot(botId);
    const key = this.key(botId);
    let raw: any;
    try {
      raw = await this.features.get(this.namespace, key);
    } catch {
      raw = undefined;
    }
    if (raw == null) {
      const map = this.readJsonMap();
      raw = map[key];
    }
    return this.normalize(raw);
  }

  async overview(botId: string) {
    const bot = await this.ensureAzkarBot(botId);
    const settings = await this.getSettings(botId);
    const guildId = bot?.Server || bot?.guild || null;
    return {
      botId,
      type: 'Muslim',
      running: await this.store.isRunningAsync(botId),
      guildId: guildId ? String(guildId) : null,
      settings,
      configured: Boolean(settings?.Channel),
      intervalMs: (settings?.intervalMinutes ?? 5) * 60_000,
      slowdownMs: (settings?.slowdownSeconds ?? 0) * 1000,
      bot: {
        ClientID: bot.ClientID || botId,
        Type: bot.Type || 'Muslim',
        Server: guildId,
        Owner: bot.Owner || null,
      },
      accessRole: 'owner' as const,
    };
  }

  async updateSettings(
    botId: string,
    body: {
      channelId?: string;
      mode?: string;
      enabled?: boolean;
      intervalMinutes?: number;
      slowdownSeconds?: number;
      selectedAzkar?: number[];
    },
  ) {
    await this.ensureAzkarBot(botId);
    const current = (await this.getSettings(botId)) || {
      Mode: 'embed' as AzkarMode,
      Channel: '',
      enabled: true,
      intervalMinutes: 5,
      slowdownSeconds: 0,
    };

    const modeRaw = String(body.mode ?? current.Mode).toLowerCase();
    if (modeRaw !== 'embed' && modeRaw !== 'message') {
      throw new BadRequestException('mode must be embed or message');
    }
    const channelId = String(body.channelId ?? current.Channel).trim();
    if (!channelId) {
      throw new BadRequestException('channelId required');
    }

    let intervalMinutes = current.intervalMinutes ?? 5;
    if (body.intervalMinutes != null) {
      intervalMinutes = Math.max(
        1,
        Math.min(1440, Math.round(Number(body.intervalMinutes))),
      );
    }

    let slowdownSeconds = current.slowdownSeconds ?? 0;
    if (body.slowdownSeconds != null) {
      slowdownSeconds = Math.max(
        0,
        Math.min(3600, Math.round(Number(body.slowdownSeconds))),
      );
    }

    let selectedAzkar = current.selectedAzkar;
    if (body.selectedAzkar != null) {
      const catalog = this.listCatalog();
      const max = catalog.length;
      selectedAzkar = body.selectedAzkar
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n >= 0 && n < max);
      if (selectedAzkar.length === 0) selectedAzkar = undefined;
    }

    const next: AzkarSettings = {
      Mode: modeRaw as AzkarMode,
      Channel: channelId,
      enabled:
        body.enabled === undefined ? current.enabled !== false : Boolean(body.enabled),
      intervalMinutes,
      slowdownSeconds,
      selectedAzkar,
    };

    const key = this.key(botId);

    if (shouldWritePostgres()) {
      await this.features.set(this.namespace, key, next, botId);
    }

    if (shouldWriteJson() || !shouldWritePostgres()) {
      const map = this.readJsonMap();
      map[key] = next;
      this.writeJsonMap(map);
    }

    // Keep JSON warm even when PG is primary so Maker file-fallback stays synced
    if (shouldWritePostgres() && !shouldWriteJson()) {
      try {
        const map = this.readJsonMap();
        map[key] = next;
        this.writeJsonMap(map);
      } catch {
        /* ignore */
      }
    }

    return next;
  }
}
