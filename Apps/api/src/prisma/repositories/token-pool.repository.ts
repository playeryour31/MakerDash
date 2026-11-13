import { Injectable } from '@nestjs/common';
import { Prisma, type TokenPoolKind } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class TokenPoolRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listTokens(kind: TokenPoolKind): Promise<string[]> {
    const rows = await this.prisma.client.tokenPoolEntry.findMany({
      where: { kind },
      select: { token: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => r.token);
  }

  async takeOne(kind: TokenPoolKind = 'unused'): Promise<string | null> {
    const row = await this.prisma.client.tokenPoolEntry.findFirst({
      where: { kind },
      orderBy: { createdAt: 'asc' },
    });
    if (!row) return null;
    await this.prisma.client.tokenPoolEntry.delete({ where: { id: row.id } });
    return row.token;
  }

  async add(kind: TokenPoolKind, token: string, meta?: Record<string, unknown>) {
    const jsonMeta =
      meta === undefined
        ? undefined
        : (meta as Prisma.InputJsonValue);
    return this.prisma.client.tokenPoolEntry.upsert({
      where: { kind_token: { kind, token: String(token) } },
      create: {
        kind,
        token: String(token),
        meta: jsonMeta,
      },
      update: { meta: jsonMeta },
    });
  }

  async remove(kind: TokenPoolKind, token: string) {
    await this.prisma.client.tokenPoolEntry.deleteMany({
      where: { kind, token: String(token) },
    });
  }

  async replaceAll(kind: TokenPoolKind, tokens: string[]) {
    await this.prisma.client.$transaction(async (tx) => {
      await tx.tokenPoolEntry.deleteMany({ where: { kind } });
      for (const token of tokens) {
        await tx.tokenPoolEntry.create({
          data: { kind, token: String(token) },
        });
      }
    });
  }
}
