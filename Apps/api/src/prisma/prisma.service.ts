import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { prisma, PrismaClient } from '@maker/database';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly client: PrismaClient = prisma;

  get botInstance() {
    return this.client.botInstance;
  }
  get botRuntime() {
    return this.client.botRuntime;
  }
  get applyGuildSettings() {
    return this.client.applyGuildSettings;
  }
  get applyPanel() {
    return this.client.applyPanel;
  }
  get applyPanelApplicant() {
    return this.client.applyPanelApplicant;
  }
  get applyApplication() {
    return this.client.applyApplication;
  }
  get botJob() {
    return this.client.botJob;
  }
  get featureRecord() {
    return this.client.featureRecord;
  }
  get platformRecord() {
    return this.client.platformRecord;
  }
  get botBalance() {
    return this.client.botBalance;
  }
  get botPrefix() {
    return this.client.botPrefix;
  }
  get guildBotPrice() {
    return this.client.guildBotPrice;
  }
  get botCommandConfig() {
    return this.client.botCommandConfig;
  }
  get userBlacklist() {
    return this.client.userBlacklist;
  }
  get dashboardAccess() {
    return this.client.dashboardAccess;
  }
  get tokenPoolEntry() {
    return this.client.tokenPoolEntry;
  }
  get applyAuditLog() {
    return this.client.applyAuditLog;
  }
  get guildMemberXp() {
    return this.client.guildMemberXp;
  }
  get guildDailyStat() {
    return this.client.guildDailyStat;
  }

  $transaction(...args: Parameters<PrismaClient['$transaction']>) {
    return this.client.$transaction(...(args as [any]));
  }

  $queryRaw(...args: Parameters<PrismaClient['$queryRaw']>) {
    return this.client.$queryRaw(...(args as [any]));
  }

  async onModuleInit() {
    try {
      await this.client.$connect();
    } catch (err: any) {
      console.warn(
        `[prisma] connect failed — JSON fallback active: ${err?.message || err}`,
      );
    }
  }

  async onModuleDestroy() {
    await this.client.$disconnect().catch(() => undefined);
  }

  async isReady(): Promise<boolean> {
    try {
      await this.client.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
