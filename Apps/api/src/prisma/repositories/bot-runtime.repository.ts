import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class BotRuntimeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getMap(): Promise<Record<string, boolean>> {
    const rows = await this.prisma.botRuntime.findMany();
    const out: Record<string, boolean> = {};
    for (const row of rows) out[row.clientId] = Boolean(row.running);
    return out;
  }

  async isRunning(clientId: string): Promise<boolean | null> {
    const row = await this.prisma.botRuntime.findUnique({
      where: { clientId: String(clientId) },
    });
    // Missing row is unknown — caller should fall back to JSON/memory
    if (!row) return null;
    return Boolean(row.running);
  }

  async setRunning(clientId: string, running: boolean) {
    const bot = await this.prisma.botInstance.findUnique({
      where: { clientId: String(clientId) },
      select: { clientId: true },
    });
    if (!bot) {
      // Runtime row requires BotInstance FK — skip until subscription exists in PG
      console.warn(
        `[bot-runtime] skip setRunning(${clientId})=${running}: no BotInstance in Postgres`,
      );
      return null;
    }
    return this.prisma.botRuntime.upsert({
      where: { clientId: String(clientId) },
      create: { clientId: String(clientId), running: Boolean(running) },
      update: { running: Boolean(running) },
    });
  }

  async replaceAll(map: Record<string, boolean>) {
    const entries = Object.entries(map || {});
    await this.prisma.$transaction(async (tx) => {
      const keep = entries.map(([id]) => String(id));
      if (keep.length) {
        await tx.botRuntime.deleteMany({
          where: { clientId: { notIn: keep } },
        });
      } else {
        await tx.botRuntime.deleteMany({});
      }
      for (const [clientId, running] of entries) {
        await tx.botRuntime.upsert({
          where: { clientId: String(clientId) },
          create: {
            clientId: String(clientId),
            running: Boolean(running),
          },
          update: { running: Boolean(running) },
        });
      }
    });
  }
}
