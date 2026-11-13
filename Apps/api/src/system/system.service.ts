import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApplyStoreService } from '../apply/apply-store.service';
import { ApplyService } from '../apply/apply.service';

@Injectable()
export class SystemService {
  constructor(
    private readonly store: ApplyStoreService,
    private readonly apply: ApplyService,
  ) {}

  private isSystemType(bot: any): boolean {
    const t = String(bot?.Type || bot?.type || '')
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, '');
    return t === 'system' || t === 'sistem' || t === 'sys';
  }

  /** Prefer Postgres (partner/shop provision), fall back to legacy JSON. */
  async ensureSystemBot(botId: string) {
    const bot =
      (await this.store.getBotAsync(botId)) || this.store.getBot(botId);
    if (!bot) throw new NotFoundException('Bot not found');
    if (!this.isSystemType(bot)) {
      throw new ForbiddenException('Not a System bot');
    }
    return bot;
  }

  async overview(botId: string) {
    const bot = await this.ensureSystemBot(botId);
    const guildId = bot?.Server || bot?.guild || null;
    return {
      botId,
      type: 'System',
      running: await this.store.isRunningAsync(botId),
      guildId: guildId ? String(guildId) : null,
      bot: {
        ClientID: bot.ClientID || botId,
        Type: bot.Type || 'System',
        Server: guildId,
        Owner: bot.Owner || null,
      },
      accessRole: 'owner' as const,
    };
  }

  async setRuntime(
    botId: string,
    body: { running?: boolean; restart?: boolean },
    actor: string,
  ) {
    await this.ensureSystemBot(botId);
    if (body?.restart) {
      return this.apply.restartRuntime(botId, actor);
    }
    return this.apply.setRuntime(botId, Boolean(body?.running), actor);
  }
}
