import { Injectable } from '@nestjs/common';
import { Prisma, type TokenPoolKind } from '@prisma/client';
import {
  decryptPoolToken,
  encryptPoolToken,
} from '@maker/database';
import { PrismaService } from '../prisma.service';

/**
 * Token pools.
 *
 * Rows are encrypted at rest with `BOT_TOKEN_ENCRYPTION_KEY`. The encryption is
 * deterministic so `@@unique([kind, token])` keeps working: the same plaintext
 * always produces the same ciphertext. Plaintext rows written before this change
 * are still readable and are rewritten by `npm run db:encrypt:tokens`.
 */
@Injectable()
export class TokenPoolRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listTokens(kind: TokenPoolKind): Promise<string[]> {
    const rows = await this.prisma.client.tokenPoolEntry.findMany({
      where: { kind },
      select: { token: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => decryptPoolToken(r.token));
  }

  async takeOne(kind: TokenPoolKind = 'unused'): Promise<string | null> {
    const row = await this.prisma.client.tokenPoolEntry.findFirst({
      where: { kind },
      orderBy: { createdAt: 'asc' },
    });
    if (!row) return null;
    await this.prisma.client.tokenPoolEntry.delete({ where: { id: row.id } });
    return decryptPoolToken(row.token);
  }

  async add(kind: TokenPoolKind, token: string, meta?: Record<string, unknown>) {
    const jsonMeta =
      meta === undefined
        ? undefined
        : (meta as Prisma.InputJsonValue);
    const stored = encryptPoolToken(String(token));
    const row = await this.prisma.client.tokenPoolEntry.upsert({
      where: { kind_token: { kind, token: stored } },
      create: {
        kind,
        token: stored,
        meta: jsonMeta,
      },
      update: { meta: jsonMeta },
    });
    // Heal rows written before at-rest encryption (best effort).
    await this.prisma.client.tokenPoolEntry
      .deleteMany({
        where: { kind, token: String(token) },
      })
      .catch(() => undefined);
    return row;
  }

  async remove(kind: TokenPoolKind, token: string) {
    const plain = String(token);
    await this.prisma.client.tokenPoolEntry.deleteMany({
      where: { kind, token: { in: [encryptPoolToken(plain), plain] } },
    });
  }

  async replaceAll(kind: TokenPoolKind, tokens: string[]) {
    await this.prisma.client.$transaction(async (tx) => {
      await tx.tokenPoolEntry.deleteMany({ where: { kind } });
      for (const token of tokens) {
        await tx.tokenPoolEntry.create({
          data: { kind, token: encryptPoolToken(String(token)) },
        });
      }
    });
  }
}
