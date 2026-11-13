import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PlatformRepository {
  constructor(private readonly prisma: PrismaService) {}

  async get(namespace: string, key: string) {
    const row = await this.prisma.platformRecord.findUnique({
      where: {
        namespace_key: { namespace: String(namespace), key: String(key) },
      },
    });
    return row?.value;
  }

  async getNamespaceMap(namespace: string): Promise<Record<string, any>> {
    const rows = await this.prisma.platformRecord.findMany({
      where: { namespace: String(namespace) },
      select: { key: true, value: true },
    });
    const out: Record<string, any> = {};
    for (const row of rows) out[row.key] = row.value;
    return out;
  }

  async set(namespace: string, key: string, value: any) {
    return this.prisma.platformRecord.upsert({
      where: {
        namespace_key: { namespace: String(namespace), key: String(key) },
      },
      create: {
        namespace: String(namespace),
        key: String(key),
        value: value ?? null,
      },
      update: { value: value ?? null },
    });
  }

  async setMany(namespace: string, entries: Record<string, any>) {
    for (const [key, value] of Object.entries(entries)) {
      await this.set(namespace, key, value);
    }
  }

  async delete(namespace: string, key: string) {
    await this.prisma.platformRecord.deleteMany({
      where: { namespace: String(namespace), key: String(key) },
    });
  }

  async getPrefix(clientId: string): Promise<string | null> {
    const row = await this.prisma.botPrefix.findUnique({
      where: { clientId: String(clientId) },
    });
    return row?.prefix ?? null;
  }

  async setPrefix(clientId: string, prefix: string) {
    return this.prisma.botPrefix.upsert({
      where: { clientId: String(clientId) },
      create: { clientId: String(clientId), prefix: String(prefix || '#') },
      update: { prefix: String(prefix || '#') },
    });
  }

  async getCommands(clientId: string): Promise<any[] | null> {
    const row = await this.prisma.botCommandConfig.findUnique({
      where: { clientId: String(clientId) },
    });
    if (!row) return null;
    return Array.isArray(row.commands) ? (row.commands as any[]) : [];
  }

  async setCommands(clientId: string, commands: any[]) {
    return this.prisma.botCommandConfig.upsert({
      where: { clientId: String(clientId) },
      create: { clientId: String(clientId), commands: commands ?? [] },
      update: { commands: commands ?? [] },
    });
  }
}
