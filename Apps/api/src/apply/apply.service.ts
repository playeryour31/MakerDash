import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApplyStoreService } from './apply-store.service';
import { isMongoReady } from '../database/database.module';
import { ApplyAuditService } from './apply-audit.service';
import { legacyAskFields, normalizeQuestions } from './questions.util';

@Injectable()
export class ApplyService {
  constructor(
    private readonly store: ApplyStoreService,
    private readonly audit: ApplyAuditService,
  ) {}

  private async ensureBot(botId: string) {
    if (!botId) throw new NotFoundException('Apply bot not found');
    const bot =
      (await this.store.getBotAsync(botId)) || this.store.getBot(botId);
    if (!bot) throw new NotFoundException('Bot not found');
    return bot;
  }

  private async writeAudit(
    botId: string,
    action: string,
    payload: any,
    actor: string,
  ) {
    await this.audit.write(botId, action, payload, actor);
  }

  async overview(botId: string) {
    const bot = await this.ensureBot(botId);
    const panels = this.store.listPanels(botId);
    const pending = this.store.listPending(botId);
    const guildId = bot?.Server || bot?.guild || panels[0]?.guild || null;
    const settings = guildId
      ? this.store.getGuildSettings(botId, String(guildId))
      : {
          adminRoleId: null,
          logsChannelId: null,
          resultsChannelId: null,
          language: this.store.getBotLanguage(botId),
          dmMode: { accept: 'off', reject: 'off' },
        };
    return {
      botId,
      bot,
      running: await this.store.isRunningAsync(botId),
      panels,
      pending: Array.isArray(pending) ? pending : [],
      settings,
      guildId,
      mongo: isMongoReady(),
    };
  }

  async updateSettings(
    botId: string,
    body: {
      guildId: string;
      adminRoleId?: string;
      logsChannelId?: string;
      resultsChannelId?: string;
      language?: 'Ar' | 'En';
      dmMode?: { accept: string; reject: string };
    },
    actor: string,
  ) {
    await this.ensureBot(botId);
    if (!body.guildId) throw new BadRequestException('guildId required');
    const settings = this.store.setGuildSettings(botId, body.guildId, body);
    await this.writeAudit(botId, 'update_settings', body, actor);
    return settings;
  }

  async createPanel(
    botId: string,
    body: {
      guild: string;
      applicationChannel: string;
      requestsChannel: string;
      applicationRole: string;
      applicationMessage?: string;
      applicationMessageType?: 'embed' | 'message';
      buttonLabel?: string;
      buttonEmoji?: string;
      buttonColor?: 'Primary' | 'Secondary' | 'Success' | 'Danger';
      embed?: Record<string, any>;
      questions: any[];
    },
    actor: string,
  ) {
    await this.ensureBot(botId);
    const questions = normalizeQuestions(body.questions || []);
    if (!questions.length) {
      throw new BadRequestException('At least one question is required');
    }
    const embed = {
      useServerBranding: true,
      ...(body.embed || {}),
      description:
        body.embed?.description || body.applicationMessage || '',
    };
    const payload = {
      guild: body.guild,
      applicationChannel: body.applicationChannel,
      requestsChannel: body.requestsChannel,
      applicationRole: body.applicationRole,
      applicationMessage: embed.description || '',
      applicationMessageType: body.applicationMessageType || 'embed',
      buttonLabel: body.buttonLabel || null,
      buttonEmoji: body.buttonEmoji?.trim() || null,
      buttonColor: body.buttonColor || 'Primary',
      embed,
      questions,
    };
    this.store.queueCreatePanel(botId, payload);
    await this.writeAudit(botId, 'create_panel', payload, actor);
    return { queued: true, payload };
  }

  async updatePanel(
    botId: string,
    body: {
      guild: string;
      appID: string;
      appMessage?: string;
      appStatus?: 'on' | 'off';
      applicationMessageType?: 'embed' | 'message';
      buttonLabel?: string;
      buttonEmoji?: string;
      buttonColor?: 'Primary' | 'Secondary' | 'Success' | 'Danger';
      requestsChannel?: string;
      applicationRole?: string;
      embed?: Record<string, any>;
      questions: any[];
    },
    actor: string,
  ) {
    await this.ensureBot(botId);
    const questions = normalizeQuestions(body.questions || []);
    if (!questions.length) {
      throw new BadRequestException('At least one question is required');
    }
    const existing = this.store.get(`appData_${body.appID}_${botId}`) || {};
    const embed = {
      useServerBranding: true,
      ...(existing.embed || {}),
      ...(body.embed || {}),
      description:
        body.embed?.description ??
        body.appMessage ??
        existing.message ??
        '',
    };
    const legacy = legacyAskFields(questions);
    const payload = {
      guild: body.guild,
      appID: body.appID,
      appMessage: embed.description || '',
      appStatus: body.appStatus || 'on',
      applicationMessageType:
        body.applicationMessageType || existing.messageType || 'embed',
      buttonLabel: body.buttonLabel ?? existing.buttonLabel ?? null,
      buttonEmoji:
        body.buttonEmoji !== undefined
          ? body.buttonEmoji?.trim() || null
          : existing.buttonEmoji ?? null,
      buttonColor:
        body.buttonColor || existing.buttonColor || 'Primary',
      requestsChannel:
        body.requestsChannel ?? existing.requestsChannel ?? null,
      applicationRole:
        body.applicationRole ?? existing.applicationRole ?? null,
      embed,
      questions,
    };
    this.store.queueUpdatePanel(botId, payload);
    this.store.set(`appData_${body.appID}_${botId}`, {
      ...existing,
      message: payload.appMessage,
      ...legacy,
      questions,
      messageType: payload.applicationMessageType,
      buttonLabel: payload.buttonLabel,
      buttonEmoji: payload.buttonEmoji,
      buttonColor: payload.buttonColor,
      requestsChannel: payload.requestsChannel,
      applicationRole: payload.applicationRole,
      embed,
    });
    if (body.appStatus) {
      this.store.set(
        `applectionStatus_${body.appID}_${botId}`,
        body.appStatus,
      );
    }
    await this.writeAudit(botId, 'update_panel', payload, actor);
    return { queued: true, payload };
  }

  async setPanelStatus(
    botId: string,
    messageId: string,
    status: 'on' | 'off',
    actor: string,
  ) {
    await this.ensureBot(botId);
    this.store.set(`applectionStatus_${messageId}_${botId}`, status);
    await this.writeAudit(botId, 'panel_status', { messageId, status }, actor);
    return { messageId, status };
  }

  async deletePanel(botId: string, messageId: string, actor: string) {
    await this.ensureBot(botId);
    const existing = this.store.get(`appData_${messageId}_${botId}`);
    if (!existing) {
      throw new BadRequestException('Panel not found');
    }
    const payload = {
      appID: messageId,
      channel: existing.channel || null,
      guild: existing.guild || null,
    };
    this.store.queueDeletePanel(botId, payload);
    this.store.removePanelData(botId, messageId);
    await this.writeAudit(botId, 'delete_panel', payload, actor);
    return { queued: true, messageId };
  }

  async setRuntime(botId: string, running: boolean, actor: string) {
    await this.ensureBot(botId);
    await this.store.setRunningAsync(botId, running);
    await this.writeAudit(
      botId,
      running ? 'start_bot' : 'stop_bot',
      { running },
      actor,
    );
    return { botId, running: await this.store.isRunningAsync(botId) };
  }

  async restartRuntime(botId: string, actor: string) {
    await this.ensureBot(botId);
    await this.store.setRunningAsync(botId, false);
    await this.writeAudit(botId, 'restart_bot', { phase: 'stop' }, actor);

    // Give Maker's manager loop time to destroy the client, then start again.
    await new Promise((resolve) => setTimeout(resolve, 3500));

    await this.store.setRunningAsync(botId, true);
    await this.writeAudit(botId, 'restart_bot', { phase: 'start' }, actor);
    return { botId, running: true, restarted: true };
  }

  async decideApplication(
    botId: string,
    body: {
      action: 'accept' | 'reject';
      guildId: string;
      channelId: string;
      messageId: string;
      userId: string;
      roleId: string;
      pendingId?: string;
    },
    actor: string,
  ) {
    await this.ensureBot(botId);
    this.store.queueAction(botId, body);
    if (body.pendingId) {
      const pending = this.store.listPending(botId) || [];
      const next = (Array.isArray(pending) ? pending : []).map((p: any) =>
        p.id === body.pendingId
          ? {
              ...p,
              status: body.action === 'accept' ? 'accepted' : 'rejected',
              decidedAt: new Date().toISOString(),
              decidedBy: actor,
            }
          : p,
      );
      this.store.setPending(botId, next);
    }
    await this.writeAudit(botId, `application_${body.action}`, body, actor);
    return { queued: true };
  }
}
