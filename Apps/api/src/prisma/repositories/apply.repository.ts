import { Injectable } from '@nestjs/common';
import {
  ApplicationStatus,
  ApplyPanelStatus,
  JobKind,
} from '@maker/database';
import { PrismaService } from '../prisma.service';
import { BotJobRepository } from './bot-job.repository';

@Injectable()
export class ApplyRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: BotJobRepository,
  ) {}

  async listPanels(botId: string) {
    const panels = await this.prisma.applyPanel.findMany({
      where: { botClientId: String(botId) },
      include: { applicants: true },
      orderBy: { createdAt: 'asc' },
    });

    return panels.map((p) => {
      const legacy =
        p.legacyAsks && typeof p.legacyAsks === 'object'
          ? (p.legacyAsks as Record<string, any>)
          : {};
      return {
        messageId: p.messageId,
        botId: p.botClientId,
        status: p.status,
        appliedCount: p.applicants.length,
        applied: p.applicants.map((a) => a.userId),
        message: p.message,
        channel: p.channelId,
        ID: p.messageId,
        questions: p.questions,
        guild: p.guildId,
        ...legacy,
      };
    });
  }

  async upsertPanel(
    botId: string,
    messageId: string,
    data: Record<string, any>,
  ) {
    const legacyAsks: Record<string, any> = {};
    for (const key of Object.keys(data || {})) {
      if (/^ask\d+$/i.test(key)) legacyAsks[key] = data[key];
    }

    return this.prisma.applyPanel.upsert({
      where: {
        botClientId_messageId: {
          botClientId: String(botId),
          messageId: String(messageId),
        },
      },
      create: {
        botClientId: String(botId),
        messageId: String(messageId),
        channelId: data.channel ? String(data.channel) : null,
        guildId: data.guild ? String(data.guild) : null,
        message: String(data.message || ''),
        status:
          data.status === 'off' ? ApplyPanelStatus.off : ApplyPanelStatus.on,
        questions: data.questions ?? [],
        legacyAsks: Object.keys(legacyAsks).length ? legacyAsks : undefined,
      },
      update: {
        channelId:
          data.channel !== undefined
            ? data.channel
              ? String(data.channel)
              : null
            : undefined,
        guildId:
          data.guild !== undefined
            ? data.guild
              ? String(data.guild)
              : null
            : undefined,
        message:
          data.message !== undefined ? String(data.message || '') : undefined,
        status:
          data.status === 'off'
            ? ApplyPanelStatus.off
            : data.status === 'on'
              ? ApplyPanelStatus.on
              : undefined,
        questions: data.questions !== undefined ? data.questions : undefined,
        legacyAsks:
          Object.keys(legacyAsks).length || data.ask1 !== undefined
            ? legacyAsks
            : undefined,
      },
    });
  }

  async setPanelStatus(botId: string, messageId: string, status: 'on' | 'off') {
    return this.prisma.applyPanel.update({
      where: {
        botClientId_messageId: {
          botClientId: String(botId),
          messageId: String(messageId),
        },
      },
      data: {
        status: status === 'off' ? ApplyPanelStatus.off : ApplyPanelStatus.on,
      },
    });
  }

  async setApplied(botId: string, messageId: string, userIds: string[]) {
    const panel = await this.prisma.applyPanel.findUnique({
      where: {
        botClientId_messageId: {
          botClientId: String(botId),
          messageId: String(messageId),
        },
      },
    });
    if (!panel) return null;

    await this.prisma.$transaction(async (tx) => {
      await tx.applyPanelApplicant.deleteMany({ where: { panelId: panel.id } });
      if (userIds.length) {
        await tx.applyPanelApplicant.createMany({
          data: userIds.map((userId) => ({
            panelId: panel.id,
            userId: String(userId),
          })),
          skipDuplicates: true,
        });
      }
    });
    return true;
  }

  async removePanel(botId: string, messageId: string) {
    await this.prisma.applyPanel.deleteMany({
      where: {
        botClientId: String(botId),
        messageId: String(messageId),
      },
    });
    return true;
  }

  async getGuildSettings(botId: string, guildId: string) {
    const row = await this.prisma.applyGuildSettings.findUnique({
      where: {
        botClientId_guildId: {
          botClientId: String(botId),
          guildId: String(guildId),
        },
      },
    });
    return {
      adminRoleId: row?.adminRoleId || null,
      logsChannelId: row?.logsChannelId || null,
      resultsChannelId: row?.logsChannelId || null,
      dmMode: {
        accept: row?.dmAccept || 'off',
        reject: row?.dmReject || 'off',
      },
    };
  }

  async setGuildSettings(
    botId: string,
    guildId: string,
    data: {
      adminRoleId?: string | null;
      logsChannelId?: string | null;
      dmMode?: { accept?: string; reject?: string };
    },
  ) {
    const existing = await this.getGuildSettings(botId, guildId);
    return this.prisma.applyGuildSettings.upsert({
      where: {
        botClientId_guildId: {
          botClientId: String(botId),
          guildId: String(guildId),
        },
      },
      create: {
        botClientId: String(botId),
        guildId: String(guildId),
        adminRoleId:
          data.adminRoleId !== undefined
            ? data.adminRoleId
            : existing.adminRoleId,
        logsChannelId:
          data.logsChannelId !== undefined
            ? data.logsChannelId
            : existing.logsChannelId,
        dmAccept: data.dmMode?.accept || existing.dmMode.accept,
        dmReject: data.dmMode?.reject || existing.dmMode.reject,
      },
      update: {
        ...(data.adminRoleId !== undefined
          ? { adminRoleId: data.adminRoleId }
          : {}),
        ...(data.logsChannelId !== undefined
          ? { logsChannelId: data.logsChannelId }
          : {}),
        ...(data.dmMode?.accept !== undefined
          ? { dmAccept: data.dmMode.accept }
          : {}),
        ...(data.dmMode?.reject !== undefined
          ? { dmReject: data.dmMode.reject }
          : {}),
      },
    });
  }

  async listPending(botId: string) {
    const rows = await this.prisma.applyApplication.findMany({
      where: {
        botClientId: String(botId),
        status: ApplicationStatus.pending,
      },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      panelMessageId: r.panelMessageId,
      userId: r.userId,
      status: r.status,
      answers: r.answers,
      ...(r.meta && typeof r.meta === 'object' ? (r.meta as object) : {}),
      ...(r.discordRefs && typeof r.discordRefs === 'object'
        ? (r.discordRefs as object)
        : {}),
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async setPending(botId: string, items: any[]) {
    await this.prisma.$transaction(async (tx) => {
      await tx.applyApplication.deleteMany({
        where: {
          botClientId: String(botId),
          status: ApplicationStatus.pending,
        },
      });
      for (const item of items || []) {
        await tx.applyApplication.create({
          data: {
            botClientId: String(botId),
            panelMessageId: item.panelMessageId
              ? String(item.panelMessageId)
              : item.appID
                ? String(item.appID)
                : null,
            userId: String(item.userId || item.user || item.applicantId || ''),
            status: ApplicationStatus.pending,
            answers: item.answers || item || {},
            meta: item,
            discordRefs: item.discordRefs || null,
          },
        });
      }
    });
    return items;
  }

  async queueCreatePanel(botId: string, payload: Record<string, any>) {
    // replace any pending create for this bot
    await this.jobs.cancelPending(botId, JobKind.CREATE_PANEL);
    return this.jobs.enqueue(botId, JobKind.CREATE_PANEL, payload);
  }

  async queueUpdatePanel(botId: string, payload: Record<string, any>) {
    await this.jobs.cancelPending(botId, JobKind.UPDATE_PANEL);
    return this.jobs.enqueue(botId, JobKind.UPDATE_PANEL, payload);
  }

  async queueDeletePanel(botId: string, payload: Record<string, any>) {
    await this.jobs.cancelPending(botId, JobKind.DELETE_PANEL);
    return this.jobs.enqueue(botId, JobKind.DELETE_PANEL, payload);
  }

  async queueAction(botId: string, payload: Record<string, any>) {
    return this.jobs.enqueue(botId, JobKind.APPLY_ACTION, payload);
  }

  async queueDashboardLog(botId: string, payload: Record<string, any>) {
    return this.jobs.enqueue(botId, JobKind.DASHBOARD_LOG, payload);
  }

  /**
   * Legacy key get/set for Discord handlers still using flat Apply.json keys.
   */
  async getByLegacyKey(key: string): Promise<any> {
    if (key.startsWith('appData_')) {
      const rest = key.slice('appData_'.length);
      const idx = rest.lastIndexOf('_');
      if (idx < 0) return undefined;
      const messageId = rest.slice(0, idx);
      const botId = rest.slice(idx + 1);
      const panels = await this.listPanels(botId);
      return panels.find((p) => p.messageId === messageId) || undefined;
    }
    if (key.startsWith('applectionStatus_')) {
      const rest = key.slice('applectionStatus_'.length);
      const idx = rest.lastIndexOf('_');
      if (idx < 0) return undefined;
      const messageId = rest.slice(0, idx);
      const botId = rest.slice(idx + 1);
      const panel = await this.prisma.applyPanel.findUnique({
        where: {
          botClientId_messageId: { botClientId: botId, messageId },
        },
      });
      return panel?.status;
    }
    if (key.startsWith('Applied_')) {
      const rest = key.slice('Applied_'.length);
      const idx = rest.lastIndexOf('_');
      if (idx < 0) return undefined;
      const messageId = rest.slice(0, idx);
      const botId = rest.slice(idx + 1);
      const panel = await this.prisma.applyPanel.findUnique({
        where: {
          botClientId_messageId: { botClientId: botId, messageId },
        },
        include: { applicants: true },
      });
      return panel?.applicants.map((a) => a.userId) || [];
    }
    if (key.startsWith('applyAdmin_')) {
      const rest = key.slice('applyAdmin_'.length);
      const idx = rest.lastIndexOf('_');
      if (idx < 0) return undefined;
      const guildId = rest.slice(0, idx);
      const botId = rest.slice(idx + 1);
      const s = await this.getGuildSettings(botId, guildId);
      return s.adminRoleId || undefined;
    }
    if (key.startsWith('resultsLog_')) {
      const rest = key.slice('resultsLog_'.length);
      const idx = rest.lastIndexOf('_');
      if (idx < 0) return undefined;
      const guildId = rest.slice(0, idx);
      const botId = rest.slice(idx + 1);
      const s = await this.getGuildSettings(botId, guildId);
      return s.logsChannelId || undefined;
    }
    if (key.startsWith('dm_Mode_')) {
      const rest = key.slice('dm_Mode_'.length);
      const idx = rest.lastIndexOf('_');
      if (idx < 0) return undefined;
      const guildId = rest.slice(0, idx);
      const botId = rest.slice(idx + 1);
      const s = await this.getGuildSettings(botId, guildId);
      return s.dmMode;
    }
    if (key.startsWith('Pending_Applications_')) {
      const botId = key.slice('Pending_Applications_'.length);
      return this.listPending(botId);
    }
    if (key.startsWith('Create_Applection_')) {
      const botId = key.slice('Create_Applection_'.length);
      const job = await this.jobs.peek(botId, JobKind.CREATE_PANEL);
      return job?.payload;
    }
    if (key.startsWith('Applection_Update_Data_')) {
      const botId = key.slice('Applection_Update_Data_'.length);
      const job = await this.jobs.peek(botId, JobKind.UPDATE_PANEL);
      return job?.payload;
    }
    if (key.startsWith('Delete_Applection_')) {
      const botId = key.slice('Delete_Applection_'.length);
      const job = await this.jobs.peek(botId, JobKind.DELETE_PANEL);
      return job?.payload;
    }
    if (key.startsWith('Dashboard_Apply_Action_')) {
      const botId = key.slice('Dashboard_Apply_Action_'.length);
      const list = await this.jobs.listPendingPayloads(
        botId,
        JobKind.APPLY_ACTION,
      );
      return list;
    }
    if (key.startsWith('Dashboard_Logs_')) {
      const botId = key.slice('Dashboard_Logs_'.length);
      return this.jobs.listPendingPayloads(botId, JobKind.DASHBOARD_LOG);
    }
    return undefined;
  }

  async setByLegacyKey(key: string, value: any): Promise<any> {
    if (key.startsWith('appData_')) {
      const rest = key.slice('appData_'.length);
      const idx = rest.lastIndexOf('_');
      const messageId = rest.slice(0, idx);
      const botId = rest.slice(idx + 1);
      await this.upsertPanel(botId, messageId, value || {});
      return value;
    }
    if (key.startsWith('applectionStatus_')) {
      const rest = key.slice('applectionStatus_'.length);
      const idx = rest.lastIndexOf('_');
      const messageId = rest.slice(0, idx);
      const botId = rest.slice(idx + 1);
      await this.setPanelStatus(
        botId,
        messageId,
        value === 'off' ? 'off' : 'on',
      );
      return value;
    }
    if (key.startsWith('Applied_')) {
      const rest = key.slice('Applied_'.length);
      const idx = rest.lastIndexOf('_');
      const messageId = rest.slice(0, idx);
      const botId = rest.slice(idx + 1);
      await this.setApplied(
        botId,
        messageId,
        Array.isArray(value) ? value.map(String) : [],
      );
      return value;
    }
    if (key.startsWith('applyAdmin_')) {
      const rest = key.slice('applyAdmin_'.length);
      const idx = rest.lastIndexOf('_');
      const guildId = rest.slice(0, idx);
      const botId = rest.slice(idx + 1);
      await this.setGuildSettings(botId, guildId, {
        adminRoleId: value ? String(value) : null,
      });
      return value;
    }
    if (key.startsWith('resultsLog_')) {
      const rest = key.slice('resultsLog_'.length);
      const idx = rest.lastIndexOf('_');
      const guildId = rest.slice(0, idx);
      const botId = rest.slice(idx + 1);
      await this.setGuildSettings(botId, guildId, {
        logsChannelId: value ? String(value) : null,
      });
      return value;
    }
    if (key.startsWith('dm_Mode_')) {
      const rest = key.slice('dm_Mode_'.length);
      const idx = rest.lastIndexOf('_');
      const guildId = rest.slice(0, idx);
      const botId = rest.slice(idx + 1);
      await this.setGuildSettings(botId, guildId, {
        dmMode: value || { accept: 'off', reject: 'off' },
      });
      return value;
    }
    if (key.startsWith('Pending_Applications_')) {
      const botId = key.slice('Pending_Applications_'.length);
      return this.setPending(botId, Array.isArray(value) ? value : []);
    }
    if (key.startsWith('Create_Applection_')) {
      const botId = key.slice('Create_Applection_'.length);
      return this.queueCreatePanel(botId, value || {});
    }
    if (key.startsWith('Applection_Update_Data_')) {
      const botId = key.slice('Applection_Update_Data_'.length);
      return this.queueUpdatePanel(botId, value || {});
    }
    if (key.startsWith('Delete_Applection_')) {
      const botId = key.slice('Delete_Applection_'.length);
      return this.queueDeletePanel(botId, value || {});
    }
    if (key.startsWith('Dashboard_Apply_Action_')) {
      const botId = key.slice('Dashboard_Apply_Action_'.length);
      await this.jobs.cancelPending(botId, JobKind.APPLY_ACTION);
      for (const item of Array.isArray(value) ? value : []) {
        await this.queueAction(botId, item);
      }
      return value;
    }
    if (key.startsWith('Dashboard_Logs_')) {
      const botId = key.slice('Dashboard_Logs_'.length);
      await this.jobs.cancelPending(botId, JobKind.DASHBOARD_LOG);
      for (const item of Array.isArray(value) ? value : []) {
        await this.queueDashboardLog(botId, item);
      }
      return value;
    }
    return value;
  }

  async deleteByLegacyKey(key: string): Promise<boolean> {
    if (key.startsWith('appData_')) {
      const rest = key.slice('appData_'.length);
      const idx = rest.lastIndexOf('_');
      await this.removePanel(rest.slice(idx + 1), rest.slice(0, idx));
      return true;
    }
    if (key.startsWith('Create_Applection_')) {
      await this.jobs.cancelPending(
        key.slice('Create_Applection_'.length),
        JobKind.CREATE_PANEL,
      );
      return true;
    }
    if (key.startsWith('Applection_Update_Data_')) {
      await this.jobs.cancelPending(
        key.slice('Applection_Update_Data_'.length),
        JobKind.UPDATE_PANEL,
      );
      return true;
    }
    if (key.startsWith('Delete_Applection_')) {
      await this.jobs.cancelPending(
        key.slice('Delete_Applection_'.length),
        JobKind.DELETE_PANEL,
      );
      return true;
    }
    if (key.startsWith('applectionStatus_') || key.startsWith('Applied_')) {
      // cleared with panel remove; ignore lone deletes
      return true;
    }
    if (key.startsWith('Dashboard_Apply_Action_')) {
      await this.jobs.cancelPending(
        key.slice('Dashboard_Apply_Action_'.length),
        JobKind.APPLY_ACTION,
      );
      return true;
    }
    if (key.startsWith('Dashboard_Logs_')) {
      await this.jobs.cancelPending(
        key.slice('Dashboard_Logs_'.length),
        JobKind.DASHBOARD_LOG,
      );
      return true;
    }
    return true;
  }
}
