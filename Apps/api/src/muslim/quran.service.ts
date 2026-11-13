import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { FeatureRepository } from '../prisma/repositories/feature.repository';
import { shouldWriteJson, shouldWritePostgres } from '@maker/database';
import { AzkarService } from '../azkar/azkar.service';

export type QuranStatus = 'idle' | 'playing' | 'reconnecting' | 'error';

export type QuranSettings = {
  voiceChannelId: string;
  radioId: string;
  radioName: string;
  radioUrl: string;
  volume: number;
  enabled: boolean;
  status?: QuranStatus;
  lastError?: string | null;
};

export type QuranRadio = {
  id: string;
  name: string;
  url: string;
};

@Injectable()
export class QuranService {
  private readonly namespace = 'quran';
  private readonly jsonFile = path.resolve(
    process.cwd(),
    'Maker',
    'Json-Database',
    'Settings',
    'Quran.json',
  );

  private radiosCache: { at: number; items: QuranRadio[] } | null = null;
  private readonly radiosTtlMs = 60 * 60 * 1000;

  constructor(
    private readonly features: FeatureRepository,
    private readonly azkar: AzkarService,
  ) {}

  private key(botId: string) {
    return `Quran_${botId}`;
  }

  private actionKey(botId: string) {
    return `Dashboard_Quran_Action_${botId}`;
  }

  async ensureMuslimBot(botId: string) {
    return this.azkar.ensureAzkarBot(botId);
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

  private clampVolume(v: unknown): number {
    const n = Number(v);
    if (!Number.isFinite(n)) return 80;
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  private normalize(raw: any): QuranSettings | null {
    if (!raw || typeof raw !== 'object') return null;
    const voiceChannelId = String(raw.voiceChannelId || '').trim();
    const radioUrl = String(raw.radioUrl || '').trim();
    if (!voiceChannelId && !radioUrl && !raw.radioId) return null;
    const statusRaw = String(raw.status || 'idle');
    const status: QuranStatus =
      statusRaw === 'playing' ||
      statusRaw === 'reconnecting' ||
      statusRaw === 'error'
        ? statusRaw
        : 'idle';
    return {
      voiceChannelId,
      radioId: String(raw.radioId || ''),
      radioName: String(raw.radioName || ''),
      radioUrl,
      volume: this.clampVolume(raw.volume ?? 80),
      enabled: raw.enabled === undefined ? true : Boolean(raw.enabled),
      status,
      lastError: raw.lastError ? String(raw.lastError) : null,
    };
  }

  private async persist(botId: string, next: QuranSettings) {
    const key = this.key(botId);
    if (shouldWritePostgres()) {
      await this.features.set(this.namespace, key, next, botId);
    }
    // Always keep JSON warm — bot control plane reads the file, not PG cache
    try {
      const map = this.readJsonMap();
      map[key] = next;
      this.writeJsonMap(map);
    } catch {
      /* ignore */
    }
    return next;
  }

  async getSettings(botId: string): Promise<QuranSettings | null> {
    await this.ensureMuslimBot(botId);
    const key = this.key(botId);
    // Prefer JSON — bot writes live status/queue there
    const map = this.readJsonMap();
    if (map[key] != null) {
      return this.normalize(map[key]);
    }
    try {
      const raw = await this.features.get(this.namespace, key);
      return this.normalize(raw);
    } catch {
      return null;
    }
  }

  async overview(botId: string) {
    const bot = await this.ensureMuslimBot(botId);
    const settings = await this.getSettings(botId);
    const guildId = bot?.Server || bot?.guild || null;
    return {
      botId,
      settings,
      configured: Boolean(settings?.voiceChannelId && settings?.radioUrl),
      playing: settings?.status === 'playing' || settings?.status === 'reconnecting',
      guildId: guildId ? String(guildId) : null,
    };
  }

  async updateSettings(
    botId: string,
    body: {
      voiceChannelId?: string;
      radioId?: string;
      radioName?: string;
      radioUrl?: string;
      volume?: number;
      enabled?: boolean;
      play?: boolean;
    },
  ) {
    await this.ensureMuslimBot(botId);
    const current = (await this.getSettings(botId)) || {
      voiceChannelId: '',
      radioId: '',
      radioName: '',
      radioUrl: '',
      volume: 80,
      enabled: true,
      status: 'idle' as QuranStatus,
      lastError: null,
    };

    const wantPlay = Boolean(body.play);
    const next: QuranSettings = {
      ...current,
      voiceChannelId: String(
        body.voiceChannelId ?? current.voiceChannelId,
      ).trim(),
      radioId: String(body.radioId ?? current.radioId).trim(),
      radioName: String(body.radioName ?? current.radioName).trim(),
      radioUrl: String(body.radioUrl ?? current.radioUrl).trim(),
      volume:
        body.volume === undefined
          ? current.volume
          : this.clampVolume(body.volume),
      enabled:
        body.enabled === undefined
          ? current.enabled !== false
          : Boolean(body.enabled),
      status: wantPlay ? 'reconnecting' : current.status,
      lastError: wantPlay ? null : current.lastError,
    };

    if (wantPlay) {
      next.enabled = true;
    }

    // Allow saving radio/volume before a voice channel is chosen.
    // Playback still requires both channel + radio URL.
    if (!next.radioUrl && !next.voiceChannelId) {
      throw new BadRequestException('Select a reciter or voice channel');
    }
    if (wantPlay && (!next.voiceChannelId || !next.radioUrl)) {
      throw new BadRequestException('Configure voice channel and radio first');
    }

    try {
      await this.persist(botId, next);
    } catch (err: any) {
      try {
        const map = this.readJsonMap();
        map[this.key(botId)] = next;
        this.writeJsonMap(map);
      } catch {
        throw new BadRequestException(
          err?.message || 'Failed to persist Quran settings',
        );
      }
    }

    await this.queueControl(botId, {
      action: 'applySettings',
      voiceChannelId: next.voiceChannelId,
      radioId: next.radioId,
      radioName: next.radioName,
      radioUrl: next.radioUrl,
      volume: next.volume,
      enabled: next.enabled,
      play: wantPlay || undefined,
    });

    return next;
  }

  /** Keep only the latest intent so the bot reacts to the newest dashboard click. */
  private coalesceQueue(queue: any[], payload: Record<string, any>): any[] {
    const action = String(payload.action || '');
    const next = [...queue];

    if (action === 'stop') {
      return [{ ...payload, queuedAt: new Date().toISOString() }];
    }

    if (action === 'setVolume') {
      const filtered = next.filter((i) => String(i?.action) !== 'setVolume');
      filtered.push({ ...payload, queuedAt: new Date().toISOString() });
      return filtered;
    }

    if (
      action === 'play' ||
      action === 'live' ||
      action === 'applySettings' ||
      action === 'setSettings'
    ) {
      // Drop prior stop/play/settings — newest intent wins
      const filtered = next.filter((i) => {
        const a = String(i?.action || '');
        return !(
          a === 'play' ||
          a === 'live' ||
          a === 'stop' ||
          a === 'applySettings' ||
          a === 'setSettings' ||
          a === 'setRadio' ||
          a === 'setChannel' ||
          a === 'setVolume'
        );
      });
      filtered.push({ ...payload, queuedAt: new Date().toISOString() });
      return filtered;
    }

    next.push({ ...payload, queuedAt: new Date().toISOString() });
    return next;
  }

  async queueControl(botId: string, payload: Record<string, any>) {
    const key = this.actionKey(botId);
    // JSON file is the realtime source of truth for the bot control plane
    const map = this.readJsonMap();
    let queue: any[] = Array.isArray(map[key]) ? map[key] : [];
    const list = this.coalesceQueue(queue, payload);

    map[key] = list;
    this.writeJsonMap(map);

    if (shouldWritePostgres()) {
      try {
        await this.features.set(this.namespace, key, list, botId);
      } catch {
        /* JSON already written — bot reads the file */
      }
    }
    return { queued: true, depth: list.length };
  }

  async control(
    botId: string,
    body: {
      action: string;
      volume?: number;
      voiceChannelId?: string;
      radioId?: string;
      radioName?: string;
      radioUrl?: string;
      enabled?: boolean;
    },
  ) {
    await this.ensureMuslimBot(botId);
    const action = String(body.action || '').trim();
    if (!['play', 'stop', 'setVolume', 'live'].includes(action)) {
      throw new BadRequestException('Invalid action');
    }

    if (action === 'live' || action === 'play') {
      const patch: Record<string, any> = {};
      if (body.voiceChannelId != null) patch.voiceChannelId = body.voiceChannelId;
      if (body.radioId != null) patch.radioId = body.radioId;
      if (body.radioName != null) patch.radioName = body.radioName;
      if (body.radioUrl != null) patch.radioUrl = body.radioUrl;
      if (body.volume != null) patch.volume = body.volume;
      if (body.enabled != null) patch.enabled = body.enabled;
      return this.updateSettings(botId, {
        ...patch,
        play: action === 'play' || action === 'live',
        enabled: true,
      });
    }

    if (action === 'setVolume') {
      const payload: Record<string, any> = {
        action: 'setVolume',
        volume: this.clampVolume(body.volume),
      };
      const current = await this.getSettings(botId);
      if (current) {
        await this.persist(botId, { ...current, volume: payload.volume });
      }
      return this.queueControl(botId, payload);
    }

    if (action === 'stop') {
      const current = await this.getSettings(botId);
      if (current) {
        await this.persist(botId, {
          ...current,
          enabled: false,
          status: 'idle',
          lastError: null,
        });
      }
      return this.queueControl(botId, { action: 'stop' });
    }

    return this.queueControl(botId, { action });
  }

  async listRadios(): Promise<QuranRadio[]> {
    const now = Date.now();
    if (this.radiosCache && now - this.radiosCache.at < this.radiosTtlMs) {
      return this.radiosCache.items;
    }

    const urls = [
      'https://www.mp3quran.net/api/v3/radios?language=ar',
      'https://mp3quran.net/api/v3/radios?language=ar',
    ];

    let items: QuranRadio[] = [];
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) continue;
        const data: any = await res.json();
        const list = Array.isArray(data?.radios)
          ? data.radios
          : Array.isArray(data)
            ? data
            : [];
        items = list
          .map((r: any) => ({
            id: String(r.id ?? r.radio_id ?? r.name ?? ''),
            name: String(r.name || r.radio_name || 'Radio'),
            url: String(r.url || r.radio_url || '').trim(),
          }))
          .filter((r: QuranRadio) => r.id && r.url);
        if (items.length) break;
      } catch {
        /* try next */
      }
    }

    if (!items.length) {
      throw new NotFoundException('Could not load Quran radios');
    }

    this.radiosCache = { at: now, items };
    return items;
  }
}
