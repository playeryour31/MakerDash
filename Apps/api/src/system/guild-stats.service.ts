import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApplyStoreService } from '../apply/apply-store.service';
import { SystemService } from './system.service';

export type GuildStatsSeriesPoint = {
  day: string;
  messages: number;
  joins: number;
  leaves: number;
  net: number;
};

export type GuildStatsResponse = {
  botId: string;
  guildId: string | null;
  range: number;
  members: number | null;
  last24h: { messages: number; joins: number; leaves: number };
  series: GuildStatsSeriesPoint[];
};

@Injectable()
export class GuildStatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly system: SystemService,
    private readonly store: ApplyStoreService,
  ) {}

  private utcDayString(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private startOfUtcDay(d: Date): Date {
    return new Date(`${this.utcDayString(d)}T00:00:00.000Z`);
  }

  private daysBack(range: number): Date[] {
    const out: Date[] = [];
    const today = this.startOfUtcDay(new Date());
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - i);
      out.push(d);
    }
    return out;
  }

  private async fetchDiscordMemberCount(
    botId: string,
    guildId: string,
  ): Promise<number | null> {
    try {
      const bot =
        (await this.store.getBotAsync(botId)) || this.store.getBot(botId);
      const token = String(bot?.Token || '').trim();
      if (!token || !guildId) return null;
      const res = await fetch(
        `https://discord.com/api/v10/guilds/${guildId}?with_counts=true`,
        { headers: { Authorization: `Bot ${token}` } },
      );
      if (!res.ok) return null;
      const data = (await res.json()) as {
        approximate_member_count?: number;
        member_count?: number;
      };
      const n =
        data.approximate_member_count ?? data.member_count ?? null;
      return n != null && Number.isFinite(Number(n))
        ? Math.max(0, Math.floor(Number(n)))
        : null;
    } catch {
      return null;
    }
  }

  async getStats(
    botId: string,
    rangeRaw?: string | number,
  ): Promise<GuildStatsResponse> {
    const bot = await this.system.ensureSystemBot(botId);
    const guildIdRaw = bot?.Server || bot?.guild || null;
    const guildId = guildIdRaw ? String(guildIdRaw) : null;

    let range = Number(rangeRaw);
    if (!Number.isFinite(range) || range <= 0) range = 7;
    if (range !== 30) range = 7;

    const empty: GuildStatsResponse = {
      botId,
      guildId,
      range,
      members: null,
      last24h: { messages: 0, joins: 0, leaves: 0 },
      series: this.daysBack(range).map((d) => ({
        day: this.utcDayString(d),
        messages: 0,
        joins: 0,
        leaves: 0,
        net: 0,
      })),
    };

    if (!guildId) return empty;

    const days = this.daysBack(range);
    const from = days[0];
    const to = new Date(days[days.length - 1]);
    to.setUTCDate(to.getUTCDate() + 1);

    const rows = await this.prisma.guildDailyStat.findMany({
      where: {
        botClientId: botId,
        guildId,
        day: { gte: from, lt: to },
      },
      orderBy: { day: 'asc' },
    });

    const byDay = new Map<
      string,
      { messages: number; joins: number; leaves: number; memberCount: number | null }
    >();
    for (const row of rows) {
      const key = this.utcDayString(new Date(row.day));
      byDay.set(key, {
        messages: row.messages || 0,
        joins: row.joins || 0,
        leaves: row.leaves || 0,
        memberCount: row.memberCount,
      });
    }

    const series: GuildStatsSeriesPoint[] = days.map((d) => {
      const key = this.utcDayString(d);
      const hit = byDay.get(key);
      const messages = hit?.messages || 0;
      const joins = hit?.joins || 0;
      const leaves = hit?.leaves || 0;
      return {
        day: key,
        messages,
        joins,
        leaves,
        net: joins - leaves,
      };
    });

    // last24h ≈ today's UTC counters (daily bucket; matches plan "24h" KPI)
    const todayKey = this.utcDayString(new Date());
    const today = byDay.get(todayKey);
    const last24h = {
      messages: today?.messages || 0,
      joins: today?.joins || 0,
      leaves: today?.leaves || 0,
    };

    let members = await this.fetchDiscordMemberCount(botId, guildId);
    if (members == null) {
      for (let i = series.length - 1; i >= 0; i--) {
        const key = series[i].day;
        const mc = byDay.get(key)?.memberCount;
        if (mc != null) {
          members = mc;
          break;
        }
      }
    }

    return { botId, guildId, range, members, last24h, series };
  }
}
