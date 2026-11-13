import { Module } from '@nestjs/common';
import { AccessModule } from '../dashboard/access.module';
import { ApplyModule } from '../apply/apply.module';
import { AzkarController } from './azkar.controller';
import { AzkarService } from './azkar.service';

@Module({
  imports: [AccessModule, ApplyModule],
  controllers: [AzkarController],
  providers: [AzkarService],
  exports: [AzkarService],
})
export class AzkarModule {}
