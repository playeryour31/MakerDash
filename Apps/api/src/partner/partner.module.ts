import { Module } from '@nestjs/common';
import { DashboardModule } from '../dashboard/dashboard.module';
import { PartnerController } from './partner.controller';
import { PartnerService } from './partner.service';
import { PartnerAuthGuard } from './partner-auth.guard';

@Module({
  imports: [DashboardModule],
  controllers: [PartnerController],
  providers: [PartnerService, PartnerAuthGuard],
  exports: [PartnerService],
})
export class PartnerModule {}
