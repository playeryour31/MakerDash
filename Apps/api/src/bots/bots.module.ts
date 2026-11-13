import { Module } from '@nestjs/common';
import { ApplyModule } from '../apply/apply.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { BotsController } from './bots.controller';
import { CommandsController } from './commands.controller';
import { CommandsStoreService } from './commands-store.service';
import { SubscriptionStatusService } from './subscription-status.service';
import { BotRenewService } from './bot-renew.service';

@Module({
  imports: [ApplyModule, DashboardModule],
  controllers: [BotsController, CommandsController],
  providers: [
    CommandsStoreService,
    SubscriptionStatusService,
    BotRenewService,
  ],
})
export class BotsModule {}
