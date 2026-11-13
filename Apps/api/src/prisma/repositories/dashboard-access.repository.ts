import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class DashboardAccessRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findBySlug(slug: string) {
    return this.prisma.client.dashboardAccess.findUnique({
      where: { slug: String(slug) },
    });
  }

  async findByClientId(clientId: string) {
    return this.prisma.client.dashboardAccess.findUnique({
      where: { clientId: String(clientId) },
    });
  }

  async listAll() {
    return this.prisma.client.dashboardAccess.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async upsert(data: {
    slug: string;
    clientId: string;
    type: string;
    ownerId?: string | null;
    guildId?: string | null;
    purchasesId?: string | number | null;
    meta?: Record<string, unknown> | null;
  }) {
    const purchasesId =
      data.purchasesId === null || data.purchasesId === undefined
        ? null
        : String(data.purchasesId);
    const meta =
      data.meta == null
        ? undefined
        : (data.meta as Prisma.InputJsonValue);
    return this.prisma.client.dashboardAccess.upsert({
      where: { clientId: String(data.clientId) },
      create: {
        slug: String(data.slug),
        clientId: String(data.clientId),
        type: String(data.type || 'Apply'),
        ownerId: data.ownerId ? String(data.ownerId) : null,
        guildId: data.guildId ? String(data.guildId) : null,
        purchasesId,
        meta,
      },
      update: {
        type: String(data.type || 'Apply'),
        ownerId: data.ownerId ? String(data.ownerId) : undefined,
        guildId: data.guildId ? String(data.guildId) : undefined,
        purchasesId: purchasesId === null ? undefined : purchasesId,
        meta,
      },
    });
  }
}
