import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { ApplyStoreService } from './apply-store.service';

export type BotPresenceStatus = 'online' | 'idle' | 'dnd' | 'invisible';
export type BotActivityType =
  | 'PLAYING'
  | 'STREAMING'
  | 'LISTENING'
  | 'WATCHING'
  | 'COMPETING';

export type BotProfileView = {
  id: string;
  username: string;
  globalName: string | null;
  discriminator: string | null;
  avatar: string | null;
  avatarUrl: string | null;
  banner: string | null;
  bannerUrl: string | null;
  accentColor: number | null;
  bio: string;
  activityType: BotActivityType;
  activityName: string;
  activityUrl: string;
  status: BotPresenceStatus;
  running: boolean;
};

export type BotProfileUpdateInput = {
  username?: string;
  bio?: string;
  avatarDataUrl?: string | null;
  bannerDataUrl?: string | null;
  activityType?: BotActivityType;
  activityName?: string;
  activityUrl?: string;
  status?: BotPresenceStatus;
};

@Injectable()
export class BotProfileService {
  private statusFile = path.resolve(
    // Nest may run from Apps/api — prefer monorepo root Database/
    process.cwd().endsWith(`${path.sep}api`) ||
      process.cwd().endsWith(`${path.sep}Apps${path.sep}api`)
      ? path.join(process.cwd(), '..', '..', 'Database', 'BotMaker', 'Status.json')
      : path.join(process.cwd(), 'Database', 'BotMaker', 'Status.json'),
  );

  constructor(private readonly store: ApplyStoreService) {}

  private readStatusDb(): Record<string, any> {
    try {
      if (!fs.existsSync(this.statusFile)) return {};
      return JSON.parse(fs.readFileSync(this.statusFile, 'utf8')) || {};
    } catch {
      return {};
    }
  }

  private writeStatusDb(payload: Record<string, any>) {
    const dir = path.dirname(this.statusFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = `${this.statusFile}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
    fs.renameSync(tmp, this.statusFile);
  }

  private getSavedPresence(botId: string) {
    const raw = this.readStatusDb();
    const entry = raw?.[botId] || null;
    return {
      activityType: (entry?.Type || 'PLAYING') as BotActivityType,
      activityName: String(entry?.Name || ''),
      activityUrl: String(entry?.Url || ''),
      status: (entry?.Status || 'online') as BotPresenceStatus,
    };
  }

  private savePresence(
    botId: string,
    presence: {
      activityType: BotActivityType;
      activityName: string;
      activityUrl: string;
      status: BotPresenceStatus;
    },
  ) {
    const raw = this.readStatusDb();
    this.writeStatusDb({
      ...raw,
      [botId]: {
        Name: presence.activityName,
        Type: presence.activityType,
        Url: presence.activityUrl,
        Status: presence.status,
      },
    });
  }

  private queuePresence(botId: string, presence: Record<string, any>) {
    const key = `Dashboard_Profile_${botId}`;
    const queue = this.store.get(key) || [];
    const list = Array.isArray(queue) ? queue : [];
    list.push({ ...presence, queuedAt: new Date().toISOString() });
    this.store.set(key, list.slice(-20));
  }

  private formatDiscordError(json: any, text: string, status: number): string {
    const base =
      json?.message ||
      (typeof text === 'string' && text ? text.slice(0, 220) : `HTTP ${status}`);
    const errors = json?.errors;
    if (!errors || typeof errors !== 'object') {
      return `Discord API ${status}: ${base}`;
    }
    const parts: string[] = [];
    const walk = (obj: any, prefix = '') => {
      if (!obj || typeof obj !== 'object') return;
      if (Array.isArray(obj._errors)) {
        for (const e of obj._errors) {
          const msg = e?.message || e?.code || JSON.stringify(e);
          parts.push(prefix ? `${prefix}: ${msg}` : String(msg));
        }
      }
      for (const [k, v] of Object.entries(obj)) {
        if (k === '_errors') continue;
        walk(v, prefix ? `${prefix}.${k}` : k);
      }
    };
    walk(errors);
    if (parts.length) {
      return `Discord API ${status}: ${base} — ${parts.slice(0, 4).join('; ')}`;
    }
    return `Discord API ${status}: ${base}`;
  }

  private async discordRequest(
    method: 'GET' | 'PATCH',
    token: string,
    body?: Record<string, unknown>,
    path = 'https://discord.com/api/v10/users/@me',
  ) {
    const res = await fetch(path, {
      method,
      headers: {
        Authorization: `Bot ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (!res.ok) {
      throw new BadRequestException(
        this.formatDiscordError(json, text, res.status),
      );
    }
    return json;
  }

  private async getApplication(token: string) {
    return this.discordRequest(
      'GET',
      token,
      undefined,
      'https://discord.com/api/v10/applications/@me',
    );
  }

  private async patchApplication(
    token: string,
    body: Record<string, unknown>,
  ) {
    return this.discordRequest(
      'PATCH',
      token,
      body,
      'https://discord.com/api/v10/applications/@me',
    );
  }

  /** Discord username rules (pomelo): lowercase a-z 0-9 . _ */
  private normalizeUsername(raw: string): string {
    const name = String(raw || '')
      .trim()
      .toLowerCase();
    if (name.length < 2 || name.length > 32) {
      throw new BadRequestException('Username must be 2–32 characters');
    }
    if (!/^[a-z0-9._]+$/.test(name)) {
      throw new BadRequestException(
        'Username can only use a–z, 0–9, underscore and period (no spaces)',
      );
    }
    if (name.includes('..')) {
      throw new BadRequestException('Username cannot contain consecutive periods');
    }
    if (name.startsWith('.') || name.endsWith('.')) {
      throw new BadRequestException('Username cannot start or end with a period');
    }
    return name;
  }

  private assertStreamingUrl(url: string) {
    const trimmed = url.trim();
    try {
      const u = new URL(trimmed);
      const host = u.hostname.replace(/^www\./i, '').toLowerCase();
      if (host === 'twitch.tv') {
        const channel = u.pathname.split('/').filter(Boolean)[0];
        if (!channel) {
          throw new BadRequestException(
            'Streaming requires a Twitch channel URL (e.g. https://twitch.tv/username)',
          );
        }
        return `https://twitch.tv/${channel}`.slice(0, 200);
      }
      if (
        host === 'youtube.com' ||
        host === 'm.youtube.com' ||
        host === 'youtu.be'
      ) {
        return u.toString().slice(0, 200);
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
    }
    throw new BadRequestException(
      'Streaming requires a Twitch or YouTube URL (e.g. https://twitch.tv/username)',
    );
  }

  private cdnAvatar(userId: string, avatar: string | null) {
    if (!avatar) return null;
    const ext = avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.${ext}?size=256`;
  }

  private cdnBanner(userId: string, banner: string | null) {
    if (!banner) return null;
    const ext = banner.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/banners/${userId}/${banner}.${ext}?size=600`;
  }

  private assertDataUrl(value: string | null | undefined, field: string) {
    if (value == null) return value;
    if (value === '') return null;
    if (!/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(value)) {
      throw new BadRequestException(
        `${field} must be a PNG/JPEG/GIF/WebP data URL`,
      );
    }
    const b64 = value.split(',')[1] || '';
    if (b64.length > 11_000_000) {
      throw new BadRequestException(`${field} is too large (max ~8MB)`);
    }
    return value;
  }

  private async resolveBot(botId: string) {
    const bot =
      (await this.store.getBotAsync(botId)) || this.store.getBot(botId);
    if (!bot?.Token) throw new NotFoundException('Bot token not found');
    return bot;
  }

  async getProfile(botId: string): Promise<BotProfileView> {
    const bot = await this.resolveBot(botId);

    const [me, app] = await Promise.all([
      this.discordRequest('GET', bot.Token),
      this.getApplication(bot.Token).catch(() => null),
    ]);
    const presence = this.getSavedPresence(botId);
    const id = String(me.id || botId);

    return {
      id,
      username: String(me.username || bot.username || 'Bot'),
      globalName: me.global_name ? String(me.global_name) : null,
      discriminator: me.discriminator ? String(me.discriminator) : null,
      avatar: me.avatar ? String(me.avatar) : null,
      avatarUrl: this.cdnAvatar(id, me.avatar ? String(me.avatar) : null),
      banner: me.banner ? String(me.banner) : null,
      bannerUrl: this.cdnBanner(id, me.banner ? String(me.banner) : null),
      accentColor:
        typeof me.accent_color === 'number' ? me.accent_color : null,
      bio: String(app?.description || ''),
      activityType: presence.activityType,
      activityName: presence.activityName,
      activityUrl: presence.activityUrl,
      status: presence.status,
      running: await this.store.isRunningAsync(botId),
    };
  }

  async updateProfile(
    botId: string,
    input: BotProfileUpdateInput,
  ): Promise<BotProfileView> {
    const bot = await this.resolveBot(botId);
    const currentMe = await this.discordRequest('GET', bot.Token);
    const currentUsername = String(currentMe.username || '');

    const patch: Record<string, unknown> = {};
    if (typeof input.username === 'string') {
      const name = this.normalizeUsername(input.username);
      // Avoid useless Discord PATCH (same name → sometimes 400 / rate noise)
      if (name !== currentUsername.toLowerCase()) {
        patch.username = name;
      }
    }
    if (input.avatarDataUrl !== undefined) {
      patch.avatar = this.assertDataUrl(input.avatarDataUrl, 'avatar');
    }
    if (input.bannerDataUrl !== undefined) {
      patch.banner = this.assertDataUrl(input.bannerDataUrl, 'banner');
    }

    if (Object.keys(patch).length) {
      await this.discordRequest('PATCH', bot.Token, patch);
    }

    if (typeof input.bio === 'string') {
      if (input.bio.length > 400) {
        throw new BadRequestException('About me must be at most 400 characters');
      }
      const currentApp = await this.getApplication(bot.Token).catch(() => null);
      const currentBio = String(currentApp?.description || '');
      if (input.bio !== currentBio) {
        await this.patchApplication(bot.Token, { description: input.bio });
      }
    }

    const current = this.getSavedPresence(botId);
    const nextPresence = {
      activityType: (input.activityType ||
        current.activityType ||
        'PLAYING') as BotActivityType,
      activityName:
        typeof input.activityName === 'string'
          ? input.activityName.trim().slice(0, 128)
          : current.activityName,
      activityUrl:
        typeof input.activityUrl === 'string'
          ? input.activityUrl.trim().slice(0, 200)
          : current.activityUrl,
      status: (input.status || current.status || 'online') as BotPresenceStatus,
    };

    if (nextPresence.activityType === 'STREAMING') {
      const rawUrl = String(nextPresence.activityUrl || '').trim();
      if (rawUrl) {
        nextPresence.activityUrl = this.assertStreamingUrl(rawUrl);
      } else {
        nextPresence.activityUrl = 'https://twitch.tv/discord';
      }
      nextPresence.status = 'online';
    }

    const presenceTouched =
      input.activityType !== undefined ||
      input.activityName !== undefined ||
      input.activityUrl !== undefined ||
      input.status !== undefined;

    if (presenceTouched) {
      if (!nextPresence.activityName.trim()) {
        throw new BadRequestException('Activity name is required');
      }
      this.savePresence(botId, nextPresence);
      this.queuePresence(botId, {
        name: nextPresence.activityName,
        type: nextPresence.activityType,
        url: nextPresence.activityUrl,
        status: nextPresence.status,
      });
    }

    return this.getProfile(botId);
  }
}
