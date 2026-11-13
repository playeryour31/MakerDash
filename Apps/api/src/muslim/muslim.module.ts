import { Module } from '@nestjs/common';
import { AccessModule } from '../dashboard/access.module';
import { ApplyModule } from '../apply/apply.module';
import { AzkarModule } from '../azkar/azkar.module';
import { MuslimController } from './muslim.controller';
import { QuranService } from './quran.service';

@Module({
  imports: [AccessModule, ApplyModule, AzkarModule],
  controllers: [MuslimController],
  providers: [QuranService],
  exports: [QuranService],
})
export class MuslimModule {}
