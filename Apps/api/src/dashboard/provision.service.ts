import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  shouldWritePostgres,
} from '@maker/database';
import { ApplyStoreService } from '../apply/apply-store.service';
import { DashboardAccessService } from './dashboard-access.service';
import { PlatformRepository } from '../prisma/repositories/platform.repository';
import { TokenPoolRepository } from '../prisma/repositories/token-pool.repository';
import { resolveBotClientIdFromToken } from '../partner/discord-token.util';
import {
  buildCommandsForBotType,
  loadMasterCommandsCatalog,
  writeCommandsJsonFile,
} from '../bots/commands-catalog.util';

@Injectable()
export class ProvisionService {
  constructor(
    private readonly access: DashboardAccessService,
    private readonly store: ApplyStoreService,
    private readonly platform: PlatformRepository,
    private readonly tokens: TokenPoolRepository,
  ) {}

  /** Seed command catalog (same as Discord BotMaker purchase) when missing. */
  private async seedCommandsIfMissing(clientId: string, type: string) {
    const id = String(clientId);
    try {
      const existing = await this.platform.getCommands(id);
      if (existing && existing.length) return;
    } catch {
      /* continue */
    }

    const built = buildCommandsForBotType(type, loadMasterCommandsCatalog());
    if (!built.length) return;

    if (shouldWritePostgres()) {
      try {
        await this.platform.setCommands(id, built);
      } catch {
        /* fall through to JSON */
      }
    }
    // Always mirror JSON so Maker file loaders see the catalog.
    writeCommandsJsonFile(id, built);
  }

  /**
   * Create / register a bot for the dashboard + optional token pool pull.
   * If clientId is omitted but token is present, resolves clientId via Discord.
   */
  async provision(input: {
    type?: string;
    token?: string;
    ownerId: string;
    guildId?: string;
    prefix?: string;
    language?: string;
    durationDays?: number;
    externalOrderId?: string;
    clientId?: string;
    price?: number;
  }) {
    const type = input.type || 'Apply';
    const guildId = String(input.guildId || '').trim();
    if (!/^\d{17,20}$/.test(guildId)) {
      throw new BadRequestException(
        'guildId is required — bot must be locked to one Discord server',
      );
    }
    let token = input.token;
    if (!token) {
      token = (await this.tokens.takeOne('unused')) || undefined;
      if (!token) {
        throw new NotFoundException('No unused tokens available');
      }
    }

    let clientId = input.clientId ? String(input.clientId) : '';
    if (!clientId) {
      try {
        const resolved = await resolveBotClientIdFromToken(token);
        clientId = resolved.clientId;
      } catch (err: any) {
        throw new ForbiddenException(
          err?.message ||
            'clientId is required (or provide a valid Discord bot token)',
        );
      }
    }

    const list = [...(await this.store.listAllBotsAsync())];
    const existing = list.find((b: any) => b.ClientID === clientId);
    if (existing) {
      const access = await this.access.ensureAccess({
        clientId,
        type: existing.Type || type,
        ownerId: existing.Owner || input.ownerId,
        purchasesId: existing.PurchasesID,
        guildId:
          existing.Server ||
          existing.guild ||
          existing.Servers?.[0] ||
          guildId ||
          null,
      });
      await this.seedCommandsIfMissing(
        clientId,
        String(existing.Type || type),
      );
      return {
        reused: true,
        clientId,
        type: existing.Type || type,
        endTime: existing.endTime || null,
        startTime: existing.startTime || null,
        ...access,
      };
    }

    const botIdKey = `${type}ID`;
    const ids = (await this.platform.getNamespaceMap('botmaker_ids')) || {};
    const botSeq = Number(ids[botIdKey] || 1);
    const purchasesId = Number(ids.PurchasesID || 1);
    await this.platform.set('botmaker_ids', botIdKey, botSeq + 1);
    await this.platform.set('botmaker_ids', 'PurchasesID', purchasesId + 1);

    const days = Number(input.durationDays || 30);
    const start = new Date();
    const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

    const row = {
      Token: token,
      Owner: String(input.ownerId),
      ClientID: String(clientId),
      Seller: guildId,
      BotID: botSeq,
      Type: type,
      Servers: [guildId],
      Server: guildId,
      guild: guildId,
      Price: input.price ?? 0,
      PurchasesID: purchasesId,
      externalOrderId: input.externalOrderId || null,
      endTime: fmt(end),
      startTime: fmt(start),
      TokenType: input.token ? 'external' : 'our',
      meta: input.externalOrderId
        ? { externalOrderId: input.externalOrderId }
        : undefined,
    };

    list.push(row);
    await this.store.writeAllBotsAsync(list);
    await this.store.setRunningAsync(String(clientId), true);
    const prefix = input.prefix || '!';
    await this.platform.setPrefix(String(clientId), prefix);
    await this.platform.set(
      'owner_data',
      `Owner_${clientId}`,
      String(input.ownerId),
    );
    await this.platform.set(
      'language',
      String(clientId),
      input.language || 'Ar',
    );
    await this.seedCommandsIfMissing(String(clientId), type);

    const access = await this.access.ensureAccess({
      clientId,
      type,
      ownerId: input.ownerId,
      purchasesId,
      guildId,
    });

    return {
      reused: false,
      clientId,
      type,
      purchasesId,
      endTime: row.endTime,
      startTime: row.startTime,
      ...access,
    };
  }

  async ensureAccessForExistingBot(clientId: string) {
    const bot = await this.store.getBotAsync(clientId);
    if (!bot) {
      return await this.access.ensureAccess({
        clientId,
        type: 'Apply',
        ownerId: null,
      });
    }
    return await this.access.ensureAccess({
      clientId,
      type: bot.Type || 'Apply',
      ownerId: bot.Buyer || bot.Owner || null,
      purchasesId: bot.PurchasesID ?? null,
      guildId: bot.Server || bot.guild || bot.Servers?.[0] || null,
    });
  }
}
