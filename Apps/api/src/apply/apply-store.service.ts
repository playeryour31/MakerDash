import { Injectable, Optional } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import {
  shouldReadPostgres,
  shouldShadowCompare,
  shouldWriteJson,
  shouldWritePostgres,
} from '@maker/database';
import { BotInstanceRepository } from '../prisma/repositories/bot-instance.repository';
import { BotRuntimeRepository } from '../prisma/repositories/bot-runtime.repository';
import { ApplyRepository } from '../prisma/repositories/apply.repository';
import { PrismaService } from '../prisma/prisma.service';
import {
  DataConsistencyService,
  normalizeBotForCompare,
} from '../prisma/data-consistency.service';

/**
 * Apply + Tokens + RunBots store with Phase-1 dual-write/read flags.
 * Shadow-compare (JSON vs PG) runs on async reads while dual+json-read.
 */
@Injectable()
export class ApplyStoreService {
  private applyFile = path.resolve(
    process.cwd(),
    'Maker',
    'Json-Database',
    'Settings',
    'Apply.json',
  );
  private tokensFile = path.resolve(
    process.cwd(),
    'Database',
    'Others',
    'Tokens.json',
  );
  private runFile = path.resolve(
    process.cwd(),
    'Database',
    'BotMaker',
    'RunBots.json',
  );
  private languageFile = path.resolve(
    process.cwd(),
    'Database',
    'Others',
    'Language.json',
  );

  /** In-process desired-running cache (survives JSON/PG lag for sync reads). */
  private runtimeMemory = new Map<string, boolean>();

  constructor(
    @Optional() private readonly botsRepo?: BotInstanceRepository,
    @Optional() private readonly runtimeRepo?: BotRuntimeRepository,
    @Optional() private readonly applyRepo?: ApplyRepository,
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly consistency?: DataConsistencyService,
  ) {}

  private readJsonFile(file: string): any {
    try {
      if (!fs.existsSync(file)) return {};
      return JSON.parse(fs.readFileSync(file, 'utf8')) || {};
    } catch {
      return {};
    }
  }

  private writeJsonFile(file: string, payload: any) {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
    fs.renameSync(tmp, file);
  }

  private async pgReady() {
    return Boolean(this.prisma && (await this.prisma.isReady()));
  }

  private async safePg<T>(fn: () => Promise<T>): Promise<T | null> {
    try {
      if (!(await this.pgReady())) return null;
      return await fn();
    } catch (err: any) {
      console.warn(`[apply-store] postgres op failed: ${err?.message || err}`);
      return null;
    }
  }

  private shadowEnabled() {
    return Boolean(this.consistency?.isEnabled() && shouldShadowCompare());
  }

  /** When JSON is primary, only pay for a PG read if this shadow attempt is sampled. */
  private shouldFetchPgForShadow() {
    if (!this.shadowEnabled() || !this.consistency) return false;
    return this.consistency.beginAttempt();
  }

  listAllBots() {
    const raw = this.readJsonFile(this.tokensFile);
    return Array.isArray(raw.Bots) ? raw.Bots : [];
  }

  async listAllBotsAsync() {
    const jsonBots = this.listAllBots();

    if (shouldReadPostgres()) {
      const pgBots = await this.safePg(() => this.botsRepo!.listAll(true));
      if (this.shadowEnabled() && pgBots && this.consistency) {
        this.consistency.compareBotLists(jsonBots, pgBots);
      }
      if (pgBots) return pgBots;
      return jsonBots;
    }

    if (this.shouldFetchPgForShadow()) {
      const pgBots = await this.safePg(() => this.botsRepo!.listAll(true));
      if (pgBots) {
        this.consistency!.compareBotLists(jsonBots, pgBots, {
          skipAttemptAccounting: true,
        });
      }
    }
    return jsonBots;
  }

  listApplyBots() {
    return this.listAllBots().filter(
      (b: any) => String(b?.Type || '').toLowerCase() === 'apply',
    );
  }

  async listApplyBotsAsync() {
    const bots = await this.listAllBotsAsync();
    return bots.filter(
      (b: any) => String(b?.Type || '').toLowerCase() === 'apply',
    );
  }

  getBot(clientId: string) {
    return (
      this.listAllBots().find(
        (b: any) => String(b.ClientID) === String(clientId),
      ) || null
    );
  }

  async getBotAsync(clientId: string) {
    const jsonBot = this.getBot(clientId);

    if (shouldReadPostgres()) {
      const pgBot = await this.safePg(() =>
        this.botsRepo!.findByClientId(String(clientId), true),
      );
      if (this.shadowEnabled() && pgBot !== null) {
        this.consistency!.shadowAlways(
          'bots',
          String(clientId),
          jsonBot,
          pgBot,
          normalizeBotForCompare,
        );
      }
      if (pgBot) return pgBot;
      return jsonBot;
    }

    if (this.shouldFetchPgForShadow()) {
      const pgBot = await this.safePg(() =>
        this.botsRepo!.findByClientId(String(clientId), true),
      );
      if (pgBot !== null) {
        this.consistency!.shadowForced(
          'bots',
          String(clientId),
          jsonBot,
          pgBot,
          normalizeBotForCompare,
        );
      }
    }
    return jsonBot;
  }

  writeAllBots(bots: any[]) {
    if (shouldWriteJson()) {
      const existing = this.readJsonFile(this.tokensFile);
      this.writeJsonFile(this.tokensFile, { ...existing, Bots: bots });
    }
    if (shouldWritePostgres() && this.botsRepo) {
      void this.safePg(() => this.botsRepo!.replaceAllFromLegacy(bots));
    }
  }

  async writeAllBotsAsync(bots: any[]) {
    if (shouldWriteJson()) {
      const existing = this.readJsonFile(this.tokensFile);
      this.writeJsonFile(this.tokensFile, { ...existing, Bots: bots });
    }
    if (shouldWritePostgres()) {
      await this.safePg(() => this.botsRepo!.replaceAllFromLegacy(bots));
    }
  }

  private writeRuntimeJson(clientId: string, running: boolean) {
    const id = String(clientId);
    const raw = this.readJsonFile(this.runFile);
    raw[id] = Boolean(running);
    this.writeJsonFile(this.runFile, raw);
  }

  /**
   * Runtime is always mirrored to RunBots.json — even when DATA_WRITE_MODE=postgres —
   * so Maker's file fallback cannot resurrect a stopped bot from stale JSON.
   */
  private persistRuntimeLocal(clientId: string, running: boolean) {
    const id = String(clientId);
    const value = Boolean(running);
    this.runtimeMemory.set(id, value);
    if (shouldWriteJson()) {
      this.writeRuntimeJson(id, value);
    }
    return value;
  }

  isRunning(clientId: string) {
    const id = String(clientId);
    if (this.runtimeMemory.has(id)) return this.runtimeMemory.get(id)!;
    const raw = this.readJsonFile(this.runFile);
    return Boolean(raw?.[id]);
  }

  getRuntimeMapJson(): Record<string, boolean> {
    const raw = this.readJsonFile(this.runFile);
    const out: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(raw || {})) {
      out[String(k)] = Boolean(v);
    }
    // Overlay in-memory desired state (authoritative after stop/start in this process)
    for (const [k, v] of this.runtimeMemory.entries()) {
      out[k] = v;
    }
    return out;
  }

  async getRuntimeMapAsync(): Promise<Record<string, boolean>> {
    const jsonMap = this.getRuntimeMapJson();

    if (shouldReadPostgres()) {
      const pgMap = await this.safePg(() => this.runtimeRepo!.getMap());
      if (this.shadowEnabled() && pgMap) {
        this.consistency!.compareRuntimeMaps(jsonMap, pgMap);
      }
      if (pgMap) {
        // Memory/JSON overlays win for keys we explicitly set this process
        const merged = { ...pgMap };
        for (const [k, v] of this.runtimeMemory.entries()) {
          merged[k] = v;
        }
        return merged;
      }
      return jsonMap;
    }

    if (this.shouldFetchPgForShadow()) {
      const pgMap = await this.safePg(() => this.runtimeRepo!.getMap());
      if (pgMap) {
        this.consistency!.compareRuntimeMaps(jsonMap, pgMap, {
          skipAttemptAccounting: true,
        });
      }
    }
    return jsonMap;
  }

  async isRunningAsync(clientId: string) {
    const id = String(clientId);
    if (this.runtimeMemory.has(id)) return this.runtimeMemory.get(id)!;

    const jsonRunning = this.isRunning(id);

    if (shouldReadPostgres()) {
      const pgRunning = await this.safePg(() =>
        this.runtimeRepo!.isRunning(id),
      );
      if (this.shadowEnabled() && pgRunning !== null) {
        this.consistency!.shadowAlways(
          'runtime',
          id,
          jsonRunning,
          Boolean(pgRunning),
        );
      }
      // null = missing row / PG unavailable → fall back to JSON
      if (pgRunning !== null) return Boolean(pgRunning);
      return jsonRunning;
    }

    if (this.shouldFetchPgForShadow()) {
      const pgRunning = await this.safePg(() =>
        this.runtimeRepo!.isRunning(id),
      );
      if (pgRunning !== null) {
        this.consistency!.shadowForced(
          'runtime',
          id,
          jsonRunning,
          Boolean(pgRunning),
        );
      }
    }
    return jsonRunning;
  }

  /**
   * BotRuntime FK requires BotInstance. Heal from Tokens.json when PG is missing a row
   * (common after partial imports / new System bots created before sync).
   */
  private async ensureBotInstanceInPg(clientId: string): Promise<boolean> {
    if (!this.botsRepo) return false;
    const id = String(clientId);
    const existing = await this.safePg(() =>
      this.botsRepo!.findByClientId(id, false),
    );
    if (existing) return true;

    const fromJson = this.getBot(id);
    if (!fromJson || !(fromJson.Token || fromJson.token)) {
      console.warn(
        `[apply-store] cannot heal BotInstance ${id}: no Tokens.json entry with token`,
      );
      return false;
    }

    const saved = await this.safePg(() =>
      this.botsRepo!.upsertFromLegacy(fromJson),
    );
    if (saved) {
      console.log(`[apply-store] healed BotInstance ${id} from Tokens.json`);
      return true;
    }
    return false;
  }

  setRunning(clientId: string, running: boolean) {
    const value = this.persistRuntimeLocal(clientId, running);
    if (shouldWritePostgres() && this.runtimeRepo) {
      void (async () => {
        await this.ensureBotInstanceInPg(String(clientId));
        const saved = await this.safePg(() =>
          this.runtimeRepo!.setRunning(String(clientId), value),
        );
        if (saved === null) {
          console.warn(
            `[apply-store] runtime PG write skipped/failed for ${clientId}; JSON mirror kept at ${value}`,
          );
        }
      })();
    }
    return value;
  }

  async setRunningAsync(clientId: string, running: boolean) {
    const value = this.persistRuntimeLocal(clientId, running);
    if (shouldWritePostgres() && this.runtimeRepo) {
      await this.ensureBotInstanceInPg(String(clientId));
      const saved = await this.safePg(() =>
        this.runtimeRepo!.setRunning(String(clientId), value),
      );
      if (saved === null) {
        console.warn(
          `[apply-store] runtime PG write skipped/failed for ${clientId}; JSON mirror kept at ${value}`,
        );
      }
    }
    return value;
  }

  getAllApplyEntries() {
    const raw = this.readJsonFile(this.applyFile);
    return Object.entries(raw).map(([ID, data]) => ({ ID, data }));
  }

  get(key: string) {
    const raw = this.readJsonFile(this.applyFile);
    return raw[key];
  }

  async getAsync(key: string) {
    const jsonValue = this.get(key);

    if (shouldReadPostgres()) {
      const pgValue = await this.safePg(() =>
        this.applyRepo!.getByLegacyKey(key),
      );
      if (this.shadowEnabled() && (await this.pgReady())) {
        this.consistency!.shadowAlways('apply_kv', key, jsonValue, pgValue);
      }
      if (pgValue !== null && pgValue !== undefined) return pgValue;
      if (pgValue === undefined && (await this.pgReady())) return undefined;
      return jsonValue;
    }

    if (this.shouldFetchPgForShadow()) {
      const pgValue = await this.safePg(() =>
        this.applyRepo!.getByLegacyKey(key),
      );
      this.consistency!.shadowForced('apply_kv', key, jsonValue, pgValue);
    }
    return jsonValue;
  }

  set(key: string, value: any) {
    if (shouldWriteJson()) {
      const raw = this.readJsonFile(this.applyFile);
      raw[key] = value;
      this.writeJsonFile(this.applyFile, raw);
    }
    if (shouldWritePostgres() && this.applyRepo) {
      void this.safePg(() => this.applyRepo!.setByLegacyKey(key, value));
    }
    return value;
  }

  async setAsync(key: string, value: any) {
    if (shouldWriteJson()) {
      const raw = this.readJsonFile(this.applyFile);
      raw[key] = value;
      this.writeJsonFile(this.applyFile, raw);
    }
    if (shouldWritePostgres()) {
      await this.safePg(() => this.applyRepo!.setByLegacyKey(key, value));
    }
    return value;
  }

  delete(key: string) {
    if (shouldWriteJson()) {
      const raw = this.readJsonFile(this.applyFile);
      delete raw[key];
      this.writeJsonFile(this.applyFile, raw);
    }
    if (shouldWritePostgres() && this.applyRepo) {
      void this.safePg(() => this.applyRepo!.deleteByLegacyKey(key));
    }
    return true;
  }

  async deleteAsync(key: string) {
    if (shouldWriteJson()) {
      const raw = this.readJsonFile(this.applyFile);
      delete raw[key];
      this.writeJsonFile(this.applyFile, raw);
    }
    if (shouldWritePostgres()) {
      await this.safePg(() => this.applyRepo!.deleteByLegacyKey(key));
    }
    return true;
  }

  listPanels(botId: string) {
    const all = this.getAllApplyEntries();
    const panels: any[] = [];
    const prefix = 'appData_';
    const suffix = `_${botId}`;

    for (const entry of all) {
      const id = (entry as any).ID || (entry as any).id;
      if (!id || typeof id !== 'string') continue;
      if (!id.startsWith(prefix) || !id.endsWith(suffix)) continue;

      const messageId = id.slice(prefix.length, id.length - suffix.length);
      if (!messageId) continue;

      const status = this.get(`applectionStatus_${messageId}_${botId}`) || 'on';
      const applied = this.get(`Applied_${messageId}_${botId}`) || [];

      panels.push({
        messageId,
        botId,
        status,
        appliedCount: Array.isArray(applied) ? applied.length : 0,
        applied: Array.isArray(applied) ? applied : [],
        ...(entry.data && typeof entry.data === 'object' ? entry.data : {}),
      });
    }
    return panels;
  }

  async listPanelsAsync(botId: string) {
    const jsonPanels = this.listPanels(botId);

    if (shouldReadPostgres()) {
      const pgPanels = await this.safePg(() =>
        this.applyRepo!.listPanels(botId),
      );
      if (this.shadowEnabled() && pgPanels) {
        this.consistency!.comparePanelLists(botId, jsonPanels, pgPanels);
      }
      if (pgPanels) return pgPanels;
      return jsonPanels;
    }

    if (this.shouldFetchPgForShadow()) {
      const pgPanels = await this.safePg(() =>
        this.applyRepo!.listPanels(botId),
      );
      if (pgPanels) {
        this.consistency!.comparePanelLists(botId, jsonPanels, pgPanels, {
          skipAttemptAccounting: true,
        });
      }
    }
    return jsonPanels;
  }

  getGuildSettings(botId: string, guildId: string) {
    return {
      adminRoleId: this.get(`applyAdmin_${guildId}_${botId}`) || null,
      logsChannelId: this.get(`resultsLog_${guildId}_${botId}`) || null,
      resultsChannelId: this.get(`resultsLog_${guildId}_${botId}`) || null,
      language: this.getBotLanguage(botId),
      dmMode: this.get(`dm_Mode_${guildId}_${botId}`) || {
        accept: 'off',
        reject: 'off',
      },
    };
  }

  async getGuildSettingsAsync(botId: string, guildId: string) {
    const jsonSettings = this.getGuildSettings(botId, guildId);

    const buildPg = async () => {
      const pgPartial = await this.safePg(() =>
        this.applyRepo!.getGuildSettings(botId, guildId),
      );
      if (!pgPartial) return null;
      const language = shouldReadPostgres()
        ? await this.getBotLanguageAsync(botId)
        : (await this.safePg(() => this.botsRepo!.getLanguage(botId))) ||
          this.getBotLanguage(botId);
      return { ...pgPartial, language };
    };

    if (shouldReadPostgres()) {
      const pgSettings = await buildPg();
      if (this.shadowEnabled() && pgSettings) {
        this.consistency!.compareSettings(
          botId,
          guildId,
          jsonSettings,
          pgSettings,
        );
      }
      if (pgSettings) return pgSettings;
      return jsonSettings;
    }

    if (this.shouldFetchPgForShadow()) {
      const pgSettings = await buildPg();
      if (pgSettings) {
        this.consistency!.compareSettings(
          botId,
          guildId,
          jsonSettings,
          pgSettings,
          { skipAttemptAccounting: true },
        );
      }
    }
    return jsonSettings;
  }

  getBotLanguage(botId: string): 'Ar' | 'En' {
    const raw = this.readJsonFile(this.languageFile);
    const value = raw?.[String(botId)];
    return value === 'En' ? 'En' : 'Ar';
  }

  async getBotLanguageAsync(botId: string): Promise<'Ar' | 'En'> {
    const jsonLang = this.getBotLanguage(botId);

    if (shouldReadPostgres()) {
      const pgLang = await this.safePg(() =>
        this.botsRepo!.getLanguage(botId),
      );
      if (this.shadowEnabled() && pgLang) {
        this.consistency!.shadowAlways(
          'language',
          String(botId),
          jsonLang,
          pgLang,
        );
      }
      if (pgLang) return pgLang;
      return jsonLang;
    }

    if (this.shouldFetchPgForShadow()) {
      const pgLang = await this.safePg(() =>
        this.botsRepo!.getLanguage(botId),
      );
      if (pgLang) {
        this.consistency!.shadowForced(
          'language',
          String(botId),
          jsonLang,
          pgLang,
        );
      }
    }
    return jsonLang;
  }

  setBotLanguage(botId: string, language: 'Ar' | 'En') {
    if (shouldWriteJson()) {
      const raw = this.readJsonFile(this.languageFile);
      raw[String(botId)] = language === 'En' ? 'En' : 'Ar';
      this.writeJsonFile(this.languageFile, raw);
    }
    if (shouldWritePostgres() && this.botsRepo) {
      void this.safePg(() => this.botsRepo!.setLanguage(botId, language));
    }
    return this.getBotLanguage(botId);
  }

  async setBotLanguageAsync(botId: string, language: 'Ar' | 'En') {
    if (shouldWriteJson()) {
      const raw = this.readJsonFile(this.languageFile);
      raw[String(botId)] = language === 'En' ? 'En' : 'Ar';
      this.writeJsonFile(this.languageFile, raw);
    }
    if (shouldWritePostgres()) {
      await this.safePg(() => this.botsRepo!.setLanguage(botId, language));
    }
    return this.getBotLanguageAsync(botId);
  }

  setGuildSettings(
    botId: string,
    guildId: string,
    data: {
      adminRoleId?: string;
      logsChannelId?: string;
      resultsChannelId?: string;
      language?: 'Ar' | 'En';
      dmMode?: { accept: string; reject: string };
    },
  ) {
    if (data.adminRoleId !== undefined) {
      this.set(`applyAdmin_${guildId}_${botId}`, data.adminRoleId);
    }
    const logsChannelId =
      data.logsChannelId !== undefined
        ? data.logsChannelId
        : data.resultsChannelId;
    if (logsChannelId !== undefined) {
      const value = String(logsChannelId || '').trim();
      if (value) this.set(`resultsLog_${guildId}_${botId}`, value);
      else this.delete(`resultsLog_${guildId}_${botId}`);
    }
    if (data.language === 'Ar' || data.language === 'En') {
      this.setBotLanguage(botId, data.language);
    }
    if (data.dmMode) {
      this.set(`dm_Mode_${guildId}_${botId}`, data.dmMode);
    }
    if (shouldWritePostgres() && this.applyRepo) {
      void this.safePg(() =>
        this.applyRepo!.setGuildSettings(botId, guildId, {
          adminRoleId: data.adminRoleId,
          logsChannelId:
            logsChannelId !== undefined
              ? String(logsChannelId || '').trim() || null
              : undefined,
          dmMode: data.dmMode,
        }),
      );
    }
    return this.getGuildSettings(botId, guildId);
  }

  queueCreatePanel(botId: string, payload: Record<string, any>) {
    void this.enqueueBull('panel.create', botId, payload);
    if (shouldWriteJson()) {
      return this.set(`Create_Applection_${botId}`, payload);
    }
    return true;
  }

  queueUpdatePanel(botId: string, payload: Record<string, any>) {
    void this.enqueueBull('panel.update', botId, payload);
    if (shouldWriteJson()) {
      return this.set(`Applection_Update_Data_${botId}`, payload);
    }
    return true;
  }

  queueDeletePanel(botId: string, payload: Record<string, any>) {
    void this.enqueueBull('panel.delete', botId, payload);
    if (shouldWriteJson()) {
      return this.set(`Delete_Applection_${botId}`, payload);
    }
    return true;
  }

  removePanelData(botId: string, messageId: string) {
    this.delete(`appData_${messageId}_${botId}`);
    this.delete(`applectionStatus_${messageId}_${botId}`);
    this.delete(`Applied_${messageId}_${botId}`);
    return true;
  }

  queueAction(botId: string, payload: Record<string, any>) {
    const enriched = { ...payload, queuedAt: new Date().toISOString() };
    void this.enqueueBull('apply.action', botId, enriched);
    if (shouldWriteJson()) {
      const key = `Dashboard_Apply_Action_${botId}`;
      const queue = this.get(key) || [];
      const list = Array.isArray(queue) ? queue : [];
      list.push(enriched);
      return this.set(key, list);
    }
    return true;
  }

  getLogsChannel(botId: string): { guildId: string; channelId: string } | null {
    const bot = this.getBot(botId);
    const panels = this.listPanels(botId);
    const guildId = String(
      bot?.Server || bot?.guild || panels[0]?.guild || '',
    ).trim();
    if (!guildId) return null;
    const channelId = String(
      this.get(`resultsLog_${guildId}_${botId}`) || '',
    ).trim();
    if (!channelId) return null;
    return { guildId, channelId };
  }

  queueDashboardLog(botId: string, payload: Record<string, any>) {
    const target = this.getLogsChannel(botId);
    if (!target) return false;
    const enriched = {
      ...payload,
      guildId: target.guildId,
      channelId: target.channelId,
      queuedAt: new Date().toISOString(),
    };
    void this.enqueueBull('dashboard.log', botId, enriched);
    if (shouldWriteJson()) {
      const key = `Dashboard_Logs_${botId}`;
      const queue = this.get(key) || [];
      const list = Array.isArray(queue) ? queue : [];
      list.push(enriched);
      this.set(key, list.slice(-100));
    }
    return true;
  }

  private async enqueueBull(
    kind:
      | 'panel.create'
      | 'panel.update'
      | 'panel.delete'
      | 'apply.action'
      | 'dashboard.log',
    botId: string,
    payload: Record<string, any>,
  ) {
    try {
      const q = await import('@maker/queue');
      const data = { botClientId: String(botId), payload };
      if (kind === 'panel.create') await q.enqueuePanelCreate(data);
      else if (kind === 'panel.update') await q.enqueuePanelUpdate(data);
      else if (kind === 'panel.delete') await q.enqueuePanelDelete(data);
      else if (kind === 'apply.action') await q.enqueueApplyAction(data);
      else await q.enqueueDashboardLog(data);
    } catch (err: any) {
      console.warn(`[apply-store] bullmq enqueue failed: ${err?.message || err}`);
      if (this.applyRepo && shouldWritePostgres()) {
        const kindMap: Record<string, any> = {
          'panel.create': 'CREATE_PANEL',
          'panel.update': 'UPDATE_PANEL',
          'panel.delete': 'DELETE_PANEL',
          'apply.action': 'APPLY_ACTION',
          'dashboard.log': 'DASHBOARD_LOG',
        };
        void this.safePg(() =>
          this.prisma!.botJob.create({
            data: {
              botClientId: String(botId),
              kind: kindMap[kind],
              status: 'pending',
              payload,
            },
          }),
        );
      }
    }
  }

  listPending(botId: string) {
    return this.get(`Pending_Applications_${botId}`) || [];
  }

  setPending(botId: string, items: any[]) {
    return this.set(`Pending_Applications_${botId}`, items);
  }

  /** Full consistency sweep for cutover readiness. */
  async runConsistencyCheck() {
    const report: Record<string, any> = {
      at: new Date().toISOString(),
      shadowEnabled: this.shadowEnabled(),
    };

    const jsonBots = this.listAllBots();
    const pgBots = (await this.safePg(() => this.botsRepo!.listAll(true))) || [];
    report.bots = this.consistency
      ? this.consistency.compareBotLists(jsonBots, pgBots)
      : { skipped: true };

    const jsonRuntime = this.getRuntimeMapJson();
    const pgRuntime =
      (await this.safePg(() => this.runtimeRepo!.getMap())) || {};
    report.runtime = this.consistency
      ? this.consistency.compareRuntimeMaps(jsonRuntime, pgRuntime)
      : { skipped: true };

    const applyBots = jsonBots.filter(
      (b: any) => String(b?.Type || '').toLowerCase() === 'apply',
    );
    const panelResults: any[] = [];
    const settingsResults: any[] = [];
    for (const bot of applyBots.slice(0, 50)) {
      const botId = String(bot.ClientID);
      const jsonPanels = this.listPanels(botId);
      const pgPanels =
        (await this.safePg(() => this.applyRepo!.listPanels(botId))) || [];
      if (this.consistency) {
        panelResults.push(
          this.consistency.comparePanelLists(botId, jsonPanels, pgPanels),
        );
      }
      const guildId = String(bot.Server || bot.guild || '').trim();
      if (guildId && this.consistency) {
        const jsonS = this.getGuildSettings(botId, guildId);
        const pgPartial = await this.safePg(() =>
          this.applyRepo!.getGuildSettings(botId, guildId),
        );
        if (pgPartial) {
          const lang =
            (await this.safePg(() => this.botsRepo!.getLanguage(botId))) ||
            'Ar';
          settingsResults.push(
            this.consistency.compareSettings(botId, guildId, jsonS, {
              ...pgPartial,
              language: lang,
            }),
          );
        }
      }
    }
    report.panels = {
      checked: panelResults.length,
      mismatches: panelResults.reduce(
        (n, r) => n + (r.mismatches || 0),
        0,
      ),
    };
    report.settings = {
      checked: settingsResults.length,
      ok: settingsResults.every((r) => r.ok !== false),
    };
    report.summary = this.consistency?.getReport() || null;
    return report;
  }
}
