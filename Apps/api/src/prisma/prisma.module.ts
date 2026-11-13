import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { DataConsistencyService } from './data-consistency.service';
import { BotInstanceRepository } from './repositories/bot-instance.repository';
import { BotRuntimeRepository } from './repositories/bot-runtime.repository';
import { ApplyRepository } from './repositories/apply.repository';
import { BotJobRepository } from './repositories/bot-job.repository';
import { FeatureRepository } from './repositories/feature.repository';
import { PlatformRepository } from './repositories/platform.repository';
import { UserBlacklistRepository } from './repositories/user-blacklist.repository';
import { TokenPoolRepository } from './repositories/token-pool.repository';
import { DashboardAccessRepository } from './repositories/dashboard-access.repository';

@Global()
@Module({
  providers: [
    PrismaService,
    DataConsistencyService,
    BotInstanceRepository,
    BotRuntimeRepository,
    ApplyRepository,
    BotJobRepository,
    FeatureRepository,
    PlatformRepository,
    UserBlacklistRepository,
    TokenPoolRepository,
    DashboardAccessRepository,
  ],
  exports: [
    PrismaService,
    DataConsistencyService,
    BotInstanceRepository,
    BotRuntimeRepository,
    ApplyRepository,
    BotJobRepository,
    FeatureRepository,
    PlatformRepository,
    UserBlacklistRepository,
    TokenPoolRepository,
    DashboardAccessRepository,
  ],
})
export class PrismaModule {}
