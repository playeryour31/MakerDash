import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SystemService } from './system.service';
import { SystemFeaturesService } from './system-features.service';
import {
  normalizeLevelingSettings,
  xpForNextLevel,
  type LevelingSettings,
} from './leveling.defaults';

export type LevelingUserRow = {
  userId: string;
  xp: number;
  level: number;
  rank: number | null;
  xpToNext: number;
  progressXp: number;
  updatedAt: string | null;
};

@Injectable()
export class LevelingUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly system: SystemService,
    private readonly features: SystemFeaturesService,
  ) {}

  private async settings(botId: string): Promise<LevelingSettings> {
    const { settings } = await this.features.getFeature(botId, 'leveling');
    return normalizeLevelingSettings(settings);
  }

  private async guildId(botId: string): Promise<string> {
    const bot = await this.system.ensureSystemBot(botId);
    const gid = String(bot?.Server || bot?.guild || '').trim();
    if (!gid) throw new BadRequestException('Bot is not linked to a guild');
    return gid;
  }

  private snowflake(id: string) {
    const s = String(id || '').trim();
    if (!/^\d{5,32}$/.test(s)) {
      throw new BadRequestException('Invalid Discord user ID');
    }
    return s;
  }

  private progressOf(
    xp: number,
    level: number,
    settings: LevelingSettings,
  ): { xpToNext: number; progressXp: number } {
    let remaining = Math.max(0, xp);
    let lvl = 0;
    // Recompute level from total XP for consistency
    while (lvl < 10000) {
      const need = xpForNextLevel(lvl, settings);
      if (remaining < need) {
        return { xpToNext: need, progressXp: remaining };
      }
      remaining -= need;
      lvl += 1;
    }
    return { xpToNext: xpForNextLevel(lvl, settings), progressXp: remaining };
  }

  private levelFromXp(xp: number, settings: LevelingSettings): number {
    let remaining = Math.max(0, Math.floor(xp));
    let level = 0;
    while (level < 10000) {
      const need = xpForNextLevel(level, settings);
      if (remaining < need) break;
      remaining -= need;
      level += 1;
    }
    return level;
  }

  private totalXpForLevel(level: number, settings: LevelingSettings): number {
    let total = 0;
    const target = Math.max(0, Math.floor(level));
    for (let i = 0; i < target; i += 1) {
      const need = xpForNextLevel(i, settings);
      if (total + need > Number.MAX_SAFE_INTEGER) {
        return Number.MAX_SAFE_INTEGER;
      }
      total += need;
    }
    return total;
  }

  /** Highest level whose cumulative XP stays within JS safe integer. */
  private maxSafeLevel(settings: LevelingSettings): number {
    let total = 0;
    for (let i = 0; i < 10000; i += 1) {
      const need = xpForNextLevel(i, settings);
      if (total + need > Number.MAX_SAFE_INTEGER) return i;
      total += need;
    }
    return 10000;
  }

  private toXpNumber(value: unknown): number {
    if (typeof value === 'bigint') {
      if (value > BigInt(Number.MAX_SAFE_INTEGER)) return Number.MAX_SAFE_INTEGER;
      if (value < BigInt(0)) return 0;
      return Number(value);
    }
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(Number.MAX_SAFE_INTEGER, Math.floor(n));
  }

  private toXpBigInt(value: number): bigint {
    const n = Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(Number(value) || 0)));
    return BigInt(n);
  }

  async listUsers(
    botId: string,
    opts: { q?: string; limit?: number; offset?: number } = {},
  ) {
    await this.system.ensureSystemBot(botId);
    const guildId = await this.guildId(botId);
    const settings = await this.settings(botId);
    const limit = Math.min(100, Math.max(1, Number(opts.limit) || 25));
    const offset = Math.max(0, Number(opts.offset) || 0);
    const q = String(opts.q || '').trim();

    const where: any = { botClientId: String(botId), guildId };
    if (q) {
      where.userId = { contains: q };
    }

    const [rows, total] = await Promise.all([
      this.prisma.guildMemberXp.findMany({
        where,
        orderBy: [{ xp: 'desc' }, { updatedAt: 'desc' }],
        take: limit,
        skip: offset,
      }),
      this.prisma.guildMemberXp.count({ where }),
    ]);

    const users: LevelingUserRow[] = rows.map((row, i) => {
      const xp = this.toXpNumber(row.xp);
      const prog = this.progressOf(xp, row.level, settings);
      return {
        userId: row.userId,
        xp,
        level: row.level,
        rank: offset + i + 1,
        xpToNext: prog.xpToNext,
        progressXp: prog.progressXp,
        updatedAt: row.updatedAt?.toISOString?.() || null,
      };
    });

    return { botId, guildId, total, users, settingsHint: { enabled: settings.enabled } };
  }

  async getUser(botId: string, userId: string) {
    await this.system.ensureSystemBot(botId);
    const guildId = await this.guildId(botId);
    const settings = await this.settings(botId);
    const uid = this.snowflake(userId);
    const row = await this.prisma.guildMemberXp.findUnique({
      where: {
        botClientId_guildId_userId: {
          botClientId: String(botId),
          guildId,
          userId: uid,
        },
      },
    });
    if (!row) {
      return {
        userId: uid,
        xp: 0,
        level: 0,
        rank: null,
        xpToNext: xpForNextLevel(0, settings),
        progressXp: 0,
        updatedAt: null,
      } satisfies LevelingUserRow;
    }
    const higher = await this.prisma.guildMemberXp.count({
      where: {
        botClientId: String(botId),
        guildId,
        xp: { gt: row.xp },
      },
    });
    const xp = this.toXpNumber(row.xp);
    const prog = this.progressOf(xp, row.level, settings);
    return {
      userId: row.userId,
      xp,
      level: row.level,
      rank: higher + 1,
      xpToNext: prog.xpToNext,
      progressXp: prog.progressXp,
      updatedAt: row.updatedAt?.toISOString?.() || null,
    } satisfies LevelingUserRow;
  }

  async mutateUser(
    botId: string,
    userId: string,
    body: {
      action: 'add_xp' | 'remove_xp' | 'set_xp' | 'set_level' | 'reset';
      amount?: number;
    },
  ) {
    await this.system.ensureSystemBot(botId);
    const guildId = await this.guildId(botId);
    const settings = await this.settings(botId);
    const uid = this.snowflake(userId);
    const action = body?.action;
    if (
      !action ||
      !['add_xp', 'remove_xp', 'set_xp', 'set_level', 'reset'].includes(action)
    ) {
      throw new BadRequestException('Invalid action');
    }

    const existing = await this.prisma.guildMemberXp.findUnique({
      where: {
        botClientId_guildId_userId: {
          botClientId: String(botId),
          guildId,
          userId: uid,
        },
      },
    });

    let xp = this.toXpNumber(existing?.xp ?? 0);
    let level = existing?.level ?? 0;

    if (action === 'reset') {
      xp = 0;
      level = 0;
    } else if (action === 'add_xp') {
      const amount = Math.round(Number(body.amount));
      if (!Number.isFinite(amount) || amount < 1 || amount > 1_000_000) {
        throw new BadRequestException('amount must be 1–1000000');
      }
      xp = Math.min(Number.MAX_SAFE_INTEGER, xp + amount);
      level = this.levelFromXp(xp, settings);
    } else if (action === 'remove_xp') {
      const amount = Math.round(Number(body.amount));
      if (!Number.isFinite(amount) || amount < 1 || amount > 1_000_000) {
        throw new BadRequestException('amount must be 1–1000000');
      }
      xp = Math.max(0, xp - amount);
      level = this.levelFromXp(xp, settings);
    } else if (action === 'set_xp') {
      const amount = Math.round(Number(body.amount));
      if (!Number.isFinite(amount) || amount < 0 || amount > 50_000_000) {
        throw new BadRequestException('amount must be 0–50000000');
      }
      xp = amount;
      level = this.levelFromXp(xp, settings);
    } else if (action === 'set_level') {
      const amount = Math.round(Number(body.amount));
      const maxLevel = Math.min(10000, this.maxSafeLevel(settings));
      if (!Number.isFinite(amount) || amount < 0 || amount > maxLevel) {
        throw new BadRequestException(
          `level must be 0–${maxLevel} for the current XP curve (higher levels overflow safe XP)`,
        );
      }
      level = amount;
      xp = this.totalXpForLevel(level, settings);
    }

    const xpDb = this.toXpBigInt(xp);
    await this.prisma.guildMemberXp.upsert({
      where: {
        botClientId_guildId_userId: {
          botClientId: String(botId),
          guildId,
          userId: uid,
        },
      },
      create: {
        botClientId: String(botId),
        guildId,
        userId: uid,
        xp: xpDb,
        level,
      },
      update: { xp: xpDb, level },
    });

    return this.getUser(botId, uid);
  }

  async leaderboard(botId: string, limit = 10) {
    await this.system.ensureSystemBot(botId);
    const guildId = await this.guildId(botId);
    const settings = await this.settings(botId);
    if (!settings.leaderboard.enabled) {
      throw new NotFoundException('Leaderboard is disabled');
    }
    const take = Math.min(
      settings.leaderboard.displayCount,
      Math.max(1, limit),
    );
    const orderBy =
      settings.leaderboard.sortBy === 'level'
        ? [{ level: 'desc' as const }, { xp: 'desc' as const }]
        : [{ xp: 'desc' as const }, { level: 'desc' as const }];

    const excluded = new Set(settings.leaderboard.excludedUserIds || []);
    const rows = await this.prisma.guildMemberXp.findMany({
      where: {
        botClientId: String(botId),
        guildId,
        ...(excluded.size
          ? { userId: { notIn: [...excluded] } }
          : {}),
      },
      orderBy,
      take,
    });

    return {
      botId,
      guildId,
      users: rows.map((row, i) => ({
        userId: row.userId,
        xp: this.toXpNumber(row.xp),
        level: row.level,
        rank: i + 1,
      })),
    };
  }
}
