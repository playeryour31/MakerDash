import { Module } from '@nestjs/common';
import { ApplyModule } from '../apply/apply.module';
import { AccessModule } from '../dashboard/access.module';
import { InternalController } from './internal.controller';
import { InternalApiKeyGuard } from './internal-api-key.guard';

@Module({
  imports: [ApplyModule, AccessModule],
  controllers: [InternalController],
  providers: [InternalApiKeyGuard],
})
export class InternalModule {}
