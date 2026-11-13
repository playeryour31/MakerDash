import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApplyStoreService } from './apply-store.service';

export type AuditCategory =
  | 'settings'
  | 'panels'
  | 'applications'
  | 'runtime'
  | 'commands'
  | 'admins'
  | 'other';

const FILE_CAP = 500;

const ACTION_LABELS: Record<string, { ar: string; en: string }> = {
  update_settings: { ar: 'تحديث الإعدادات', en: 'Settings updated' },
  create_panel: { ar: 'إنشاء لوحة تقديم', en: 'Panel created' },
  update_panel: { ar: 'تحديث لوحة تقديم', en: 'Panel updated' },
  panel_status: { ar: 'تغيير حالة اللوحة', en: 'Panel status changed' },
  delete_panel: { ar: 'حذف لوحة تقديم', en: 'Panel deleted' },
  start_bot: { ar: 'تشغيل البوت', en: 'Bot started' },
  stop_bot: { ar: 'إيقاف البوت', en: 'Bot stopped' },
  restart_bot: { ar: 'إعادة تشغيل البوت', en: 'Bot restarted' },
  application_accept: { ar: 'قبول طلب', en: 'Application accepted' },
  application_reject: { ar: 'رفض طلب', en: 'Application rejected' },
  command_enable: { ar: 'تفعيل أمر', en: 'Command enabled' },
  command_disable: { ar: 'إيقاف أمر', en: 'Command disabled' },
  alias_add: { ar: 'إضافة اختصار', en: 'Alias added' },
  alias_remove: { ar: 'حذف اختصار', en: 'Alias removed' },
  admin_invite: { ar: 'دعوة إداري', en: 'Admin invited' },
  admin_revoke: { ar: 'إلغاء إداري', en: 'Admin revoked' },
  admin_accept: { ar: 'قبول دعوة إداري', en: 'Admin invite accepted' },
};

const CATEGORY_LABELS: Record<string, { ar: string; en: string }> = {
  settings: { ar: 'إعدادات', en: 'Settings' },
  panels: { ar: 'لوحات', en: 'Panels' },
  applications: { ar: 'طلبات', en: 'Applications' },
  runtime: { ar: 'تشغيل', en: 'Runtime' },
  commands: { ar: 'أوامر', en: 'Commands' },
  admins: { ar: 'إداريون', en: 'Admins' },
  other: { ar: 'أخرى', en: 'Other' },
};

@Injectable()
export class ApplyAuditService {
  constructor(
    private readonly store: ApplyStoreService,
    private readonly prisma: PrismaService,
  ) {}

  categoryFor(action: string): AuditCategory {
    if (action === 'update_settings') return 'settings';
    if (
      action.startsWith('create_panel') ||
      action.startsWith('update_panel') ||
      action.startsWith('panel_') ||
      action.startsWith('delete_panel')
    ) {
      return 'panels';
    }
    if (action.startsWith('application_')) return 'applications';
    if (action === 'start_bot' || action === 'stop_bot' || action === 'restart_bot')
      return 'runtime';
    if (action.startsWith('command_') || action.startsWith('alias_')) {
      return 'commands';
    }
    if (action.startsWith('admin_')) return 'admins';
    return 'other';
  }

  private colorFor(action: string, category: AuditCategory): number {
    if (action === 'application_accept' || action === 'start_bot') return 0x22c55e;
    if (action === 'application_reject' || action === 'stop_bot') return 0xef4444;
    if (category === 'admins') return 0x22d3ee;
    if (category === 'commands') return 0xa78bfa;
    if (category === 'panels') return 0x7c3aed;
    if (category === 'settings') return 0x5b21b6;
    return 0x71717a;
  }

  private summarizePayload(
    action: string,
    payload: Record<string, any>,
    lang: 'Ar' | 'En',
  ): string {
    const lines: string[] = [];
    const ar = lang === 'Ar';
    if (payload.commandName) {
      lines.push(
        ar
          ? `الأمر: \`${payload.commandName}\``
          : `Command: \`${payload.commandName}\``,
      );
    }
    if (payload.alias) {
      lines.push(
        ar ? `الاختصار: \`${payload.alias}\`` : `Alias: \`${payload.alias}\``,
      );
    }
    if (payload.email) {
      lines.push(ar ? `البريد: ${payload.email}` : `Email: ${payload.email}`);
    }
    if (payload.messageId) {
      lines.push(`Message: \`${payload.messageId}\``);
    }
    if (payload.status) {
      lines.push(ar ? `الحالة: ${payload.status}` : `Status: ${payload.status}`);
    }
    if (payload.guildId) {
      lines.push(`Guild: \`${payload.guildId}\``);
    }
    if (payload.logsChannelId !== undefined) {
      lines.push(
        ar
          ? `قناة اللوجات: ${payload.logsChannelId || '—'}`
          : `Logs channel: ${payload.logsChannelId || '—'}`,
      );
    }
    if (payload.language) {
      lines.push(ar ? `اللغة: ${payload.language}` : `Language: ${payload.language}`);
    }
    if (payload.pendingId) {
      lines.push(`ID: \`${payload.pendingId}\``);
    }
    if (payload.userId || payload.applicantId) {
      const uid = payload.userId || payload.applicantId;
      lines.push(`User: <@${uid}>`);
    }
    if (!lines.length) {
      const keys = Object.keys(payload).slice(0, 6);
      if (keys.length) {
        lines.push(
          '```json\n' +
            JSON.stringify(
              Object.fromEntries(keys.map((k) => [k, payload[k]])),
              null,
              0,
            ).slice(0, 400) +
            '\n```',
        );
      }
    }
    return lines.join('\n') || (ar ? '—' : '—');
  }

  async write(
    botId: string,
    action: string,
    payload: Record<string, any> | null | undefined,
    actor: string,
  ) {
    const category = this.categoryFor(action);
    const safePayload =
      payload && typeof payload === 'object' ? { ...payload } : {};
    delete (safePayload as any).Token;
    delete (safePayload as any).token;

    const actorId = String(actor || 'dashboard');
    const at = new Date().toISOString();

    try {
      await this.prisma.applyAuditLog.create({
        data: {
          botId: String(botId),
          action,
          category,
          payload: safePayload,
          actor: actorId,
        },
      });
      // Cap per-bot rows
      const old = await this.prisma.applyAuditLog.findMany({
        where: { botId: String(botId) },
        orderBy: { createdAt: 'desc' },
        skip: FILE_CAP,
        select: { id: true },
      });
      if (old.length) {
        await this.prisma.applyAuditLog.deleteMany({
          where: { id: { in: old.map((r) => r.id) } },
        });
      }
    } catch (err: any) {
      console.warn(`[audit] pg write failed: ${err?.message || err}`);
    }

    const lang =
      this.store.getBotLanguage(String(botId)) === 'En' ? 'En' : 'Ar';
    const labels = ACTION_LABELS[action] || {
      ar: action,
      en: action,
    };
    const cat = CATEGORY_LABELS[category] || CATEGORY_LABELS.other;
    const title = lang === 'Ar' ? labels.ar : labels.en;
    const categoryLabel = lang === 'Ar' ? cat.ar : cat.en;
    const actorLine =
      /^\d{5,}$/.test(actorId)
        ? `<@${actorId}> (\`${actorId}\`)`
        : `\`${actorId}\``;

    this.store.queueDashboardLog(String(botId), {
      action,
      category,
      title,
      categoryLabel,
      description: this.summarizePayload(action, safePayload, lang),
      actorLine,
      color: this.colorFor(action, category),
      language: lang,
      at,
    });
  }

  async list(botId: string, limit = 50) {
    return this.prisma.applyAuditLog.findMany({
      where: { botId: String(botId) },
      orderBy: { createdAt: 'desc' },
      take: Math.min(200, Math.max(1, limit)),
    });
  }
}
