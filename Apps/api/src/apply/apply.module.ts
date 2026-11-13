import { Module } from '@nestjs/common';
import { AccessModule } from '../dashboard/access.module';
import { ApplyController } from './apply.controller';
import { ApplyService } from './apply.service';
import { ApplyStoreService } from './apply-store.service';
import { ApplyAuditService } from './apply-audit.service';
import { DiscordGuildService } from './discord-guild.service';
import { BotProfileService } from './bot-profile.service';

@Module({
  imports: [AccessModule],
  controllers: [ApplyController],
  providers: [
    ApplyService,
    ApplyStoreService,
    DiscordGuildService,
    ApplyAuditService,
    BotProfileService,
  ],
  exports: [
    ApplyStoreService,
    ApplyAuditService,
    ApplyService,
    DiscordGuildService,
  ],
})
export class ApplyModule {}
