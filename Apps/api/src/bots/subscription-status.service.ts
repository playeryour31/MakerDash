import { Injectable } from '@nestjs/common';
import {
  GRACE_DAYS,
  RENEW_WITHIN_DAYS,
  WARN_DAYS,
  describeSubscription,
  formatBotDate,
  graceUntilFor,
  parseSubscriptionDate,
  phaseForEndTime,
  type SubscriptionInfo,
  type SubscriptionPhase,
} from '@maker/subscriptions';
import { PrismaService } from '../prisma/prisma.service';

export type SubscriptionStatus = SubscriptionPhase;
export type { SubscriptionInfo };

/**
 * Subscription view for the dashboard.
 *
 * The policy itself lives in `@maker/subscriptions` — the same module the
 * Discord bot uses, so "3 warn days / 3 grace days" cannot drift between the
 * two runtimes. What remains here is only what the API owns: prices and the
 * Prisma reads behind grace snapshots.
 */
@Injectable()
export class SubscriptionStatusService {
  constructor(private readonly prisma: PrismaService) {}

  WARN_DAYS = WARN_DAYS;
  GRACE_DAYS = GRACE_DAYS;
  RENEW_WITHIN_DAYS = RENEW_WITHIN_DAYS;

  parseEnd = parseSubscriptionDate;
  formatBotDate = formatBotDate;

  phaseForEndTime(endTime?: string | Date | null, now = new Date()): SubscriptionStatus | null {
    return phaseForEndTime(endTime, now);
  }

  graceUntilFromEnd(endTime?: string | Date | null): Date | null {
    const end = parseSubscriptionDate(endTime);
    return end ? graceUntilFor(end) : null;
  }

  /** Build subscription fields for a bot record (Tokens / grace snapshot / PG). */
  describe(
    bot: {
      endTime?: string | null;
      endsAt?: Date | string | null;
      graceUntil?: string | Date | null;
      status?: string | null;
      meta?: any;
      Server?: string | null;
      guild?: string | null;
      Type?: string | null;
      type?: string | null;
    },
    opts?: { renewPrice?: number | null; forceGrace?: boolean },
  ): SubscriptionInfo {
    return describeSubscription(bot, {
      renewPrice: opts?.renewPrice ?? null,
      forceGrace: opts?.forceGrace,
    });
  }

  async getRenewPrice(type: string, guildId: string | null): Promise<number> {
    const t = String(type || 'System');
    const gid = String(guildId || '').trim();
    if (!gid) return 100;
    const key = `${t}P_${gid}`;
    try {
      const row = await this.prisma.guildBotPrice.findUnique({
        where: { guildId_priceKey: { guildId: gid, priceKey: key } },
      });
      if (row && Number.isFinite(row.price)) return Number(row.price);
    } catch {
      /* fallback */
    }
    return 100;
  }

  /**
   * Grace snapshots from Postgres (`platform_records`, namespace `expired`).
   *
   * The bot process writes these as `Grace_<clientId>` plus the `GraceBots`
   * array. This used to load `Expired.json` through a dynamic require, which
   * never worked inside the API process — its platform cache is never hydrated,
   * so the read silently returned nothing and every request paid the cost.
   */
  async listGraceSnapshots(): Promise<any[]> {
    const rows = await this.prisma.platformRecord.findMany({
      where: {
        namespace: 'expired',
        OR: [{ key: 'GraceBots' }, { key: { startsWith: 'Grace_' } }],
      },
      select: { key: true, value: true },
    });

    const byId = new Map<string, any>();
    for (const row of rows) {
      if (row.key === 'GraceBots' && Array.isArray(row.value)) {
        for (const snap of row.value as any[]) {
          if (snap && snap.ClientID != null) byId.set(String(snap.ClientID), snap);
        }
      }
    }
    // Direct `Grace_<id>` rows win: the legacy reader checked them first.
    for (const row of rows) {
      if (!row.key.startsWith('Grace_')) continue;
      if (row.value && typeof row.value === 'object') {
        byId.set(row.key.slice('Grace_'.length), row.value);
      }
    }
    return [...byId.values()];
  }

  /** PG + store grace bots owned by this Discord user (still within grace). */
  async listGraceBotsForOwner(discordId: string): Promise<any[]> {
    const id = String(discordId);
    const byId = new Map<string, any>();

    for (const snap of await this.listGraceSnapshots()) {
      const owner = Array.isArray(snap.Owner) ? snap.Owner[0] : snap.Owner;
      const buyer = snap.Buyer ? String(snap.Buyer) : '';
      if (String(owner) !== id && buyer !== id) continue;
      const info = this.describe(snap, { forceGrace: true });
      if (info.subscriptionStatus !== 'grace') continue;
      byId.set(String(snap.ClientID), { ...snap, __sub: info });
    }

    const rows = await this.prisma.botInstance.findMany({
      where: {
        OR: [{ ownerId: id }, { buyerId: id }],
      },
    });

    for (const row of rows) {
      if (byId.has(row.clientId)) continue;
      const meta =
        row.meta && typeof row.meta === 'object' ? (row.meta as Record<string, unknown>) : {};
      const legacy = {
        ClientID: row.clientId,
        Type: row.type,
        Owner: row.ownerId,
        Buyer: row.buyerId || row.ownerId,
        Server: row.serverId || row.guildId,
        guild: row.guildId || row.serverId,
        endTime: row.endsAt ? formatBotDate(row.endsAt) : null,
        graceUntil: (meta.graceUntil as string | Date | null) || null,
        status: meta.status != null ? String(meta.status) : null,
        meta,
        TokenType: row.tokenType,
      };
      const info = this.describe(legacy, {
        forceGrace: meta.status === 'grace' || meta.grace === true,
      });
      if (info.subscriptionStatus === 'grace') {
        byId.set(row.clientId, { ...legacy, __sub: info });
      }
    }

    return [...byId.values()];
  }

  /** True when Expired_* purge marker exists (bot must not appear on dashboard). */
  async isPermanentlyPurged(clientId: string): Promise<boolean> {
    const id = String(clientId);
    try {
      const row = await this.prisma.platformRecord.findFirst({
        where: { namespace: 'expired', key: `Expired_${id}` },
        select: { id: true },
      });
      return Boolean(row);
    } catch {
      return false;
    }
  }
}
