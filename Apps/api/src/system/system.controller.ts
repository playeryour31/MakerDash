import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { userOwnsBot } from '../auth/ownership';
import { ApplyStoreService } from '../apply/apply-store.service';
import { DashboardAccessService } from '../dashboard/dashboard-access.service';
import { SystemService } from './system.service';
import { SystemFeaturesService } from './system-features.service';
import { WelcomeAssetsService } from './welcome-assets.service';
import { LevelingUsersService } from './leveling-users.service';
import { GuildStatsService } from './guild-stats.service';

class RuntimeDto {
  @IsOptional()
  @IsBoolean()
  running?: boolean;

  @IsOptional()
  @IsBoolean()
  restart?: boolean;
}

class WelcomeBackgroundDto {
  @IsString()
  dataUrl!: string;
}

class LevelingUserMutationDto {
  @IsString()
  action!: 'add_xp' | 'remove_xp' | 'set_xp' | 'set_level' | 'reset';

  @IsOptional()
  @IsNumber()
  amount?: number;
}

@Controller('system')
@UseGuards(JwtAuthGuard)
export class SystemController {
  constructor(
    private readonly system: SystemService,
    private readonly features: SystemFeaturesService,
    private readonly welcomeAssets: WelcomeAssetsService,
    private readonly store: ApplyStoreService,
    private readonly access: DashboardAccessService,
    private readonly levelingUsers: LevelingUsersService,
    private readonly guildStats: GuildStatsService,
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
    const base = await this.system.overview(botId);
    const extras = await this.features.overviewExtras(botId);
    return { ...base, ...extras };
  }

  @Get(':botId/stats')
  async stats(
    @Param('botId') botId: string,
    @Query('range') range: string,
    @Req() req: any,
  ) {
    await this.assertOwner(req.user, botId);
    return this.guildStats.getStats(botId, range);
  }

  @Get(':botId/features')
  async listFeatures(@Param('botId') botId: string, @Req() req: any) {
    await this.assertOwner(req.user, botId);
    return { features: await this.features.list(botId) };
  }

  @Get(':botId/features/welcome/background')
  async getWelcomeBackground(
    @Param('botId') botId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    await this.assertOwner(req.user, botId);
    await this.system.ensureSystemBot(botId);
    const { buffer, contentType } = this.welcomeAssets.readFile(botId);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.send(buffer);
  }

  @Post(':botId/features/welcome/background')
  async uploadWelcomeBackground(
    @Param('botId') botId: string,
    @Body() body: WelcomeBackgroundDto,
    @Req() req: any,
  ) {
    await this.assertOwner(req.user, botId);
    return this.features.uploadWelcomeBackground(botId, body?.dataUrl);
  }

  @Delete(':botId/features/welcome/background')
  async deleteWelcomeBackground(
    @Param('botId') botId: string,
    @Req() req: any,
  ) {
    await this.assertOwner(req.user, botId);
    return this.features.deleteWelcomeBackground(botId);
  }

  @Get(':botId/leveling/users')
  async listLevelingUsers(
    @Param('botId') botId: string,
    @Query('q') q: string,
    @Query('limit') limit: string,
    @Query('offset') offset: string,
    @Req() req: any,
  ) {
    await this.assertOwner(req.user, botId);
    return this.levelingUsers.listUsers(botId, {
      q,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get(':botId/leveling/users/:userId')
  async getLevelingUser(
    @Param('botId') botId: string,
    @Param('userId') userId: string,
    @Req() req: any,
  ) {
    await this.assertOwner(req.user, botId);
    return this.levelingUsers.getUser(botId, userId);
  }

  @Post(':botId/leveling/users/:userId')
  async mutateLevelingUser(
    @Param('botId') botId: string,
    @Param('userId') userId: string,
    @Body() body: LevelingUserMutationDto,
    @Req() req: any,
  ) {
    await this.assertOwner(req.user, botId);
    return this.levelingUsers.mutateUser(botId, userId, body || ({} as any));
  }

  @Get(':botId/leveling/leaderboard')
  async levelingLeaderboard(
    @Param('botId') botId: string,
    @Query('limit') limit: string,
    @Req() req: any,
  ) {
    await this.assertOwner(req.user, botId);
    return this.levelingUsers.leaderboard(
      botId,
      limit ? Number(limit) : undefined,
    );
  }

  @Get(':botId/features/:feature')
  async getFeature(
    @Param('botId') botId: string,
    @Param('feature') feature: string,
    @Req() req: any,
  ) {
    await this.assertOwner(req.user, botId);
    return this.features.getFeature(botId, feature);
  }

  @Patch(':botId/features/:feature')
  async patchFeature(
    @Param('botId') botId: string,
    @Param('feature') feature: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any,
  ) {
    await this.assertOwner(req.user, botId);
    return this.features.updateFeature(botId, feature, body || {});
  }

  @Patch(':botId/runtime')
  async runtime(
    @Param('botId') botId: string,
    @Body() body: RuntimeDto,
    @Req() req: any,
  ) {
    await this.assertOwner(req.user, botId);
    const actor = req.user?.sub || 'dashboard';
    return this.system.setRuntime(botId, body || {}, actor);
  }
}
