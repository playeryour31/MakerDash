import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { userOwnsBot } from '../auth/ownership';
import { ApplyStoreService } from '../apply/apply-store.service';
import { DashboardAccessService } from '../dashboard/dashboard-access.service';
import { DiscordGuildService } from '../apply/discord-guild.service';
import { ApplyService } from '../apply/apply.service';
import { AzkarService } from '../azkar/azkar.service';
import { QuranService } from './quran.service';

class AzkarSettingsDto {
  @IsOptional()
  @IsString()
  channelId?: string;

  @IsOptional()
  @IsIn(['embed', 'message'])
  mode?: 'embed' | 'message';

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1440)
  intervalMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(3600)
  slowdownSeconds?: number;

  @IsOptional()
  selectedAzkar?: number[];
}

class QuranSettingsDto {
  @IsOptional()
  @IsString()
  voiceChannelId?: string;

  @IsOptional()
  @IsString()
  radioId?: string;

  @IsOptional()
  @IsString()
  radioName?: string;

  @IsOptional()
  @IsString()
  radioUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  volume?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  enabled?: boolean;

  /** Persist then start playback immediately */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  play?: boolean;
}

class QuranControlDto {
  @IsIn(['play', 'stop', 'setVolume', 'live'])
  action!: 'play' | 'stop' | 'setVolume' | 'live';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  volume?: number;

  @IsOptional()
  @IsString()
  voiceChannelId?: string;

  @IsOptional()
  @IsString()
  radioId?: string;

  @IsOptional()
  @IsString()
  radioName?: string;

  @IsOptional()
  @IsString()
  radioUrl?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  enabled?: boolean;
}

class RuntimeDto {
  @IsOptional()
  @IsBoolean()
  running?: boolean;

  @IsOptional()
  @IsBoolean()
  restart?: boolean;
}

@Controller('muslim')
@UseGuards(JwtAuthGuard)
export class MuslimController {
  constructor(
    private readonly azkar: AzkarService,
    private readonly quran: QuranService,
    private readonly store: ApplyStoreService,
    private readonly access: DashboardAccessService,
    private readonly discordGuild: DiscordGuildService,
    private readonly apply: ApplyService,
  ) {}

  private async accessOpts(user: any, botId: string) {
    const bot =
      (await this.store.getBotAsync(botId)) || this.store.getBot(botId);
    const access = await this.access.getByClientId(botId);
    return {
      tokenOwner: bot?.Owner,
      tokenBuyer: bot?.Buyer,
      accessOwnerId: access?.ownerId,
    };
  }

  private async assertOwner(user: any, botId: string) {
    if (!user) throw new ForbiddenException();
    if (!userOwnsBot(user, botId, await this.accessOpts(user, botId))) {
      throw new ForbiddenException('Owner only');
    }
  }

  @Get(':botId')
  async overview(@Param('botId') botId: string, @Req() req: any) {
    await this.assertOwner(req.user, botId);
    const azkar = await this.azkar.overview(botId);
    const quran = await this.quran.overview(botId);
    return {
      botId,
      type: 'Muslim',
      running: azkar.running,
      guildId: azkar.guildId,
      bot: azkar.bot,
      accessRole: azkar.accessRole,
      azkar: {
        settings: azkar.settings,
        configured: azkar.configured,
        intervalMs: azkar.intervalMs,
      },
      quran: {
        settings: quran.settings,
        configured: quran.configured,
        playing: quran.playing,
      },
    };
  }

  @Get(':botId/azkar')
  async getAzkar(@Param('botId') botId: string, @Req() req: any) {
    await this.assertOwner(req.user, botId);
    return this.azkar.overview(botId);
  }

  @Patch(':botId/azkar')
  async patchAzkar(
    @Param('botId') botId: string,
    @Body() body: AzkarSettingsDto,
    @Req() req: any,
  ) {
    await this.assertOwner(req.user, botId);
    return this.azkar.updateSettings(botId, body);
  }

  @Get(':botId/azkar/catalog')
  async azkarCatalog(@Param('botId') botId: string, @Req() req: any) {
    await this.assertOwner(req.user, botId);
    await this.azkar.ensureAzkarBot(botId);
    return { azkar: this.azkar.listCatalog() };
  }

  @Get(':botId/quran')
  async getQuran(@Param('botId') botId: string, @Req() req: any) {
    await this.assertOwner(req.user, botId);
    return this.quran.overview(botId);
  }

  @Patch(':botId/quran/settings')
  async patchQuran(
    @Param('botId') botId: string,
    @Body() body: QuranSettingsDto,
    @Req() req: any,
  ) {
    await this.assertOwner(req.user, botId);
    return this.quran.updateSettings(botId, body);
  }

  @Post(':botId/quran/control')
  async controlQuran(
    @Param('botId') botId: string,
    @Body() body: QuranControlDto,
    @Req() req: any,
  ) {
    await this.assertOwner(req.user, botId);
    return this.quran.control(botId, body);
  }

  @Get(':botId/quran/radios')
  async radios(@Param('botId') botId: string, @Req() req: any) {
    await this.assertOwner(req.user, botId);
    await this.quran.ensureMuslimBot(botId);
    return { radios: await this.quran.listRadios() };
  }

  @Get(':botId/guild-options')
  async guildOptions(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Req() req: any,
  ) {
    await this.assertOwner(req.user, botId);
    const bot = await this.azkar.ensureAzkarBot(botId);
    const gid =
      guildId ||
      bot?.Server ||
      bot?.guild ||
      '';
    return this.discordGuild.getGuildOptions(botId, String(gid));
  }

  @Patch(':botId/runtime')
  async runtime(
    @Param('botId') botId: string,
    @Body() body: RuntimeDto,
    @Req() req: any,
  ) {
    await this.assertOwner(req.user, botId);
    await this.azkar.ensureAzkarBot(botId);
    const actor = req.user?.sub || 'dashboard';
    if (body?.restart) {
      return this.apply.restartRuntime(botId, actor);
    }
    return this.apply.setRuntime(botId, Boolean(body?.running), actor);
  }
}
