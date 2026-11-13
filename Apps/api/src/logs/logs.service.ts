import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApplyStoreService } from '../apply/apply-store.service';
import { ApplyService } from '../apply/apply.service';

@Injectable()
export class LogsService {
  constructor(
    private readonly store: ApplyStoreService,
    private readonly apply: ApplyService,
  ) {}

  private isLogsType(bot: any): boolean {
    const t = String(bot?.Type || bot?.type || '')
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, '');
    return t === 'log' || t === 'logs' || t === 'logging';
  }

  async ensureLogsBot(botId: string) {
    const bot =
      (await this.store.getBotAsync(botId)) || this.store.getBot(botId);
    if (!bot) throw new NotFoundException('Bot not found');
    if (!this.isLogsType(bot)) {
      throw new ForbiddenException('Not a Logs bot');
    }
    return bot;
  }

  guildIdOf(bot: any): string | null {
    const guildId = bot?.Server || bot?.guild || bot?.Servers?.[0] || null;
    return guildId ? String(guildId) : null;
  }

  async overview(botId: string) {
    const bot = await this.ensureLogsBot(botId);
    const guildId = this.guildIdOf(bot);
    return {
      botId,
      type: 'Log',
      running: await this.store.isRunningAsync(botId),
      guildId,
      bot: {
        ClientID: bot.ClientID || botId,
        Type: bot.Type || 'Log',
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
    await this.ensureLogsBot(botId);
    if (body?.restart) {
      return this.apply.restartRuntime(botId, actor);
    }
    return this.apply.setRuntime(botId, Boolean(body?.running), actor);
  }
}
