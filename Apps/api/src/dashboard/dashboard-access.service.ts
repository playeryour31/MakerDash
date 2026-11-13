import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { DashboardAccessRepository } from '../prisma/repositories/dashboard-access.repository';

export type DashboardAccessRecord = {
  slug: string;
  clientId: string;
  type: string;
  ownerId: string | null;
  guildId: string | null;
  purchasesId: number | string | null;
  createdAt: string;
  dashboardUrl: string;
  inviteUrl: string;
};

@Injectable()
export class DashboardAccessService {
  constructor(private readonly repo: DashboardAccessRepository) {}

  private baseUrl() {
    return (
      process.env.DASHBOARD_PUBLIC_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:4084'
    ).replace(/\/$/, '');
  }

  private decorate(row: {
    slug: string;
    clientId: string;
    type: string;
    ownerId: string | null;
    guildId: string | null;
    purchasesId: string | null;
    createdAt: Date;
  } | null): DashboardAccessRecord | null {
    if (!row?.slug) return null;
    let purchasesId: string | number | null = row.purchasesId;
    if (purchasesId != null && /^\d+$/.test(String(purchasesId))) {
      purchasesId = Number(purchasesId);
    }
    return {
      slug: row.slug,
      clientId: row.clientId,
      type: row.type,
      ownerId: row.ownerId,
      guildId: row.guildId,
      purchasesId,
      createdAt: row.createdAt.toISOString(),
      dashboardUrl: `${this.baseUrl()}/b/${row.slug}`,
      inviteUrl: (() => {
        const base = `https://discord.com/api/oauth2/authorize?client_id=${row.clientId}&permissions=8&scope=bot%20applications.commands`;
        return row.guildId
          ? `${base}&guild_id=${encodeURIComponent(String(row.guildId))}&disable_guild_select=true`
          : base;
      })(),
    };
  }

  async ensureAccess(input: {
    clientId: string;
    type?: string;
    ownerId?: string | null;
    purchasesId?: number | string | null;
    guildId?: string | null;
    preferredSlug?: string | null;
  }): Promise<DashboardAccessRecord> {
    const clientId = String(input.clientId);
    const existing = await this.repo.findByClientId(clientId);
    if (existing) {
      const nextType = input.type ? String(input.type) : existing.type;
      const nextOwner =
        input.ownerId != null && input.ownerId !== ''
          ? String(input.ownerId)
          : existing.ownerId;
      const nextGuild =
        input.guildId != null && input.guildId !== ''
          ? String(input.guildId)
          : existing.guildId;
      const nextPurchases =
        input.purchasesId != null && input.purchasesId !== ''
          ? input.purchasesId
          : existing.purchasesId;
      const needsUpdate =
        (input.type && nextType !== existing.type) ||
        (input.ownerId && !existing.ownerId) ||
        (input.ownerId &&
          existing.ownerId &&
          String(input.ownerId) !== String(existing.ownerId)) ||
        (input.guildId && String(nextGuild || '') !== String(existing.guildId || '')) ||
        (input.purchasesId != null &&
          String(nextPurchases ?? '') !== String(existing.purchasesId ?? ''));
      if (needsUpdate) {
        const updated = await this.repo.upsert({
          slug: existing.slug,
          clientId,
          type: nextType,
          ownerId: nextOwner,
          guildId: nextGuild,
          purchasesId: nextPurchases,
        });
        return this.decorate(updated)!;
      }
      return this.decorate(existing)!;
    }

    // Prefer caller slug, else recover from legacy JSON Access.json
    let slug =
      input.preferredSlug ||
      this.readLegacySlug(clientId) ||
      randomBytes(18).toString('base64url');

    // If preferred slug already belongs to another client, mint a new one
    const bySlug = await this.repo.findBySlug(String(slug));
    if (bySlug && String(bySlug.clientId) !== clientId) {
      slug = randomBytes(18).toString('base64url');
    }

    const row = await this.repo.upsert({
      slug: String(slug),
      clientId,
      type: String(input.type || 'Apply'),
      ownerId: input.ownerId ?? null,
      guildId: input.guildId ?? null,
      purchasesId: input.purchasesId ?? null,
    });
    return this.decorate(row)!;
  }

  /** Legacy Discord purchase path wrote Database/Dashboard/Access.json only. */
  private readLegacySlug(clientId: string): string | null {
    try {
      const fs = require('fs') as typeof import('fs');
      const path = require('path') as typeof import('path');
      const file = path.resolve(
        process.cwd(),
        'Database',
        'Dashboard',
        'Access.json',
      );
      if (!fs.existsSync(file)) return null;
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
      const slug = raw?.byClientId?.[String(clientId)];
      return slug ? String(slug) : null;
    } catch {
      return null;
    }
  }

  private readLegacyBySlug(slug: string): {
    slug: string;
    clientId: string;
    type: string;
    ownerId: string | null;
    guildId: string | null;
    purchasesId: string | number | null;
  } | null {
    try {
      const fs = require('fs') as typeof import('fs');
      const path = require('path') as typeof import('path');
      const file = path.resolve(
        process.cwd(),
        'Database',
        'Dashboard',
        'Access.json',
      );
      if (!fs.existsSync(file)) return null;
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
      const rec = raw?.bySlug?.[String(slug)];
      if (!rec?.clientId) return null;
      return {
        slug: String(rec.slug || slug),
        clientId: String(rec.clientId),
        type: String(rec.type || 'Apply'),
        ownerId: rec.ownerId ? String(rec.ownerId) : null,
        guildId: rec.guildId ? String(rec.guildId) : null,
        purchasesId: rec.purchasesId ?? null,
      };
    } catch {
      return null;
    }
  }

  async getBySlug(slug: string): Promise<DashboardAccessRecord | null> {
    const fromPg = this.decorate(await this.repo.findBySlug(String(slug)));
    if (fromPg) return fromPg;

    // Heal: import legacy JSON link into Postgres so Discord purchase links work
    const legacy = this.readLegacyBySlug(String(slug));
    if (!legacy) return null;
    try {
      return await this.ensureAccess({
        clientId: legacy.clientId,
        type: legacy.type,
        ownerId: legacy.ownerId,
        guildId: legacy.guildId,
        purchasesId: legacy.purchasesId,
        preferredSlug: legacy.slug,
      });
    } catch {
      return null;
    }
  }

  async getByClientId(clientId: string): Promise<DashboardAccessRecord | null> {
    return this.decorate(await this.repo.findByClientId(String(clientId)));
  }

  async requireBySlug(slug: string): Promise<DashboardAccessRecord> {
    const record = await this.getBySlug(slug);
    if (!record) throw new NotFoundException('Invalid dashboard link');
    return record;
  }

  async listAll(): Promise<DashboardAccessRecord[]> {
    const rows = await this.repo.listAll();
    return rows.map((r) => this.decorate(r)!).filter(Boolean);
  }

  fingerprint(value: string) {
    return createHash('sha256').update(value).digest('hex').slice(0, 12);
  }
}
