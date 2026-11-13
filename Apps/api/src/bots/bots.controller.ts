import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsEmail, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { userOwnsBot } from '../auth/ownership';
import { ApplyStoreService } from '../apply/apply-store.service';
import { ApplyAuditService } from '../apply/apply-audit.service';
import { ProvisionService } from '../dashboard/provision.service';
import { DashboardAccessService } from '../dashboard/dashboard-access.service';
import { BotAdminsService } from '../dashboard/bot-admins.service';
import { SubscriptionStatusService } from './subscription-status.service';
import { BotRenewService } from './bot-renew.service';

class InviteAdminDto {
  @IsEmail()
  @IsString()
  email: string;
}

@Controller('bots')
@UseGuards(JwtAuthGuard)
export class BotsController {
  constructor(
    private readonly store: ApplyStoreService,
    private readonly provision: ProvisionService,
    private readonly access: DashboardAccessService,
    private readonly admins: BotAdminsService,
    private readonly audit: ApplyAuditService,
    private readonly subs: SubscriptionStatusService,
    private readonly renewSvc: BotRenewService,
  ) {}

  private async mapBot(
    b: any,
    extra: Record<string, unknown> = {},
    runtime?: Record<string, boolean>,
  ) {
    const clientId = b.ClientID;
    const access = await this.access.getByClientId(clientId);
    const id = String(clientId);
    const guild = b.Server || b.guild || b.Servers?.[0] || null;
    const renewPrice =
      extra.renewPrice != null
        ? Number(extra.renewPrice)
        : await this.subs.getRenewPrice(String(b.Type || 'System'), guild);
    const sub =
      b.__sub ||
      this.subs.describe(b, {
        renewPrice,
        forceGrace: Boolean(extra.forceGrace),
      });
    const locked = Boolean(sub.locked);
    const running = locked
      ? false
      : runtime && Object.prototype.hasOwnProperty.call(runtime, id)
        ? Boolean(runtime[id])
        : await this.store.isRunningAsync(clientId);
    const {
      forceGrace: _fg,
      renewPrice: _rp,
      ...publicExtra
    } = extra as Record<string, unknown>;
    return {
      clientId,
      type: b.Type,
      owner: b.Owner || null,
      guild,
      endTime: sub.endTime || b.endTime || null,
      running,
      source: (publicExtra.source as string) || 'tokens',
      dashboardUrl: access?.dashboardUrl || null,
      slug: access?.slug || null,
      accessRole: (publicExtra.accessRole as 'owner' | 'admin') || 'owner',
      subscriptionStatus: sub.subscriptionStatus,
      graceUntil: sub.graceUntil,
      graceMsLeft: sub.graceMsLeft,
      graceDaysLeft: sub.graceDaysLeft,
      locked,
      renewable: sub.renewable,
      renewPrice: sub.renewPrice ?? renewPrice,
      ...publicExtra,
    };
  }

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

  /** All bots owned by the logged-in Discord user (+ admin-only bots). */
  @Get('mine')
  async listMine(@Req() req: any) {
    const discordId = String(req.user?.sub || '');
    const bots = await this.store.listAllBotsAsync();
    const list = bots.filter((b: any) => {
      const owner = String(b?.Owner || '');
      const buyer = String(b?.Buyer || '');
      return owner === discordId || buyer === discordId;
    });

    const runtime = await this.store.getRuntimeMapAsync();
    const mapped = await Promise.all(
      list.map((b: any) => this.mapBot(b, {}, runtime)),
    );
    const seen = new Set(mapped.map((m) => String(m.clientId)));

    // Merge grace-locked bots removed from Tokens
    for (const graceBot of await this.subs.listGraceBotsForOwner(discordId)) {
      const id = String(graceBot.ClientID);
      if (seen.has(id)) {
        const idx = mapped.findIndex((m) => String(m.clientId) === id);
        if (idx >= 0) {
          mapped[idx] = await this.mapBot(
            graceBot,
            { source: 'grace', forceGrace: true },
            runtime,
          );
        }
        continue;
      }
      mapped.push(
        await this.mapBot(
          graceBot,
          { source: 'grace', forceGrace: true },
          runtime,
        ),
      );
      seen.add(id);
    }

    for (const record of await this.access.listAll()) {
      if (String(record.ownerId || '') !== discordId) continue;
      if (seen.has(String(record.clientId))) continue;
      const id = String(record.clientId);
      // Ghost access after permanent purge — hide from My Bots
      const live =
        (await this.store.getBotAsync(id)) || this.store.getBot(id);
      if (!live) {
        const purged = await this.subs.isPermanentlyPurged(id);
        if (purged) continue;
        // No Tokens row and no BotInstance → orphan access, do not show Manage
        continue;
      }
      const row = await this.mapBot(live, { source: 'access' }, runtime);
      mapped.push({
        ...row,
        dashboardUrl: record.dashboardUrl || row.dashboardUrl,
        slug: record.slug || row.slug,
      });
      seen.add(id);
    }

    for (const clientId of await this.admins.adminBotIdsForUser(discordId)) {
      if (seen.has(String(clientId))) continue;
      const bot =
        (await this.store.getBotAsync(clientId)) || this.store.getBot(clientId);
      const access = await this.access.getByClientId(clientId);
      const stub = {
        ClientID: clientId,
        Type: bot?.Type || access?.type || 'Apply',
        Owner: bot?.Owner || access?.ownerId || null,
        Server: bot?.Server || access?.guildId || null,
        guild: bot?.Server || access?.guildId || null,
        endTime: bot?.endTime || null,
      };
      const row = await this.mapBot(
        stub,
        { source: 'admin', accessRole: 'admin' as const },
        runtime,
      );
      mapped.push({
        ...row,
        dashboardUrl: access?.dashboardUrl || row.dashboardUrl,
        slug: access?.slug || row.slug,
        accessRole: 'admin' as const,
      });
      seen.add(String(clientId));
    }

    return mapped;
  }

  @Post(':botId/renew')
  async renewBot(@Param('botId') botId: string, @Req() req: any) {
    const discordId = String(req.user?.sub || '');
    const result = await this.renewSvc.renew(botId, discordId);
    const bot =
      this.store.getBot(botId) ||
      (await this.store.getBotAsync(botId)) || {
        ClientID: result.clientId,
        Type: result.type,
        endTime: result.endTime,
        Owner: discordId,
        Server: null,
      };
    return this.mapBot(
      { ...bot, endTime: result.endTime },
      {
        source: 'tokens',
        renewPrice: result.renewPrice ?? result.deducted,
        deducted: result.deducted,
        balanceAfter: result.balanceAfter,
      },
    );
  }

  /** Apply-only list for the logged-in Discord owner. */
  @Get('apply')
  async listApplyBots(@Req() req: any) {
    const all = await this.listMine(req);
    return all.filter(
      (b: any) => String(b.type || '').toLowerCase() === 'apply',
    );
  }

  @Get(':clientId/access')
  async getAccess(@Param('clientId') clientId: string, @Req() req: any) {
    await this.assertOwner(req.user, clientId);
    const accessRec = await this.access.getByClientId(clientId);
    return (
      accessRec || (await this.provision.ensureAccessForExistingBot(clientId))
    );
  }

  @Post(':clientId/access')
  async createAccess(@Param('clientId') clientId: string, @Req() req: any) {
    await this.assertOwner(req.user, clientId);
    return this.provision.ensureAccessForExistingBot(clientId);
  }

  @Get(':clientId/admins')
  async listAdmins(@Param('clientId') clientId: string, @Req() req: any) {
    await this.assertOwner(req.user, clientId);
    return await this.admins.listForBot(clientId);
  }

  @Post(':clientId/admins')
  async inviteAdmin(
    @Param('clientId') clientId: string,
    @Body() body: InviteAdminDto,
    @Req() req: any,
  ) {
    await this.assertOwner(req.user, clientId);
    const actor = String(req.user.sub);
    const invite = await this.admins.invite({
      clientId,
      email: body.email,
      invitedBy: actor,
    });
    await this.audit.write(
      clientId,
      'admin_invite',
      { email: body.email, slug: invite.slug },
      actor,
    );
    return invite;
  }

  @Delete(':clientId/admins/:slug')
  async revokeAdmin(
    @Param('clientId') clientId: string,
    @Param('slug') slug: string,
    @Req() req: any,
  ) {
    await this.assertOwner(req.user, clientId);
    const actor = String(req.user.sub);
    const result = await this.admins.revoke(clientId, slug);
    await this.audit.write(clientId, 'admin_revoke', { slug }, actor);
    return result;
  }
}
