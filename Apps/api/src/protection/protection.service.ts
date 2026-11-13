import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApplyStoreService } from '../apply/apply-store.service';
import { ApplyService } from '../apply/apply.service';

@Injectable()
export class ProtectionService {
  constructor(
    private readonly store: ApplyStoreService,
    private readonly apply: ApplyService,
  ) {}

  private isProtectionType(bot: any): boolean {
    const t = String(bot?.Type || bot?.type || '')
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, '');
    return t === 'protection' || t === 'protect' || t === 'guard';
  }

  async ensureProtectionBot(botId: string) {
    const bot =
      (await this.store.getBotAsync(botId)) || this.store.getBot(botId);
    if (!bot) throw new NotFoundException('Bot not found');
    if (!this.isProtectionType(bot)) {
      throw new ForbiddenException('Not a Protection bot');
    }
    return bot;
  }

  guildIdOf(bot: any): string | null {
    const guildId = bot?.Server || bot?.guild || bot?.Servers?.[0] || null;
    return guildId ? String(guildId) : null;
  }

  async overview(botId: string) {
    const bot = await this.ensureProtectionBot(botId);
    const guildId = this.guildIdOf(bot);
    return {
      botId,
      type: 'Protection',
      running: await this.store.isRunningAsync(botId),
      guildId,
      bot: {
        ClientID: bot.ClientID || botId,
        Type: bot.Type || 'Protection',
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
    await this.ensureProtectionBot(botId);
    if (body?.restart) {
      return this.apply.restartRuntime(botId, actor);
    }
    return this.apply.setRuntime(botId, Boolean(body?.running), actor);
  }
}
