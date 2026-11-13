import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class FeatureRepository {
  constructor(private readonly prisma: PrismaService) {}

  async get(namespace: string, key: string) {
    const row = await this.prisma.featureRecord.findUnique({
      where: {
        namespace_key: { namespace: String(namespace), key: String(key) },
      },
    });
    return row?.value;
  }

  async getNamespaceMap(namespace: string): Promise<Record<string, any>> {
    const rows = await this.prisma.featureRecord.findMany({
      where: { namespace: String(namespace) },
      select: { key: true, value: true },
    });
    const out: Record<string, any> = {};
    for (const row of rows) out[row.key] = row.value;
    return out;
  }

  async set(namespace: string, key: string, value: any, botClientId?: string) {
    return this.prisma.featureRecord.upsert({
      where: {
        namespace_key: { namespace: String(namespace), key: String(key) },
      },
      create: {
        namespace: String(namespace),
        key: String(key),
        value: value ?? null,
        botClientId: botClientId ? String(botClientId) : null,
      },
      update: {
        value: value ?? null,
        botClientId: botClientId ? String(botClientId) : undefined,
      },
    });
  }

  async delete(namespace: string, key: string) {
    await this.prisma.featureRecord.deleteMany({
      where: { namespace: String(namespace), key: String(key) },
    });
  }
}
