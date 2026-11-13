import { Module } from '@nestjs/common';
import { AccessModule } from '../dashboard/access.module';
import { ApplyModule } from '../apply/apply.module';
import { LogsController } from './logs.controller';
import { LogsService } from './logs.service';
import { LogsFeaturesService } from './logs-features.service';

@Module({
  imports: [AccessModule, ApplyModule],
  controllers: [LogsController],
  providers: [LogsService, LogsFeaturesService],
  exports: [LogsService, LogsFeaturesService],
})
export class LogsModule {}
