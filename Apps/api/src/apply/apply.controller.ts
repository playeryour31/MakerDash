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
  UseGuards,
} from '@nestjs/common';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { userCanDecideApplications, userOwnsBot } from '../auth/ownership';
import { ApplyService } from './apply.service';
import { ApplyStoreService } from './apply-store.service';
import { DashboardAccessService } from '../dashboard/dashboard-access.service';
import { BotAdminsService } from '../dashboard/bot-admins.service';
import { DiscordGuildService } from './discord-guild.service';
import { BotProfileService } from './bot-profile.service';

class DmModeDto {
  @IsIn(['on', 'off'])
  accept: string;

  @IsIn(['on', 'off'])
  reject: string;
}

class SettingsDto {
  @IsString()
  guildId: string;

  @IsOptional()
  @IsString()
  adminRoleId?: string;

  @IsOptional()
  @IsString()
  logsChannelId?: string;

  /** @deprecated use logsChannelId */
  @IsOptional()
  @IsString()
  resultsChannelId?: string;

  @IsOptional()
  @IsIn(['Ar', 'En'])
  language?: 'Ar' | 'En';

  @IsOptional()
  @ValidateNested()
  @Type(() => DmModeDto)
  dmMode?: DmModeDto;
}

class EmbedFieldDto {
  @IsString()
  name: string;

  @IsString()
  value: string;

  @IsOptional()
  @IsBoolean()
  inline?: boolean;
}

class EmbedDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  authorName?: string;

  @IsOptional()
  @IsString()
  authorIconUrl?: string;

  @IsOptional()
  @IsString()
  footerText?: string;

  @IsOptional()
  @IsString()
  footerIconUrl?: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsBoolean()
  useServerBranding?: boolean;

  @IsOptional()
  @IsBoolean()
  timestamp?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmbedFieldDto)
  fields?: EmbedFieldDto[];
}

class CreatePanelDto {
  @IsString()
  guild: string;

  @IsString()
  applicationChannel: string;

  @IsString()
  requestsChannel: string;

  @IsString()
  applicationRole: string;

  @IsOptional()
  @IsString()
  applicationMessage?: string;

  @IsOptional()
  @IsIn(['embed', 'message'])
  applicationMessageType?: 'embed' | 'message';

  @IsOptional()
  @IsString()
  buttonLabel?: string;

  @IsOptional()
  @IsString()
  buttonEmoji?: string;

  @IsOptional()
  @IsIn(['Primary', 'Secondary', 'Success', 'Danger'])
  buttonColor?: 'Primary' | 'Secondary' | 'Success' | 'Danger';

  @IsOptional()
  @ValidateNested()
  @Type(() => EmbedDto)
  embed?: EmbedDto;

  @IsArray()
  questions: any[];
}

class UpdatePanelDto {
  @IsString()
  guild: string;

  @IsString()
  appID: string;

  @IsOptional()
  @IsString()
  appMessage?: string;

  @IsOptional()
  @IsIn(['on', 'off'])
  appStatus?: 'on' | 'off';

  @IsOptional()
  @IsIn(['embed', 'message'])
  applicationMessageType?: 'embed' | 'message';

  @IsOptional()
  @IsString()
  buttonLabel?: string;

  @IsOptional()
  @IsString()
  buttonEmoji?: string;

  @IsOptional()
  @IsIn(['Primary', 'Secondary', 'Success', 'Danger'])
  buttonColor?: 'Primary' | 'Secondary' | 'Success' | 'Danger';

  @IsOptional()
  @IsString()
  requestsChannel?: string;

  @IsOptional()
  @IsString()
  applicationRole?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmbedDto)
  embed?: EmbedDto;

  @IsArray()
  questions: any[];
}

class DecideDto {
  @IsIn(['accept', 'reject'])
  action: 'accept' | 'reject';

  @IsString()
  guildId: string;

  @IsString()
  channelId: string;

  @IsString()
  messageId: string;

  @IsString()
  userId: string;

  @IsString()
  roleId: string;

  @IsOptional()
  @IsString()
  pendingId?: string;
}

class BotProfileDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  avatarDataUrl?: string | null;

  @IsOptional()
  @IsString()
  bannerDataUrl?: string | null;

  @IsOptional()
  @IsIn(['PLAYING', 'STREAMING', 'LISTENING', 'WATCHING', 'COMPETING'])
  activityType?: 'PLAYING' | 'STREAMING' | 'LISTENING' | 'WATCHING' | 'COMPETING';

  @IsOptional()
  @IsString()
  activityName?: string;

  @IsOptional()
  @IsString()
  activityUrl?: string;

  @IsOptional()
  @IsIn(['online', 'idle', 'dnd', 'invisible'])
  status?: 'online' | 'idle' | 'dnd' | 'invisible';
}

@Controller('apply')
@UseGuards(JwtAuthGuard)
export class ApplyController {
  constructor(
    private readonly apply: ApplyService,
    private readonly store: ApplyStoreService,
    private readonly access: DashboardAccessService,
    private readonly admins: BotAdminsService,
    private readonly discordGuild: DiscordGuildService,
    private readonly botProfile: BotProfileService,
  ) {}

  private async accessOpts(user: any, botId: string) {
    const bot =
      (await this.store.getBotAsync(botId)) || this.store.getBot(botId);
    const access = await this.access.getByClientId(botId);
    return {
      tokenOwner: bot?.Owner,
      tokenBuyer: bot?.Buyer,
      accessOwnerId: access?.ownerId,
      isAcceptedAdmin: await this.admins.isAcceptedAdmin(
        String(user?.sub || ''),
        botId,
      ),
    };
  }

  /** Full owner access (settings, panels, runtime, …). */
  private async assertOwner(user: any, botId: string) {
    if (!user) throw new ForbiddenException();
    if (!userOwnsBot(user, botId, await this.accessOpts(user, botId))) {
      throw new ForbiddenException('Owner only');
    }
  }

  /** Owner or invited admin — read pending / decide. */
  private async assertCanDecide(user: any, botId: string) {
    if (!user) throw new ForbiddenException();
    if (
      !userCanDecideApplications(
        user,
        botId,
        await this.accessOpts(user, botId),
      )
    ) {
      throw new ForbiddenException('Not allowed for this bot');
    }
  }

  @Get(':botId')
  async overview(@Param('botId') botId: string, @Req() req: any) {
    await this.assertCanDecide(req.user, botId);
    const full = await this.apply.overview(botId);
    const isOwner = userOwnsBot(
      req.user,
      botId,
      await this.accessOpts(req.user, botId),
    );
    if (isOwner) return { ...full, accessRole: 'owner' as const };
    return {
      botId: full.botId,
      running: full.running,
      guildId: full.guildId,
      settings: null,
      panels: [],
      pending: full.pending,
      accessRole: 'admin' as const,
    };
  }

  /** Channels + roles for the bot's guild (for dashboard selects). */
  @Get(':botId/guild-options')
  async guildOptions(
    @Param('botId') botId: string,
    @Query('guildId') guildId: string,
    @Req() req: any,
  ) {
    await this.assertOwner(req.user, botId);
    const bot =
      (await this.store.getBotAsync(botId)) || this.store.getBot(botId);
    const gid =
      guildId ||
      bot?.Server ||
      bot?.guild ||
      bot?.Servers?.[0] ||
      '';
    return this.discordGuild.getGuildOptions(botId, String(gid));
  }

  @Get(':botId/profile')
  async getProfile(@Param('botId') botId: string, @Req() req: any) {
    await this.assertOwner(req.user, botId);
    return this.botProfile.getProfile(botId);
  }

  @Patch(':botId/profile')
  async updateProfile(
    @Param('botId') botId: string,
    @Body() body: BotProfileDto,
    @Req() req: any,
  ) {
    await this.assertOwner(req.user, botId);
    return this.botProfile.updateProfile(botId, body);
  }

  @Patch(':botId/settings')
  async settings(
    @Param('botId') botId: string,
    @Body() body: SettingsDto,
    @Req() req: any,
  ) {
    await this.assertOwner(req.user, botId);
    return this.apply.updateSettings(botId, body, req.user?.sub || 'dashboard');
  }

  @Post(':botId/panels')
  async createPanel(
    @Param('botId') botId: string,
    @Body() body: CreatePanelDto,
    @Req() req: any,
  ) {
    await this.assertOwner(req.user, botId);
    return this.apply.createPanel(botId, body, req.user?.sub || 'dashboard');
  }

  @Patch(':botId/panels')
  async updatePanel(
    @Param('botId') botId: string,
    @Body() body: UpdatePanelDto,
    @Req() req: any,
  ) {
    await this.assertOwner(req.user, botId);
    return this.apply.updatePanel(botId, body, req.user?.sub || 'dashboard');
  }

  @Patch(':botId/panels/:messageId/status')
  async panelStatus(
    @Param('botId') botId: string,
    @Param('messageId') messageId: string,
    @Body() body: { status: 'on' | 'off' },
    @Req() req: any,
  ) {
    await this.assertOwner(req.user, botId);
    return this.apply.setPanelStatus(
      botId,
      messageId,
      body.status,
      req.user?.sub || 'dashboard',
    );
  }

  @Delete(':botId/panels/:messageId')
  async deletePanel(
    @Param('botId') botId: string,
    @Param('messageId') messageId: string,
    @Req() req: any,
  ) {
    await this.assertOwner(req.user, botId);
    return this.apply.deletePanel(
      botId,
      messageId,
      req.user?.sub || 'dashboard',
    );
  }

  @Post(':botId/runtime')
  async runtime(
    @Param('botId') botId: string,
    @Body() body: { running?: boolean; restart?: boolean },
    @Req() req: any,
  ) {
    await this.assertOwner(req.user, botId);
    const actor = req.user?.sub || 'dashboard';
    if (body?.restart) {
      return this.apply.restartRuntime(botId, actor);
    }
    return this.apply.setRuntime(botId, Boolean(body?.running), actor);
  }

  @Post(':botId/applications/decide')
  async decide(
    @Param('botId') botId: string,
    @Body() body: DecideDto,
    @Req() req: any,
  ) {
    await this.assertCanDecide(req.user, botId);
    return this.apply.decideApplication(
      botId,
      body,
      req.user?.sub || 'dashboard',
    );
  }
}
