import { Injectable } from '@nestjs/common';
import {
  BotType,
  Language,
  encryptBotToken,
  decryptBotToken,
} from '@maker/database';
import { PrismaService } from '../prisma.service';

export type LegacyBotRecord = {
  Token?: string;
  token?: string;
  Owner?: string;
  Buyer?: string;
  Seller?: string;
  ClientID?: string;
  clientId?: string;
  BotID?: number;
  Type?: string;
  Servers?: string[];
  Server?: string;
  guild?: string;
  Price?: number;
  Node?: number;
  PurchasesID?: number;
  endTime?: string;
  startTime?: string;
  TokenType?: string;
  dashboardSlug?: string;
  language?: string;
};

function parseBotDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatBotDate(d?: Date | null): string | undefined {
  if (!d) return undefined;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function toBotType(raw?: string): BotType {
  const key = String(raw || 'System');
  // Legacy product name → Muslim
  if (key === 'Azkar') return BotType.Muslim;
  if ((Object.values(BotType) as string[]).includes(key)) {
    return key as BotType;
  }
  return BotType.System;
}

@Injectable()
export class BotInstanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  toLegacy(row: any, includeToken = true): LegacyBotRecord {
    const token = includeToken
      ? (() => {
          try {
            return decryptBotToken(row.tokenEnc);
          } catch {
            return '';
          }
        })()
      : undefined;

    return {
      Token: token,
      Owner: row.ownerId,
      Buyer: row.buyerId || row.ownerId,
      Seller: row.sellerId || undefined,
      ClientID: row.clientId,
      BotID: row.botNumber ?? undefined,
      Type: row.type,
      Servers: row.servers || [],
      Server: row.serverId || row.guildId || undefined,
      guild: row.guildId || row.serverId || undefined,
      Price: row.price ?? undefined,
      Node: row.node ?? undefined,
      PurchasesID: row.purchasesId ?? undefined,
      endTime: formatBotDate(row.endsAt),
      startTime: formatBotDate(row.startsAt),
      TokenType: row.tokenType || undefined,
      dashboardSlug: row.dashboardSlug || undefined,
      language: row.language,
    };
  }

  async listAll(includeToken = true): Promise<LegacyBotRecord[]> {
    const rows = await this.prisma.botInstance.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => this.toLegacy(r, includeToken));
  }

  async findByClientId(
    clientId: string,
    includeToken = true,
  ): Promise<LegacyBotRecord | null> {
    const row = await this.prisma.botInstance.findUnique({
      where: { clientId: String(clientId) },
    });
    return row ? this.toLegacy(row, includeToken) : null;
  }

  async upsertFromLegacy(bot: LegacyBotRecord) {
    const clientId = String(bot.ClientID || bot.clientId || '');
    if (!clientId) throw new Error('Bot missing ClientID');
    const plain = String(bot.Token || bot.token || '');
    if (!plain) throw new Error(`Bot ${clientId} missing Token`);

    const language =
      bot.language === 'En' ? Language.En : Language.Ar;

    return this.prisma.botInstance.upsert({
      where: { clientId },
      create: {
        clientId,
        tokenEnc: encryptBotToken(plain),
        ownerId: String(bot.Owner || ''),
        buyerId: bot.Buyer ? String(bot.Buyer) : null,
        sellerId: bot.Seller ? String(bot.Seller) : null,
        botNumber: bot.BotID ?? null,
        type: toBotType(bot.Type),
        guildId: bot.guild ? String(bot.guild) : null,
        serverId: bot.Server ? String(bot.Server) : null,
        servers: Array.isArray(bot.Servers)
          ? bot.Servers.map(String)
          : bot.Server
            ? [String(bot.Server)]
            : [],
        price: bot.Price ?? null,
        node: bot.Node ?? null,
        purchasesId: bot.PurchasesID ?? null,
        tokenType: bot.TokenType ? String(bot.TokenType) : null,
        dashboardSlug: bot.dashboardSlug ? String(bot.dashboardSlug) : null,
        startsAt: parseBotDate(bot.startTime),
        endsAt: parseBotDate(bot.endTime),
        language,
      },
      update: {
        tokenEnc: encryptBotToken(plain),
        ownerId: String(bot.Owner || ''),
        buyerId: bot.Buyer ? String(bot.Buyer) : null,
        sellerId: bot.Seller ? String(bot.Seller) : null,
        botNumber: bot.BotID ?? null,
        type: toBotType(bot.Type),
        guildId: bot.guild ? String(bot.guild) : null,
        serverId: bot.Server ? String(bot.Server) : null,
        servers: Array.isArray(bot.Servers)
          ? bot.Servers.map(String)
          : bot.Server
            ? [String(bot.Server)]
            : [],
        price: bot.Price ?? null,
        node: bot.Node ?? null,
        purchasesId: bot.PurchasesID ?? null,
        tokenType: bot.TokenType ? String(bot.TokenType) : null,
        dashboardSlug: bot.dashboardSlug ? String(bot.dashboardSlug) : null,
        startsAt: parseBotDate(bot.startTime),
        endsAt: parseBotDate(bot.endTime),
        ...(bot.language === 'Ar' || bot.language === 'En'
          ? { language: bot.language === 'En' ? Language.En : Language.Ar }
          : {}),
      },
    });
  }

  async replaceAllFromLegacy(bots: LegacyBotRecord[]) {
    const clientIds = bots
      .map((b) => String(b.ClientID || b.clientId || ''))
      .filter(Boolean);

    await this.prisma.$transaction(async (tx) => {
      if (clientIds.length) {
        await tx.botInstance.deleteMany({
          where: { clientId: { notIn: clientIds } },
        });
      } else {
        await tx.botInstance.deleteMany({});
      }
    });

    for (const bot of bots) {
      await this.upsertFromLegacy(bot);
    }
  }

  async setLanguage(clientId: string, language: 'Ar' | 'En') {
    return this.prisma.botInstance.update({
      where: { clientId: String(clientId) },
      data: { language: language === 'En' ? Language.En : Language.Ar },
    });
  }

  async getLanguage(clientId: string): Promise<'Ar' | 'En'> {
    const row = await this.prisma.botInstance.findUnique({
      where: { clientId: String(clientId) },
      select: { language: true },
    });
    return row?.language === Language.En ? 'En' : 'Ar';
  }
}
