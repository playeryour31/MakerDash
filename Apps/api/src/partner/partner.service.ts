import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  BotType,
  PartnerOrderStatus,
  PartnerTokenSource,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProvisionService } from '../dashboard/provision.service';
import { TokenPoolRepository } from '../prisma/repositories/token-pool.repository';
import { resolveBotClientIdFromToken } from './discord-token.util';

const CATALOG: Array<{
  type: BotType;
  label: string;
  defaultDurationDays: number;
}> = [
  { type: 'Apply', label: 'Applications', defaultDurationDays: 30 },
  { type: 'Protection', label: 'Protection', defaultDurationDays: 30 },
  { type: 'Ticket', label: 'Ticket', defaultDurationDays: 30 },
  { type: 'System', label: 'System', defaultDurationDays: 30 },
  { type: 'Muslim', label: 'Muslim', defaultDurationDays: 30 },
  { type: 'Giveaway', label: 'Giveaway', defaultDurationDays: 30 },
  { type: 'Log', label: 'Logs', defaultDurationDays: 30 },
  { type: 'Autoline', label: 'AutoLine', defaultDurationDays: 30 },
  { type: 'Feedback', label: 'Feedback', defaultDurationDays: 30 },
  { type: 'Offer', label: 'Offers', defaultDurationDays: 30 },
  { type: 'Package', label: 'Package', defaultDurationDays: 30 },
  { type: 'Selfrole', label: 'Self Roles', defaultDurationDays: 30 },
  { type: 'Stock', label: 'Stock', defaultDurationDays: 30 },
  { type: 'Suggestion', label: 'Suggestions', defaultDurationDays: 30 },
  { type: 'Tax', label: 'Tax', defaultDurationDays: 30 },
  { type: 'TempRole', label: 'Temp Role', defaultDurationDays: 30 },
  { type: 'TempVoice', label: 'Temp Voice', defaultDurationDays: 30 },
];

export type CreatePartnerOrderInput = {
  externalOrderId: string;
  ownerDiscordId: string;
  botType: string;
  durationDays?: number;
  tokenMode: 'pool' | 'customer';
  customerToken?: string;
  /** Required — bot is locked to this Discord guild only. */
  guildId: string;
  language?: string;
  prefix?: string;
  price?: number;
};

@Injectable()
export class PartnerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provision: ProvisionService,
    private readonly tokens: TokenPoolRepository,
  ) {}

  getCatalog() {
    return {
      botTypes: CATALOG,
      tokenModes: ['pool', 'customer'] as const,
      notes: [
        'Payment is handled by your shop. Call POST /partner/v1/orders after a successful payment.',
        'guildId is required — the bot may only join that Discord server.',
        'tokenMode=pool pulls a Discord bot token from Maker inventory.',
        'tokenMode=customer requires customerToken (validated against Discord).',
        'Responses never include bot tokens.',
      ],
    };
  }

  private parseBotType(raw: string): BotType {
    const normalized = String(raw || '')
      .trim()
      .replace(/[\s_-]+/g, '');
    const match = CATALOG.find(
      (c) => c.type.toLowerCase() === normalized.toLowerCase(),
    );
    if (match) return match.type;
    // aliases
    if (/^protect|guard$/i.test(normalized)) return 'Protection';
    if (/^azkar$/i.test(normalized)) return 'Muslim';
    if (/^logs?$/i.test(normalized)) return 'Log';
    if (/^applications?|apply$/i.test(normalized)) return 'Apply';
    throw new BadRequestException(`Unsupported botType: ${raw}`);
  }

  private mapLanguage(raw?: string): string {
    const v = String(raw || 'Ar').trim().toLowerCase();
    if (v === 'en' || v === 'english') return 'En';
    return 'Ar';
  }

  private serializeOrder(
    order: {
      id: string;
      externalOrderId: string;
      status: PartnerOrderStatus;
      clientId: string | null;
      botType: BotType;
      dashboardSlug: string | null;
      durationDays: number;
      tokenSource: PartnerTokenSource;
      createdAt: Date;
      updatedAt: Date;
      meta: unknown;
    },
    access?: {
      dashboardUrl?: string;
      inviteUrl?: string;
      guildId?: string | null;
      reused?: boolean;
      startsAt?: string;
      endsAt?: string;
    },
  ) {
    const publicUrl = (
      process.env.DASHBOARD_PUBLIC_URL || 'http://localhost:3000'
    ).replace(/\/$/, '');
    const dashboardUrl =
      access?.dashboardUrl ||
      (order.dashboardSlug ? `${publicUrl}/b/${order.dashboardSlug}` : null);
    const inviteUrl =
      access?.inviteUrl ||
      (order.clientId
        ? (() => {
            const base = `https://discord.com/api/oauth2/authorize?client_id=${order.clientId}&permissions=8&scope=bot%20applications.commands`;
            const gid =
              (order.meta as any)?.guildId ||
              access?.guildId ||
              null;
            return gid
              ? `${base}&guild_id=${encodeURIComponent(String(gid))}&disable_guild_select=true`
              : base;
          })()
        : null);

    return {
      orderId: order.id,
      externalOrderId: order.externalOrderId,
      status: order.status,
      clientId: order.clientId,
      botType: order.botType,
      tokenSource: order.tokenSource,
      durationDays: order.durationDays,
      dashboardSlug: order.dashboardSlug,
      dashboardUrl,
      inviteUrl,
      startsAt: access?.startsAt ?? null,
      endsAt: access?.endsAt ?? null,
      reused: access?.reused ?? false,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }

  async getOrderByExternalId(partnerKeyDbId: string, externalOrderId: string) {
    const order = await this.prisma.client.partnerOrder.findUnique({
      where: {
        partnerKeyId_externalOrderId: {
          partnerKeyId: partnerKeyDbId,
          externalOrderId: String(externalOrderId),
        },
      },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return this.serializeOrder(order);
  }

  async createOrder(partnerKeyDbId: string, input: CreatePartnerOrderInput) {
    const externalOrderId = String(input.externalOrderId || '').trim();
    const ownerDiscordId = String(input.ownerDiscordId || '').trim();
    if (!externalOrderId || externalOrderId.length < 3) {
      throw new BadRequestException('externalOrderId is required');
    }
    if (!/^\d{5,}$/.test(ownerDiscordId)) {
      throw new BadRequestException(
        'ownerDiscordId must be a Discord snowflake',
      );
    }
    const guildId = String(input.guildId || '').trim();
    if (!/^\d{17,20}$/.test(guildId)) {
      throw new BadRequestException(
        'guildId is required and must be a Discord server snowflake (17–20 digits)',
      );
    }

    const existing = await this.prisma.client.partnerOrder.findUnique({
      where: {
        partnerKeyId_externalOrderId: {
          partnerKeyId: partnerKeyDbId,
          externalOrderId,
        },
      },
    });
    if (existing) {
      if (existing.status === 'fulfilled') {
        return this.serializeOrder(existing, {
          reused: true,
          endsAt: (existing.meta as any)?.endsAt || null,
          startsAt: (existing.meta as any)?.startsAt || null,
        });
      }
      if (existing.status === 'pending') {
        const pendingMs = Date.now() - existing.updatedAt.getTime();
        const staleMs = Number(
          process.env.PARTNER_PENDING_STALE_MS || 120_000,
        );
        if (pendingMs < staleMs) {
          return this.serializeOrder(existing, { reused: true });
        }
      }
      // failed or stale pending → allow retry with same externalOrderId
      await this.prisma.client.partnerOrder.delete({
        where: { id: existing.id },
      });
    }

    const botType = this.parseBotType(input.botType);
    const maxDays = Number(process.env.PARTNER_MAX_DURATION_DAYS || 3650);
    const durationDays = Math.min(
      maxDays,
      Math.max(1, Number(input.durationDays || 30) || 30),
    );
    const tokenMode = input.tokenMode === 'customer' ? 'customer' : 'pool';
    const tokenSource: PartnerTokenSource =
      tokenMode === 'customer' ? 'customer' : 'pool';

    let pending;
    try {
      pending = await this.prisma.client.partnerOrder.create({
        data: {
          partnerKeyId: partnerKeyDbId,
          externalOrderId,
          ownerDiscordId,
          botType,
          tokenSource,
          status: 'pending',
          durationDays,
          meta: {
            guildId,
            language: this.mapLanguage(input.language),
            prefix: input.prefix || '!',
          },
        },
      });
    } catch (err: any) {
      // Concurrent duplicate create — return existing if won the race
      if (err?.code === 'P2002') {
        const raced = await this.prisma.client.partnerOrder.findUnique({
          where: {
            partnerKeyId_externalOrderId: {
              partnerKeyId: partnerKeyDbId,
              externalOrderId,
            },
          },
        });
        if (raced) {
          return this.serializeOrder(raced, { reused: true });
        }
      }
      throw err;
    }

    try {
      let token: string | undefined;
      if (tokenMode === 'customer') {
        token = String(input.customerToken || '').trim();
        if (!token) {
          throw new BadRequestException(
            'customerToken is required when tokenMode=customer',
          );
        }
      } else {
        token = (await this.tokens.takeOne('unused')) || undefined;
        if (!token) {
          throw new ServiceUnavailableException(
            'No unused bot tokens available in the Maker pool',
          );
        }
      }

      const { clientId } = await resolveBotClientIdFromToken(token);

      const provisioned = await this.provision.provision({
        type: botType,
        token,
        ownerId: ownerDiscordId,
        clientId,
        guildId,
        prefix: input.prefix || '!',
        language: this.mapLanguage(input.language),
        durationDays,
        externalOrderId,
        price: input.price,
      });

      const startsAt = new Date().toISOString();
      const endsAt = provisioned.endTime
        ? new Date(String(provisioned.endTime).replace(' ', 'T')).toISOString()
        : new Date(
            Date.now() + durationDays * 24 * 60 * 60 * 1000,
          ).toISOString();

      const fulfilled = await this.prisma.client.partnerOrder.update({
        where: { id: pending.id },
        data: {
          status: 'fulfilled',
          clientId: provisioned.clientId,
          dashboardSlug: provisioned.slug || null,
          meta: {
            guildId,
            language: this.mapLanguage(input.language),
            prefix: input.prefix || '!',
            startsAt,
            endsAt,
            purchasesId: provisioned.purchasesId ?? null,
            provisionReused: !!provisioned.reused,
          },
        },
      });

      return this.serializeOrder(fulfilled, {
        dashboardUrl: provisioned.dashboardUrl,
        inviteUrl: provisioned.inviteUrl,
        guildId,
        reused: !!provisioned.reused,
        startsAt,
        endsAt,
      });
    } catch (err: any) {
      const message = String(err?.message || err).slice(0, 500);
      await this.prisma.client.partnerOrder.update({
        where: { id: pending.id },
        data: { status: 'failed', errorMessage: message },
      });
      throw err;
    }
  }
}
