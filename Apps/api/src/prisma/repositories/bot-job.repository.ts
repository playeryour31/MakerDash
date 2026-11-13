import { Injectable } from '@nestjs/common';
import { JobKind, JobStatus } from '@maker/database';
import { PrismaService } from '../prisma.service';

@Injectable()
export class BotJobRepository {
  constructor(private readonly prisma: PrismaService) {}

  async enqueue(botClientId: string, kind: JobKind, payload: Record<string, any>) {
    return this.prisma.botJob.create({
      data: {
        botClientId: String(botClientId),
        kind,
        status: JobStatus.pending,
        payload: payload || {},
      },
    });
  }

  async cancelPending(botClientId: string, kind?: JobKind) {
    return this.prisma.botJob.updateMany({
      where: {
        botClientId: String(botClientId),
        status: JobStatus.pending,
        ...(kind ? { kind } : {}),
      },
      data: {
        status: JobStatus.done,
        processedAt: new Date(),
        error: 'cancelled',
      },
    });
  }

  async peek(botClientId: string, kind: JobKind) {
    return this.prisma.botJob.findFirst({
      where: {
        botClientId: String(botClientId),
        kind,
        status: JobStatus.pending,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async listPendingPayloads(botClientId: string, kind: JobKind) {
    const rows = await this.prisma.botJob.findMany({
      where: {
        botClientId: String(botClientId),
        kind,
        status: JobStatus.pending,
      },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => ({
      ...(typeof r.payload === 'object' && r.payload ? (r.payload as object) : {}),
      jobId: r.id,
      queuedAt: r.createdAt.toISOString(),
    }));
  }

  async claim(botClientId: string, kinds?: JobKind[], limit = 20) {
    const pending = await this.prisma.botJob.findMany({
      where: {
        botClientId: String(botClientId),
        status: JobStatus.pending,
        ...(kinds?.length ? { kind: { in: kinds } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    const claimed = [];
    for (const job of pending) {
      const updated = await this.prisma.botJob.updateMany({
        where: { id: job.id, status: JobStatus.pending },
        data: { status: JobStatus.processing },
      });
      if (updated.count === 1) {
        claimed.push({
          id: job.id,
          kind: job.kind,
          payload: job.payload,
          createdAt: job.createdAt.toISOString(),
        });
      }
    }
    return claimed;
  }

  async complete(jobId: string, ok = true, error?: string) {
    return this.prisma.botJob.update({
      where: { id: jobId },
      data: {
        status: ok ? JobStatus.done : JobStatus.failed,
        processedAt: new Date(),
        error: error || null,
      },
    });
  }
}
