import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpException,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { userOwnsBot } from '../auth/ownership';
import { ApplyStoreService } from '../apply/apply-store.service';
import { ApplyAuditService } from '../apply/apply-audit.service';
import { DashboardAccessService } from '../dashboard/dashboard-access.service';
import { CommandsStoreService } from './commands-store.service';

class CommandEnabledDto {
  @IsString()
  commandName: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  prefixEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  slashEnabled?: boolean;
}

class AliasAddDto {
  @IsString()
  commandName: string;

  @IsString()
  alias: string;

  @IsOptional()
  @IsBoolean()
  requirePrefix?: boolean;
}

class AliasRemoveDto {
  @IsString()
  commandName: string;

  @IsString()
  alias: string;
}

class AliasesPatchDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AliasAddDto)
  add?: AliasAddDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AliasRemoveDto)
  remove?: AliasRemoveDto[];
}

class ChannelsPatchDto {
  @IsString()
  commandName: string;

  @IsArray()
  @IsString({ each: true })
  channelIds: string[];
}

class RolesPatchDto {
  @IsString()
  commandName: string;

  @IsArray()
  @IsString({ each: true })
  roleIds: string[];
}

class PermissionsPatchDto {
  @IsString()
  commandName: string;

  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}

class CommandsPatchDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommandEnabledDto)
  updates?: CommandEnabledDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => AliasesPatchDto)
  aliases?: AliasesPatchDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChannelsPatchDto)
  channels?: ChannelsPatchDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RolesPatchDto)
  roles?: RolesPatchDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionsPatchDto)
  permissions?: PermissionsPatchDto[];
}

@Controller('bots')
@UseGuards(JwtAuthGuard)
export class CommandsController {
  constructor(
    private readonly commands: CommandsStoreService,
    private readonly store: ApplyStoreService,
    private readonly access: DashboardAccessService,
    private readonly audit: ApplyAuditService,
  ) {}

  private async assertOwner(user: any, clientId: string) {
    const bot =
      (await this.store.getBotAsync(clientId)) || this.store.getBot(clientId);
    const accessRec = await this.access.getByClientId(clientId);
    if (
      !userOwnsBot(user, clientId, {
        tokenOwner: bot?.Owner,
        tokenBuyer: bot?.Buyer,
        accessOwnerId: accessRec?.ownerId,
      })
    ) {
      throw new ForbiddenException('Not allowed for this bot');
    }
  }

  @Get(':botId/commands')
  async list(@Req() req: any, @Param('botId') botId: string) {
    await this.assertOwner(req.user, botId);
    const { prefix, commands } = await this.commands.listCommands(botId);
    return { botId, prefix, commands };
  }

  @Patch(':botId/commands')
  async patch(
    @Req() req: any,
    @Param('botId') botId: string,
    @Body() body: CommandsPatchDto,
  ) {
    await this.assertOwner(req.user, botId);
    const actor = String(req.user?.sub || 'dashboard');

    try {
      for (const u of body.updates || []) {
        if (typeof u.enabled === 'boolean') {
          await this.commands.setEnabled(botId, u.commandName, u.enabled);
          await this.audit.write(
            botId,
            u.enabled ? 'command_enable' : 'command_disable',
            { commandName: u.commandName },
            actor,
          );
        }
        if (typeof u.prefixEnabled === 'boolean') {
          await this.commands.setModeEnabled(
            botId,
            u.commandName,
            'prefix',
            u.prefixEnabled,
          );
          await this.audit.write(
            botId,
            u.prefixEnabled ? 'command_prefix_enable' : 'command_prefix_disable',
            { commandName: u.commandName },
            actor,
          );
        }
        if (typeof u.slashEnabled === 'boolean') {
          await this.commands.setModeEnabled(
            botId,
            u.commandName,
            'slash',
            u.slashEnabled,
          );
          await this.audit.write(
            botId,
            u.slashEnabled ? 'command_slash_enable' : 'command_slash_disable',
            { commandName: u.commandName },
            actor,
          );
        }
      }
      for (const a of body.aliases?.remove || []) {
        await this.commands.removeAlias(botId, a.commandName, a.alias);
        await this.audit.write(
          botId,
          'alias_remove',
          { commandName: a.commandName, alias: a.alias },
          actor,
        );
      }
      for (const a of body.aliases?.add || []) {
        await this.commands.addAlias(
          botId,
          a.commandName,
          a.alias,
          Boolean(a.requirePrefix),
        );
        await this.audit.write(
          botId,
          'alias_add',
          {
            commandName: a.commandName,
            alias: a.alias,
            requirePrefix: Boolean(a.requirePrefix),
          },
          actor,
        );
      }
      for (const ch of body.channels || []) {
        await this.commands.setAllowedChannels(
          botId,
          ch.commandName,
          ch.channelIds || [],
        );
        await this.audit.write(
          botId,
          'command_channels',
          { commandName: ch.commandName, channelIds: ch.channelIds },
          actor,
        );
      }
      for (const r of body.roles || []) {
        await this.commands.setAllowedRoles(
          botId,
          r.commandName,
          r.roleIds || [],
        );
        await this.audit.write(
          botId,
          'command_roles',
          { commandName: r.commandName, roleIds: r.roleIds },
          actor,
        );
      }
      for (const p of body.permissions || []) {
        await this.commands.setRequiredPermissions(
          botId,
          p.commandName,
          p.permissions || [],
        );
        await this.audit.write(
          botId,
          'command_permissions',
          { commandName: p.commandName, permissions: p.permissions },
          actor,
        );
      }
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      throw new BadRequestException(err?.message || 'Failed to update commands');
    }

    const { prefix, commands } = await this.commands.listCommands(botId);
    return { botId, prefix, commands };
  }
}
