import { Module } from '@nestjs/common';
import { AccessModule } from './access.module';
import { ProvisionController } from './provision.controller';
import { ProvisionService } from './provision.service';
import { ApplyModule } from '../apply/apply.module';

@Module({
  imports: [AccessModule, ApplyModule],
  controllers: [ProvisionController],
  providers: [ProvisionService],
  exports: [AccessModule, ProvisionService],
})
export class DashboardModule {}
