import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PlatformRepository } from '../prisma/repositories/platform.repository';

export type BotAdminStatus = 'pending' | 'accepted' | 'revoked';

export type BotAdminRecord = {
  slug: string;
  clientId: string;
  email: string;
  status: BotAdminStatus;
  discordUserId: string | null;
  invitedBy: string;
  createdAt: string;
  acceptedAt: string | null;
  inviteUrl: string;
};

type Index = {
  bySlug: Record<string, Omit<BotAdminRecord, 'inviteUrl'>>;
  byClientId: Record<string, string[]>;
  byDiscordUserId: Record<string, string[]>;
};

const NS = 'dashboard_bot_admins';
const INDEX_KEY = '__index__';

@Injectable()
export class BotAdminsService {
  constructor(private readonly platform: PlatformRepository) {}

  private baseUrl() {
    return (
      process.env.DASHBOARD_PUBLIC_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:4084'
    ).replace(/\/$/, '');
  }

  private decorate(
    record: Omit<BotAdminRecord, 'inviteUrl'> | null | undefined,
  ): BotAdminRecord | null {
    if (!record?.slug) return null;
    return {
      ...record,
      inviteUrl: `${this.baseUrl()}/a/${record.slug}`,
    };
  }

  private emptyIndex(): Index {
    return { bySlug: {}, byClientId: {}, byDiscordUserId: {} };
  }

  private async readIndex(): Promise<Index> {
    const raw = await this.platform.get(NS, INDEX_KEY);
    if (!raw || typeof raw !== 'object') return this.emptyIndex();
    const obj = raw as any;
    return {
      bySlug: obj.bySlug && typeof obj.bySlug === 'object' ? obj.bySlug : {},
      byClientId:
        obj.byClientId && typeof obj.byClientId === 'object'
          ? obj.byClientId
          : {},
      byDiscordUserId:
        obj.byDiscordUserId && typeof obj.byDiscordUserId === 'object'
          ? obj.byDiscordUserId
          : {},
    };
  }

  private async writeIndex(index: Index) {
    await this.platform.set(NS, INDEX_KEY, {
      bySlug: index.bySlug || {},
      byClientId: index.byClientId || {},
      byDiscordUserId: index.byDiscordUserId || {},
    });
  }

  private normalizeEmail(email: string) {
    return String(email || '')
      .trim()
      .toLowerCase();
  }

  async listForBot(clientId: string): Promise<BotAdminRecord[]> {
    const index = await this.readIndex();
    const slugs = index.byClientId[String(clientId)] || [];
    return slugs
      .map((s) => this.decorate(index.bySlug[s]))
      .filter((r): r is BotAdminRecord => !!r && r.status !== 'revoked');
  }

  async getByInviteSlug(slug: string): Promise<BotAdminRecord | null> {
    const record = (await this.readIndex()).bySlug[String(slug)];
    return this.decorate(record);
  }

  async adminBotIdsForUser(discordUserId: string): Promise<string[]> {
    const index = await this.readIndex();
    const id = String(discordUserId);
    const clientIds = new Set<string>();
    for (const record of Object.values(index.bySlug)) {
      if (
        record &&
        record.status === 'accepted' &&
        String(record.discordUserId || '') === id
      ) {
        clientIds.add(String(record.clientId));
      }
    }
    for (const cid of index.byDiscordUserId[id] || []) {
      clientIds.add(String(cid));
    }
    return [...clientIds];
  }

  async isAcceptedAdmin(discordUserId: string, clientId: string) {
    return (await this.adminBotIdsForUser(discordUserId)).includes(
      String(clientId),
    );
  }

  async invite(input: {
    clientId: string;
    email: string;
    invitedBy: string;
  }): Promise<BotAdminRecord> {
    const email = this.normalizeEmail(input.email);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Invalid email');
    }
    const clientId = String(input.clientId);
    const index = await this.readIndex();
    const existingSlugs = index.byClientId[clientId] || [];

    for (const s of existingSlugs) {
      const rec = index.bySlug[s];
      if (
        rec &&
        rec.status !== 'revoked' &&
        this.normalizeEmail(rec.email) === email
      ) {
        return this.decorate(rec)!;
      }
    }

    const slug = randomBytes(18).toString('base64url');
    const record = {
      slug,
      clientId,
      email,
      status: 'pending' as const,
      discordUserId: null,
      invitedBy: String(input.invitedBy),
      createdAt: new Date().toISOString(),
      acceptedAt: null,
    };
    index.bySlug[slug] = record;
    index.byClientId[clientId] = [...existingSlugs, slug];
    await this.writeIndex(index);
    return this.decorate(record)!;
  }

  async acceptInvite(slug: string, discordUserId: string): Promise<BotAdminRecord> {
    const index = await this.readIndex();
    const record = index.bySlug[String(slug)];
    if (!record || record.status === 'revoked') {
      throw new NotFoundException('Invalid admin invite');
    }
    const uid = String(discordUserId);

    if (record.status === 'accepted') {
      if (String(record.discordUserId || '') !== uid) {
        throw new BadRequestException('Invite already used by another account');
      }
      return this.decorate(record)!;
    }

    record.status = 'accepted';
    record.discordUserId = uid;
    record.acceptedAt = new Date().toISOString();
    index.bySlug[slug] = record;

    const list = new Set(index.byDiscordUserId[uid] || []);
    list.add(String(record.clientId));
    index.byDiscordUserId[uid] = [...list];

    await this.writeIndex(index);
    return this.decorate(record)!;
  }

  async revoke(clientId: string, slug: string): Promise<BotAdminRecord> {
    const index = await this.readIndex();
    const record = index.bySlug[String(slug)];
    if (!record || String(record.clientId) !== String(clientId)) {
      throw new NotFoundException('Admin invite not found');
    }
    record.status = 'revoked';
    index.bySlug[slug] = record;

    if (record.discordUserId) {
      const uid = String(record.discordUserId);
      index.byDiscordUserId[uid] = (index.byDiscordUserId[uid] || []).filter(
        (id) => String(id) !== String(clientId),
      );
    }

    await this.writeIndex(index);
    return this.decorate(record)!;
  }
}
