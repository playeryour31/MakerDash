import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class UserBlacklistRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string) {
    return this.prisma.client.userBlacklist.findUnique({
      where: { userId: String(userId) },
    });
  }

  async upsert(data: {
    userId: string;
    reason: string;
    adminId: string;
    expiresAt?: Date | null;
  }) {
    return this.prisma.client.userBlacklist.upsert({
      where: { userId: String(data.userId) },
      create: {
        userId: String(data.userId),
        reason: String(data.reason),
        adminId: String(data.adminId),
        expiresAt: data.expiresAt ?? null,
      },
      update: {
        reason: String(data.reason),
        adminId: String(data.adminId),
        expiresAt: data.expiresAt ?? null,
      },
    });
  }

  async deleteByUserId(userId: string) {
    await this.prisma.client.userBlacklist.deleteMany({
      where: { userId: String(userId) },
    });
  }

  async listExpired(before = new Date()) {
    return this.prisma.client.userBlacklist.findMany({
      where: { expiresAt: { lte: before } },
    });
  }

  async listAll() {
    return this.prisma.client.userBlacklist.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
