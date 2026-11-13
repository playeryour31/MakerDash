import { Module } from '@nestjs/common';
import { AccessModule } from '../dashboard/access.module';
import { ApplyModule } from '../apply/apply.module';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';
import { SystemFeaturesService } from './system-features.service';
import { WelcomeAssetsService } from './welcome-assets.service';
import { LevelingUsersService } from './leveling-users.service';
import { GuildStatsService } from './guild-stats.service';

@Module({
  imports: [AccessModule, ApplyModule],
  controllers: [SystemController],
  providers: [
    SystemService,
    SystemFeaturesService,
    WelcomeAssetsService,
    LevelingUsersService,
    GuildStatsService,
  ],
  exports: [SystemService, SystemFeaturesService, WelcomeAssetsService],
})
export class SystemModule {}
