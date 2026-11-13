import { Module } from '@nestjs/common';
import { AccessModule } from '../dashboard/access.module';
import { ApplyModule } from '../apply/apply.module';
import { ProtectionController } from './protection.controller';
import { ProtectionService } from './protection.service';
import { ProtectionFeaturesService } from './protection-features.service';

@Module({
  imports: [AccessModule, ApplyModule],
  controllers: [ProtectionController],
  providers: [ProtectionService, ProtectionFeaturesService],
  exports: [ProtectionService, ProtectionFeaturesService],
})
export class ProtectionModule {}
