import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { userOwnsBot } from '../auth/ownership';
import { ApplyStoreService } from '../apply/apply-store.service';
import { DashboardAccessService } from '../dashboard/dashboard-access.service';
import { ProtectionService } from './protection.service';
import { ProtectionFeaturesService } from './protection-features.service';

class RuntimeDto {
  @IsOptional()
  @IsBoolean()
  running?: boolean;

  @IsOptional()
  @IsBoolean()
  restart?: boolean;
}

class ApplyLevelDto {
  @IsString()
  level!: string;
}

@Controller('protection')
@UseGuards(JwtAuthGuard)
export class ProtectionController {
  constructor(
    private readonly protection: ProtectionService,
    private readonly features: ProtectionFeaturesService,
    private readonly store: ApplyStoreService,
    private readonly access: DashboardAccessService,
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
    const base = await this.protection.overview(botId);
    const extras = await this.features.overviewExtras(botId);
    return { ...base, ...extras };
  }

  @Get(':botId/levels')
  async getLevels(@Param('botId') botId: string, @Req() req: any) {
    await this.assertOwner(req.user, botId);
    return this.features.getLevels(botId);
  }

  @Post(':botId/levels/apply')
  async applyLevel(
    @Param('botId') botId: string,
    @Body() body: ApplyLevelDto,
    @Req() req: any,
  ) {
    await this.assertOwner(req.user, botId);
    return this.features.applyLevel(botId, body?.level);
  }

  @Get(':botId/features')
  async listFeatures(@Param('botId') botId: string, @Req() req: any) {
    await this.assertOwner(req.user, botId);
    return { features: this.features.list(botId) };
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

  @Get(':botId/whitelist')
  async getWhitelist(@Param('botId') botId: string, @Req() req: any) {
    await this.assertOwner(req.user, botId);
    return this.features.getFeature(botId, 'whitelist');
  }

  @Patch(':botId/whitelist')
  async patchWhitelist(
    @Param('botId') botId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any,
  ) {
    await this.assertOwner(req.user, botId);
    return this.features.updateFeature(botId, 'whitelist', body || {});
  }

  @Patch(':botId/runtime')
  async runtime(
    @Param('botId') botId: string,
    @Body() body: RuntimeDto,
    @Req() req: any,
  ) {
    await this.assertOwner(req.user, botId);
    const actor = req.user?.sub || 'dashboard';
    return this.protection.setRuntime(botId, body || {}, actor);
  }
}
