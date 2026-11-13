import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { userOwnsBot } from '../auth/ownership';
import { ApplyStoreService } from '../apply/apply-store.service';
import { DashboardAccessService } from '../dashboard/dashboard-access.service';
import { DiscordGuildService } from '../apply/discord-guild.service';
import { ApplyService } from '../apply/apply.service';
import { AzkarService } from './azkar.service';

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
}

class AzkarRuntimeDto {
  @IsOptional()
  @IsBoolean()
  running?: boolean;

  @IsOptional()
  @IsBoolean()
  restart?: boolean;
}

@Controller('azkar')
@UseGuards(JwtAuthGuard)
export class AzkarController {
  constructor(
    private readonly azkar: AzkarService,
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
    return this.azkar.overview(botId);
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
      guildId || bot?.Server || bot?.guild || '';
    return this.discordGuild.getGuildOptions(botId, String(gid));
  }

  @Patch(':botId/settings')
  async settings(
    @Param('botId') botId: string,
    @Body() body: AzkarSettingsDto,
    @Req() req: any,
  ) {
    await this.assertOwner(req.user, botId);
    return this.azkar.updateSettings(botId, body);
  }

  @Patch(':botId/runtime')
  async runtime(
    @Param('botId') botId: string,
    @Body() body: AzkarRuntimeDto,
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
