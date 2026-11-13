import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ApplyModule } from './apply/apply.module';
import { AzkarModule } from './azkar/azkar.module';
import { MuslimModule } from './muslim/muslim.module';
import { SystemModule } from './system/system.module';
import { ProtectionModule } from './protection/protection.module';
import { LogsModule } from './logs/logs.module';
import { BotsModule } from './bots/bots.module';
import { DatabaseModule } from './database/database.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PrismaModule } from './prisma/prisma.module';
import { InternalModule } from './internal/internal.module';
import { PartnerModule } from './partner/partner.module';

@Module({
  imports: [
    PrismaModule,
    DatabaseModule,
    DashboardModule,
    AuthModule,
    BotsModule,
    ApplyModule,
    AzkarModule,
    MuslimModule,
    SystemModule,
    ProtectionModule,
    LogsModule,
    InternalModule,
    PartnerModule,
  ],
})
export class AppModule {}
