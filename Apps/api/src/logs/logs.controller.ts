import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { userOwnsBot } from '../auth/ownership';
import { ApplyStoreService } from '../apply/apply-store.service';
import { DashboardAccessService } from '../dashboard/dashboard-access.service';
import { LogsService } from './logs.service';
import { LogsFeaturesService } from './logs-features.service';

class RuntimeDto {
  @IsOptional()
  @IsBoolean()
  running?: boolean;

  @IsOptional()
  @IsBoolean()
  restart?: boolean;
}

@Controller('logs')
@UseGuards(JwtAuthGuard)
export class LogsController {
  constructor(
    private readonly logs: LogsService,
    private readonly features: LogsFeaturesService,
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
    const base = await this.logs.overview(botId);
    const extras = await this.features.overviewExtras(botId);
    return { ...base, ...extras };
  }

  @Get(':botId/features')
  async listFeatures(@Param('botId') botId: string, @Req() req: any) {
    await this.assertOwner(req.user, botId);
    return { features: this.features.list() };
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
    return this.logs.setRuntime(botId, body || {}, actor);
  }
}
