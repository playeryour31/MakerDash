import { Injectable } from '@nestjs/common';
import { createRequire } from 'module';
import { PrismaService } from '../prisma/prisma.service';

const requireFromHere = createRequire(__filename);

export type SubscriptionStatus = 'active' | 'warn' | 'grace' | 'expired';

export type SubscriptionInfo = {
  subscriptionStatus: SubscriptionStatus;
  endTime: string | null;
  graceUntil: string | null;
  graceMsLeft: number;
  graceDaysLeft: number;
  locked: boolean;
  renewable: boolean;
  renewPrice: number | null;
};

const WARN_DAYS = 3;
const GRACE_DAYS = 3;
const RENEW_WITHIN_DAYS = 10;

function parseEnd(value?: string | Date | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const d = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatBotDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

@Injectable()
export class SubscriptionStatusService {
  constructor(private readonly prisma: PrismaService) {}

  phaseForEndTime(
    endTime?: string | Date | null,
    now = new Date(),
  ): SubscriptionStatus | null {
    const end = parseEnd(endTime);
    if (!end) return null;
    const warnAt = new Date(end.getTime() - WARN_DAYS * 86_400_000);
    const graceUntil = new Date(end.getTime() + GRACE_DAYS * 86_400_000);
    if (now < warnAt) return 'active';
    if (now < end) return 'warn';
    if (now < graceUntil) return 'grace';
    return 'expired';
  }

  graceUntilFromEnd(endTime?: string | Date | null): Date | null {
    const end = parseEnd(endTime);
    if (!end) return null;
    return new Date(end.getTime() + GRACE_DAYS * 86_400_000);
  }

  /**
   * Build subscription fields for a bot record (Tokens / grace snapshot / PG).
   */
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
    const endRaw = bot.endTime || bot.endsAt || null;
    const end = parseEnd(endRaw);
    const meta = bot.meta && typeof bot.meta === 'object' ? bot.meta : {};
    const metaGraceUntil = parseEnd(
      bot.graceUntil || meta.graceUntil || null,
    );
    const forceGrace =
      opts?.forceGrace ||
      bot.status === 'grace' ||
      meta.status === 'grace' ||
      meta.grace === true;

    let phase = this.phaseForEndTime(end);
    if (forceGrace && phase !== 'expired') {
      phase = 'grace';
    }
    if (!phase) {
      phase = forceGrace ? 'grace' : 'active';
    }

    const graceUntil =
      metaGraceUntil ||
      (end ? this.graceUntilFromEnd(end) : null) ||
      null;

    const now = Date.now();
    const graceMsLeft =
      phase === 'grace' && graceUntil
        ? Math.max(0, graceUntil.getTime() - now)
        : 0;
    const graceDaysLeft =
      graceMsLeft > 0 ? Math.ceil(graceMsLeft / 86_400_000) : 0;

    const daysToEnd = end
      ? Math.floor((end.getTime() - now) / 86_400_000)
      : Number.POSITIVE_INFINITY;

    const locked = phase === 'grace' || phase === 'expired';
    const renewable =
      phase === 'grace' ||
      (phase === 'warn' && daysToEnd < RENEW_WITHIN_DAYS) ||
      (phase === 'active' && daysToEnd < RENEW_WITHIN_DAYS);

    return {
      subscriptionStatus: phase,
      endTime: end ? formatBotDate(end) : endRaw ? String(endRaw) : null,
      graceUntil: graceUntil ? formatBotDate(graceUntil) : null,
      graceMsLeft,
      graceDaysLeft,
      locked,
      renewable: Boolean(renewable && phase !== 'expired'),
      renewPrice: opts?.renewPrice ?? null,
    };
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

  /** Grace snapshots from Expired.json (GraceBots / Grace_*). */
  listGraceSnapshotsFromDisk(): any[] {
    try {
      const { Database } = requireFromHere(
        '../../../../src/shared/services/mainDb',
      );
      const db222 = new Database('/Database/Others/Expired.json');
      const arr = db222.get('GraceBots');
      if (Array.isArray(arr)) return arr.filter(Boolean);
    } catch {
      /* optional */
    }
    return [];
  }

  /** PG + disk grace bots owned by this Discord user (still within grace). */
  async listGraceBotsForOwner(discordId: string): Promise<any[]> {
    const id = String(discordId);
    const byId = new Map<string, any>();

    for (const snap of this.listGraceSnapshotsFromDisk()) {
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
        row.meta && typeof row.meta === 'object'
          ? (row.meta as Record<string, unknown>)
          : {};
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

  formatBotDate = formatBotDate;
  parseEnd = parseEnd;
  WARN_DAYS = WARN_DAYS;
  GRACE_DAYS = GRACE_DAYS;
  RENEW_WITHIN_DAYS = RENEW_WITHIN_DAYS;

  /** True when Expired_* purge marker exists (bot must not appear on dashboard). */
  async isPermanentlyPurged(clientId: string): Promise<boolean> {
    const id = String(clientId);
    try {
      const { Database } = requireFromHere(
        '../../../../src/shared/services/mainDb',
      );
      const db222 = new Database('/Database/Others/Expired.json');
      if (db222.get(`Expired_${id}`)) return true;
    } catch {
      /* fall through */
    }
    try {
      const row = await this.prisma.platformRecord.findFirst({
        where: { namespace: 'expired', key: `Expired_${id}` },
      });
      if (row) return true;
    } catch {
      /* optional */
    }
    return false;
  }
}
