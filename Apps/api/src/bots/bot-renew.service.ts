import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createRequire } from 'module';
import { decryptBotToken } from '@maker/database';
import { PrismaService } from '../prisma/prisma.service';
import { ApplyStoreService } from '../apply/apply-store.service';
import { SubscriptionStatusService } from './subscription-status.service';

const requireFromHere = createRequire(__filename);

@Injectable()
export class BotRenewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly store: ApplyStoreService,
    private readonly subs: SubscriptionStatusService,
  ) {}

  private lifecycle() {
    return requireFromHere(
      '../../../../src/shared/services/subscriptionLifecycle',
    );
  }

  private mainDb() {
    return requireFromHere('../../../../src/shared/services/mainDb');
  }

  private balance() {
    return requireFromHere('../../../../src/shared/services/balanceService');
  }

  private deps() {
    const { Database } = this.mainDb();
    return {
      db2: new Database('/Database/Others/Tokens.json'),
      db222: new Database('/Database/Others/Expired.json'),
      rundb: new Database('./Database/BotMaker/RunBots.json'),
      tokenPoolDb: new Database('/Database/Others/UnusedTokens.json'),
    };
  }

  /** Restore when PG says grace but GraceBots snapshot is missing. */
  private async restoreWithoutSnapshot(
    bot: any,
    newEnd: string,
    deps: ReturnType<BotRenewService['deps']>,
  ) {
    const id = String(bot.ClientID);
    const restored = {
      ...bot,
      endTime: newEnd,
      warnedBefore: false,
    };
    delete restored.status;
    delete restored.grace;
    delete restored.graceUntil;
    delete restored.enteredGraceAt;
    delete restored.meta;

    const bots = deps.db2.get('Bots') || [];
    const list = Array.isArray(bots) ? bots : [];
    const without = list.filter((b: any) => String(b.ClientID) !== id);
    without.push(restored);
    await deps.db2.set('Bots', without);

    try {
      const lifecycle = this.lifecycle();
      // clearGraceSnapshot via restore path extras
      await deps.db222.delete?.(`Grace_${id}`);
      let arr = deps.db222.get('GraceBots');
      if (Array.isArray(arr)) {
        arr = arr.filter((b: any) => String(b.ClientID) !== id);
        await deps.db222.set('GraceBots', arr);
      }
      // Expired_ is set during grace in saveGraceSnapshot — clear so renew works
      await deps.db222.delete?.(`Expired_${id}`);
      void lifecycle;
    } catch {
      /* optional */
    }

    try {
      await this.prisma.botInstance.update({
        where: { clientId: id },
        data: {
          endsAt: this.subs.parseEnd(newEnd) || undefined,
          meta: {
            warnedBefore: false,
            grace: false,
            graceUntil: null,
            status: 'active',
          },
        },
      });
    } catch {
      /* optional */
    }

    if (deps.rundb) await deps.rundb.set(id, true);
    try {
      const { runtimes, bots: botsApi } = this.mainDb();
      await runtimes.setRunning(id, true);
      await botsApi.setAllBots(without);
    } catch {
      /* optional */
    }

    return restored;
  }

  async renew(botId: string, discordUserId: string) {
    const lifecycle = this.lifecycle();
    const deps = this.deps();
    const found = await lifecycle.findBotForRenew(
      botId,
      deps.db2,
      deps.db222,
    );
    let bot = found.bot;
    let source: string | null = found.source;

    if (!bot) {
      const row = await this.prisma.botInstance.findUnique({
        where: { clientId: String(botId) },
      });
      if (row) {
        const meta =
          row.meta && typeof row.meta === 'object'
            ? (row.meta as Record<string, unknown>)
            : {};
        let token: string | undefined;
        try {
          token = decryptBotToken(row.tokenEnc);
        } catch {
          token = undefined;
        }
        bot = {
          ClientID: row.clientId,
          Type: row.type,
          Owner: row.ownerId,
          Buyer: row.buyerId || row.ownerId,
          Server: row.serverId || row.guildId,
          guild: row.guildId || row.serverId,
          endTime: row.endsAt
            ? this.subs.formatBotDate(row.endsAt)
            : null,
          Token: token,
          TokenType: row.tokenType,
          meta,
          status: meta.status,
          graceUntil: meta.graceUntil,
        };
        const phase = this.subs.phaseForEndTime(bot.endTime);
        source =
          meta.status === 'grace' || phase === 'grace' ? 'grace' : 'active';
      }
    }

    if (!bot) throw new NotFoundException('Bot not found');

    // Fully purged: no Token, no PG row already handled; if Expired_ and no grace snap and no PG
    const graceSnap = lifecycle.getGraceSnapshot(deps.db222, botId);
    const pgRow = await this.prisma.botInstance.findUnique({
      where: { clientId: String(botId) },
      select: { clientId: true, meta: true },
    });
    if (!graceSnap && !pgRow && source !== 'active' && !found.bot) {
      throw new BadRequestException('Bot subscription was permanently deleted');
    }

    const ownerId = Array.isArray(bot.Owner) ? bot.Owner[0] : bot.Owner;
    const buyerId = bot.Buyer ? String(bot.Buyer) : '';
    if (
      String(ownerId) !== String(discordUserId) &&
      buyerId !== String(discordUserId)
    ) {
      throw new ForbiddenException('Not your bot');
    }

    const info = this.subs.describe(bot, {
      forceGrace: source === 'grace',
    });
    if (info.subscriptionStatus === 'expired') {
      throw new BadRequestException('Grace period ended — bot was deleted');
    }

    const end = this.subs.parseEnd(bot.endTime);
    const now = new Date();
    const daysLeft = end
      ? Math.floor((end.getTime() - now.getTime()) / 86_400_000)
      : -1;

    if (
      source !== 'grace' &&
      info.subscriptionStatus !== 'grace' &&
      daysLeft >= this.subs.RENEW_WITHIN_DAYS
    ) {
      throw new BadRequestException(
        `Renewal allowed only when fewer than ${this.subs.RENEW_WITHIN_DAYS} days remain (${daysLeft} left)`,
      );
    }

    const guildId = String(bot.Server || bot.guild || '').trim();
    if (!guildId) {
      throw new BadRequestException('Bot has no linked guild for billing');
    }

    const price = await this.subs.getRenewPrice(
      String(bot.Type || 'System'),
      guildId,
    );

    const { getUserBalance, addBalance } = this.balance();
    const balance = await getUserBalance(discordUserId, guildId);
    if (balance < price) {
      throw new BadRequestException(
        `Insufficient balance: need ${price}, have ${balance}`,
      );
    }

    await addBalance(discordUserId, guildId, -price);

    const RenewTime = 30;
    const base =
      !end || end.getTime() < now.getTime() ? new Date(now) : new Date(end);
    base.setDate(base.getDate() + RenewTime);
    const newEnd = this.subs.formatBotDate(base);

    const inGrace =
      source === 'grace' || info.subscriptionStatus === 'grace';

    if (inGrace) {
      if (graceSnap) {
        // clear Expired_ flag set during enterGrace so restore can complete cleanly
        try {
          await deps.db222.delete?.(`Expired_${botId}`);
        } catch {
          /* optional */
        }
        const result = await lifecycle.restoreFromGrace(
          botId,
          {
            endTime: newEnd,
            warnedBefore: false,
            Token: bot.Token || graceSnap.Token,
          },
          deps,
        );
        if (!result?.ok) {
          await this.restoreWithoutSnapshot(
            { ...graceSnap, ...bot },
            newEnd,
            deps,
          );
        }
      } else {
        await this.restoreWithoutSnapshot(bot, newEnd, deps);
      }
    } else {
      const bots = deps.db2.get('Bots') || [];
      const list = Array.isArray(bots) ? bots : [];
      const idx = list.findIndex(
        (b: any) => String(b.ClientID) === String(botId),
      );
      if (idx >= 0) {
        list[idx].endTime = newEnd;
        list[idx].warnedBefore = false;
        await deps.db2.set('Bots', list);
      }
      if (deps.rundb) await deps.rundb.set(botId, true);
      try {
        const { runtimes, bots: botsApi } = this.mainDb();
        await runtimes.setRunning(botId, true);
        await botsApi.setAllBots(list);
      } catch {
        /* optional */
      }
      try {
        await this.prisma.botInstance.update({
          where: { clientId: String(botId) },
          data: {
            endsAt: base,
            meta: {
              warnedBefore: false,
              grace: false,
              graceUntil: null,
              status: 'active',
            },
          },
        });
      } catch {
        /* optional */
      }
    }

    const refreshed =
      (await this.store.getBotAsync(botId)) ||
      this.store.getBot(botId) ||
      bot;
    const sub = this.subs.describe(
      { ...refreshed, endTime: newEnd },
      { renewPrice: price },
    );

    return {
      clientId: String(botId),
      type: refreshed.Type || bot.Type,
      endTime: newEnd,
      running: true,
      ...sub,
      deducted: price,
      balanceAfter: balance - price,
    };
  }
}
