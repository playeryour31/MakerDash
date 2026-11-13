import { Module } from '@nestjs/common';
import { DashboardAccessService } from './dashboard-access.service';
import { BotAdminsService } from './bot-admins.service';

/**
 * Shared access-link store — imported by Apply / Auth / Bots / Dashboard
 * without circular module deps.
 */
@Module({
  providers: [DashboardAccessService, BotAdminsService],
  exports: [DashboardAccessService, BotAdminsService],
})
export class AccessModule {}