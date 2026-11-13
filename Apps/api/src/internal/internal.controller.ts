import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InternalApiKeyGuard } from './internal-api-key.guard';
import { BotInstanceRepository } from '../prisma/repositories/bot-instance.repository';
import { BotRuntimeRepository } from '../prisma/repositories/bot-runtime.repository';
import { ApplyRepository } from '../prisma/repositories/apply.repository';
import { BotJobRepository } from '../prisma/repositories/bot-job.repository';
import { ApplyStoreService } from '../apply/apply-store.service';
import { DataConsistencyService } from '../prisma/data-consistency.service';
import { FeatureRepository } from '../prisma/repositories/feature.repository';
import { PlatformRepository } from '../prisma/repositories/platform.repository';
import { DashboardAccessService } from '../dashboard/dashboard-access.service';
import {
  shouldReadPostgres,
  shouldShadowCompare,
  shouldWriteJson,
  shouldWritePostgres,
} from '@maker/database';

@Controller('internal')
@UseGuards(InternalApiKeyGuard)
export class InternalController {
  constructor(
    private readonly bots: BotInstanceRepository,
    private readonly runtime: BotRuntimeRepository,
    private readonly apply: ApplyRepository,
    private readonly jobs: BotJobRepository,
    private readonly store: ApplyStoreService,
    private readonly consistency: DataConsistencyService,
    private readonly features: FeatureRepository,
    private readonly platform: PlatformRepository,
    private readonly access: DashboardAccessService,
  ) {}

  @Get('health')
  health() {
    const metrics = this.consistency.getMetrics();
    return {
      ok: true,
      read: process.env.DATA_READ_SOURCE || 'json',
      write: process.env.DATA_WRITE_MODE || 'dual',
      shadowCompare: shouldShadowCompare(),
      mismatches: metrics.counters.mismatches,
      matches: metrics.counters.matches,
      compared: metrics.counters.compared,
      alerts: metrics.counters.alerts,
      alertArmed: metrics.window.alertArmed,
      mismatchRate: metrics.rates.mismatchRate,
    };
  }

  @Get('consistency/report')
  consistencyReport() {
    return this.consistency.getReport();
  }

  @Get('consistency/metrics')
  consistencyMetrics() {
    return this.consistency.getMetrics();
  }

  @Post('consistency/check')
  async consistencyCheck() {
    return this.store.runConsistencyCheck();
  }

  @Post('consistency/clear')
  consistencyClear() {
    this.consistency.clear();
    return { ok: true };
  }

  @Get('bots')
  async listBots(@Query('includeToken') includeToken?: string) {
    // Tokens omitted by default — require explicit includeToken=1
    const withToken = includeToken === '1' || includeToken === 'true';
    let bots = await this.store.listAllBotsAsync();
    if (!withToken) {
      bots = bots.map((b: any) => {
        const { Token, token, ...rest } = b;
        return rest;
      });
    }
    return { bots };
  }

  @Get('bots/:clientId')
  async getBot(
    @Param('clientId') clientId: string,
    @Query('includeToken') includeToken?: string,
  ) {
    const withToken = includeToken === '1' || includeToken === 'true';
    let bot = await this.store.getBotAsync(clientId);
    if (bot && !withToken) {
      const { Token, token, ...rest } = bot as any;
      bot = rest;
    }
    return { bot };
  }

  @Get('runtime')
  async runtimeMap() {
    return { runtime: await this.store.getRuntimeMapAsync() };
  }

  @Get('bots/:clientId/runtime')
  async getRuntime(@Param('clientId') clientId: string) {
    return {
      clientId,
      running: await this.store.isRunningAsync(clientId),
    };
  }

  @Patch('bots/:clientId/runtime')
  async setRuntime(
    @Param('clientId') clientId: string,
    @Body() body: { running?: boolean },
  ) {
    const running = Boolean(body?.running);
    await this.store.setRunningAsync(clientId, running);
    return { clientId, running };
  }

  @Get('bots/:clientId/apply/panels')
  async listPanels(@Param('clientId') clientId: string) {
    return { panels: await this.store.listPanelsAsync(clientId) };
  }

  @Get('bots/:clientId/apply/settings/:guildId')
  async getSettings(
    @Param('clientId') clientId: string,
    @Param('guildId') guildId: string,
  ) {
    return {
      settings: await this.store.getGuildSettingsAsync(clientId, guildId),
    };
  }

  @Patch('bots/:clientId/apply/settings/:guildId')
  async setSettings(
    @Param('clientId') clientId: string,
    @Param('guildId') guildId: string,
    @Body() body: any,
  ) {
    const settings = this.store.setGuildSettings(clientId, guildId, body || {});
    return { settings };
  }

  @Get('bots/:clientId/apply/pending')
  async listPending(@Param('clientId') clientId: string) {
    if (shouldReadPostgres()) {
      try {
        return { pending: await this.apply.listPending(clientId) };
      } catch {
        /* fall through */
      }
    }
    return { pending: this.store.listPending(clientId) };
  }

  @Post('bots/:clientId/apply/pending')
  async setPending(
    @Param('clientId') clientId: string,
    @Body() body: { items?: any[] },
  ) {
    const items = Array.isArray(body?.items) ? body.items : [];
    this.store.setPending(clientId, items);
    return { ok: true, count: items.length };
  }

  /** Flat key compatibility for Discord Apply handlers */
  @Get('apply/kv')
  async getKv(@Query('key') key: string) {
    if (!key) return { key, value: undefined };
    return { key, value: await this.store.getAsync(key) };
  }

  @Post('apply/kv')
  async setKv(@Body() body: { key: string; value: any }) {
    await this.store.setAsync(body.key, body.value);
    return { ok: true };
  }

  @Post('apply/kv/delete')
  async deleteKv(@Body() body: { key: string }) {
    await this.store.deleteAsync(body.key);
    return { ok: true };
  }

  @Get('bots/:clientId/jobs/claim')
  async claimJobs(
    @Param('clientId') clientId: string,
    @Query('limit') limit?: string,
  ) {
    if (!shouldReadPostgres() && !shouldWritePostgres()) {
      return { jobs: [], mode: 'json' };
    }
    try {
      const jobs = await this.jobs.claim(
        clientId,
        undefined,
        Math.min(Number(limit) || 20, 50),
      );
      return { jobs };
    } catch {
      return { jobs: [] };
    }
  }

  @Post('bots/:clientId/jobs/:jobId/complete')
  async completeJob(
    @Param('jobId') jobId: string,
    @Body() body: { ok?: boolean; error?: string },
  ) {
    await this.jobs.complete(jobId, body?.ok !== false, body?.error);
    return { ok: true };
  }

  @Post('bots/upsert')
  async upsertBot(@Body() body: { bot: any }) {
    if (shouldWriteJson()) {
      const bots = this.store.listAllBots();
      const idx = bots.findIndex(
        (b: any) => String(b.ClientID) === String(body.bot?.ClientID),
      );
      if (idx >= 0) bots[idx] = { ...bots[idx], ...body.bot };
      else bots.push(body.bot);
      await this.store.writeAllBotsAsync(bots);
    } else if (shouldWritePostgres()) {
      await this.bots.upsertFromLegacy(body.bot);
    }

    // Keep DashboardAccess in Postgres so /b/{slug} and My Bots work
    const bot = body?.bot;
    const clientId = String(bot?.ClientID || bot?.clientId || '');
    if (clientId) {
      try {
        await this.access.ensureAccess({
          clientId,
          type: bot?.Type || bot?.type || 'Apply',
          ownerId: bot?.Buyer || bot?.Owner || null,
          purchasesId: bot?.PurchasesID ?? null,
          guildId: bot?.Server || bot?.guild || bot?.Servers?.[0] || null,
          preferredSlug: bot?.dashboardSlug || null,
        });
      } catch (err: any) {
        console.warn(
          `[internal] dashboard access sync failed for ${clientId}: ${err?.message || err}`,
        );
      }
    }

    return { ok: true };
  }

  @Post('dashboard-access/ensure')
  async ensureDashboardAccess(
    @Body()
    body: {
      clientId: string;
      type?: string;
      ownerId?: string | null;
      purchasesId?: number | string | null;
      guildId?: string | null;
      preferredSlug?: string | null;
    },
  ) {
    return this.access.ensureAccess({
      clientId: String(body.clientId),
      type: body.type,
      ownerId: body.ownerId,
      purchasesId: body.purchasesId,
      guildId: body.guildId,
      preferredSlug: body.preferredSlug,
    });
  }

  /** Phase 2+: FeatureRecord KV */
  @Get('features/:namespace')
  async featureNamespace(@Param('namespace') namespace: string) {
    return { namespace, data: await this.features.getNamespaceMap(namespace) };
  }

  @Get('features/:namespace/kv')
  async featureGet(
    @Param('namespace') namespace: string,
    @Query('key') key: string,
  ) {
    return { namespace, key, value: await this.features.get(namespace, key) };
  }

  @Post('features/:namespace/kv')
  async featureSet(
    @Param('namespace') namespace: string,
    @Body() body: { key: string; value: any; botClientId?: string },
  ) {
    await this.features.set(
      namespace,
      body.key,
      body.value,
      body.botClientId,
    );
    return { ok: true };
  }

  @Post('features/:namespace/kv/delete')
  async featureDelete(
    @Param('namespace') namespace: string,
    @Body() body: { key: string },
  ) {
    await this.features.delete(namespace, body.key);
    return { ok: true };
  }

  @Get('platform/:namespace')
  async platformNamespace(@Param('namespace') namespace: string) {
    return { namespace, data: await this.platform.getNamespaceMap(namespace) };
  }

  @Get('platform/:namespace/kv')
  async platformGet(
    @Param('namespace') namespace: string,
    @Query('key') key: string,
  ) {
    return { namespace, key, value: await this.platform.get(namespace, key) };
  }

  @Post('platform/:namespace/kv')
  async platformSet(
    @Param('namespace') namespace: string,
    @Body() body: { key: string; value: any },
  ) {
    await this.platform.set(namespace, body.key, body.value);
    return { ok: true };
  }
}
