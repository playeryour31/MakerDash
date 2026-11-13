/**
 * Import Phase-1 JSON stores into PostgreSQL.
 *
 * Usage:
 *   npm run import:phase1 --workspace=@maker/database
 *   npm run import:phase1:dry --workspace=@maker/database
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  prisma,
  encryptBotToken,
  BotType,
  Language,
  ApplyPanelStatus,
  ApplicationStatus,
  JobKind,
  JobStatus,
} from '../src/index';

const dryRun = process.argv.includes('--dry-run');

function makerRoot() {
  return path.resolve(__dirname, '../../..');
}

function readJson(rel: string) {
  const file = path.join(makerRoot(), rel);
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, 'utf8') || '{}');
}

function parseBotDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toBotType(raw?: string): BotType {
  const key = String(raw || 'System');
  if ((Object.values(BotType) as string[]).includes(key)) return key as BotType;
  return BotType.System;
}

const unknownKeys: string[] = [];
const stats = {
  bots: 0,
  runtimes: 0,
  panels: 0,
  settings: 0,
  pending: 0,
  jobs: 0,
  languages: 0,
};

async function importBots() {
  const raw = readJson('Database/Others/Tokens.json');
  const bots = Array.isArray(raw.Bots) ? raw.Bots : [];
  const lang = readJson('Database/Others/Language.json');

  for (const bot of bots) {
    const clientId = String(bot.ClientID || '');
    if (!clientId || !bot.Token) {
      console.warn(`skip bot missing id/token: ${clientId}`);
      continue;
    }
    const language =
      lang[clientId] === 'En' ? Language.En : Language.Ar;
    if (lang[clientId]) stats.languages += 1;

    const data = {
      clientId,
      tokenEnc: encryptBotToken(String(bot.Token)),
      ownerId: String(bot.Owner || ''),
      buyerId: bot.Buyer ? String(bot.Buyer) : null,
      sellerId: bot.Seller ? String(bot.Seller) : null,
      botNumber: bot.BotID ?? null,
      type: toBotType(bot.Type),
      guildId: bot.guild ? String(bot.guild) : null,
      serverId: bot.Server ? String(bot.Server) : null,
      servers: Array.isArray(bot.Servers)
        ? bot.Servers.map(String)
        : bot.Server
          ? [String(bot.Server)]
          : [],
      price: bot.Price ?? null,
      node: bot.Node ?? null,
      purchasesId: bot.PurchasesID ?? null,
      tokenType: bot.TokenType ? String(bot.TokenType) : null,
      dashboardSlug: bot.dashboardSlug ? String(bot.dashboardSlug) : null,
      startsAt: parseBotDate(bot.startTime),
      endsAt: parseBotDate(bot.endTime),
      language,
    };

    if (!dryRun) {
      await prisma.botInstance.upsert({
        where: { clientId },
        create: data,
        update: data,
      });
    }
    stats.bots += 1;
  }
}

async function importRuntime() {
  const raw = readJson('Database/BotMaker/RunBots.json');
  for (const [clientId, running] of Object.entries(raw || {})) {
    const bot = await prisma.botInstance.findUnique({
      where: { clientId: String(clientId) },
    });
    if (!bot) {
      console.warn(`runtime skip (no bot): ${clientId}`);
      continue;
    }
    if (!dryRun) {
      await prisma.botRuntime.upsert({
        where: { clientId: String(clientId) },
        create: { clientId: String(clientId), running: Boolean(running) },
        update: { running: Boolean(running) },
      });
    }
    stats.runtimes += 1;
  }
}

async function importApply() {
  const raw = readJson('Maker/Json-Database/Settings/Apply.json') as Record<
    string,
    any
  >;

  for (const [key, value] of Object.entries(raw)) {
    if (key.startsWith('appData_')) {
      const rest = key.slice('appData_'.length);
      const idx = rest.lastIndexOf('_');
      if (idx < 0) {
        unknownKeys.push(key);
        continue;
      }
      const messageId = rest.slice(0, idx);
      const botClientId = rest.slice(idx + 1);
      const bot = await prisma.botInstance.findUnique({
        where: { clientId: botClientId },
      });
      if (!bot) {
        console.warn(`panel skip (no bot): ${key}`);
        continue;
      }
      const statusRaw = raw[`applectionStatus_${messageId}_${botClientId}`];
      const applied = raw[`Applied_${messageId}_${botClientId}`];
      const legacyAsks: Record<string, any> = {};
      for (const k of Object.keys(value || {})) {
        if (/^ask\d+$/i.test(k)) legacyAsks[k] = value[k];
      }
      if (!dryRun) {
        const panel = await prisma.applyPanel.upsert({
          where: {
            botClientId_messageId: { botClientId, messageId },
          },
          create: {
            botClientId,
            messageId,
            channelId: value?.channel ? String(value.channel) : null,
            guildId: value?.guild ? String(value.guild) : null,
            message: String(value?.message || ''),
            status:
              statusRaw === 'off'
                ? ApplyPanelStatus.off
                : ApplyPanelStatus.on,
            questions: value?.questions ?? [],
            legacyAsks: Object.keys(legacyAsks).length ? legacyAsks : undefined,
          },
          update: {
            channelId: value?.channel ? String(value.channel) : null,
            guildId: value?.guild ? String(value.guild) : null,
            message: String(value?.message || ''),
            status:
              statusRaw === 'off'
                ? ApplyPanelStatus.off
                : ApplyPanelStatus.on,
            questions: value?.questions ?? [],
            legacyAsks: Object.keys(legacyAsks).length ? legacyAsks : undefined,
          },
        });
        if (Array.isArray(applied) && applied.length) {
          await prisma.applyPanelApplicant.deleteMany({
            where: { panelId: panel.id },
          });
          await prisma.applyPanelApplicant.createMany({
            data: applied.map((userId: any) => ({
              panelId: panel.id,
              userId: String(userId),
            })),
            skipDuplicates: true,
          });
        }
      }
      stats.panels += 1;
      continue;
    }

    if (
      key.startsWith('applectionStatus_') ||
      key.startsWith('Applied_') ||
      key.startsWith('Dashboard_Audit_')
    ) {
      continue;
    }

    if (key.startsWith('applyAdmin_') || key.startsWith('resultsLog_') || key.startsWith('dm_Mode_')) {
      let prefix = 'applyAdmin_';
      if (key.startsWith('resultsLog_')) prefix = 'resultsLog_';
      if (key.startsWith('dm_Mode_')) prefix = 'dm_Mode_';
      const rest = key.slice(prefix.length);
      const idx = rest.lastIndexOf('_');
      if (idx < 0) {
        unknownKeys.push(key);
        continue;
      }
      const guildId = rest.slice(0, idx);
      const botClientId = rest.slice(idx + 1);
      const bot = await prisma.botInstance.findUnique({
        where: { clientId: botClientId },
      });
      if (!bot) continue;

      const admin = raw[`applyAdmin_${guildId}_${botClientId}`];
      const logs = raw[`resultsLog_${guildId}_${botClientId}`];
      const dm = raw[`dm_Mode_${guildId}_${botClientId}`] || {
        accept: 'off',
        reject: 'off',
      };

      // only count once per pair (process on applyAdmin or first seen)
      if (prefix !== 'applyAdmin_' && raw[`applyAdmin_${guildId}_${botClientId}`] !== undefined) {
        continue;
      }
      if (prefix === 'resultsLog_' && raw[`applyAdmin_${guildId}_${botClientId}`] !== undefined) {
        continue;
      }
      if (prefix === 'dm_Mode_' && (raw[`applyAdmin_${guildId}_${botClientId}`] !== undefined || raw[`resultsLog_${guildId}_${botClientId}`] !== undefined)) {
        continue;
      }

      if (!dryRun) {
        await prisma.applyGuildSettings.upsert({
          where: {
            botClientId_guildId: { botClientId, guildId },
          },
          create: {
            botClientId,
            guildId,
            adminRoleId: admin ? String(admin) : null,
            logsChannelId: logs ? String(logs) : null,
            dmAccept: dm.accept || 'off',
            dmReject: dm.reject || 'off',
          },
          update: {
            adminRoleId: admin ? String(admin) : null,
            logsChannelId: logs ? String(logs) : null,
            dmAccept: dm.accept || 'off',
            dmReject: dm.reject || 'off',
          },
        });
      }
      stats.settings += 1;
      continue;
    }

    if (key.startsWith('Pending_Applications_')) {
      const botClientId = key.slice('Pending_Applications_'.length);
      const bot = await prisma.botInstance.findUnique({
        where: { clientId: botClientId },
      });
      if (!bot) continue;
      const items = Array.isArray(value) ? value : [];
      if (!dryRun) {
        await prisma.applyApplication.deleteMany({
          where: { botClientId, status: ApplicationStatus.pending },
        });
        for (const item of items) {
          await prisma.applyApplication.create({
            data: {
              botClientId,
              panelMessageId: item?.appID || item?.panelMessageId || null,
              userId: String(item?.userId || item?.user || item?.applicantId || 'unknown'),
              status: ApplicationStatus.pending,
              answers: item?.answers || item || {},
              meta: item,
            },
          });
          stats.pending += 1;
        }
      } else {
        stats.pending += items.length;
      }
      continue;
    }

    if (key.startsWith('Create_Applection_')) {
      const botClientId = key.slice('Create_Applection_'.length);
      if (!dryRun && value) {
        await prisma.botJob.create({
          data: {
            botClientId,
            kind: JobKind.CREATE_PANEL,
            status: JobStatus.pending,
            payload: value,
          },
        });
      }
      stats.jobs += 1;
      continue;
    }
    if (key.startsWith('Applection_Update_Data_')) {
      const botClientId = key.slice('Applection_Update_Data_'.length);
      if (!dryRun && value) {
        await prisma.botJob.create({
          data: {
            botClientId,
            kind: JobKind.UPDATE_PANEL,
            status: JobStatus.pending,
            payload: value,
          },
        });
      }
      stats.jobs += 1;
      continue;
    }
    if (key.startsWith('Delete_Applection_')) {
      const botClientId = key.slice('Delete_Applection_'.length);
      if (!dryRun && value) {
        await prisma.botJob.create({
          data: {
            botClientId,
            kind: JobKind.DELETE_PANEL,
            status: JobStatus.pending,
            payload: value,
          },
        });
      }
      stats.jobs += 1;
      continue;
    }
    if (key.startsWith('Dashboard_Apply_Action_')) {
      const botClientId = key.slice('Dashboard_Apply_Action_'.length);
      const list = Array.isArray(value) ? value : [];
      for (const item of list) {
        if (!dryRun) {
          await prisma.botJob.create({
            data: {
              botClientId,
              kind: JobKind.APPLY_ACTION,
              status: JobStatus.pending,
              payload: item,
            },
          });
        }
        stats.jobs += 1;
      }
      continue;
    }
    if (key.startsWith('Dashboard_Logs_')) {
      const botClientId = key.slice('Dashboard_Logs_'.length);
      const list = Array.isArray(value) ? value : [];
      for (const item of list) {
        if (!dryRun) {
          await prisma.botJob.create({
            data: {
              botClientId,
              kind: JobKind.DASHBOARD_LOG,
              status: JobStatus.pending,
              payload: item,
            },
          });
        }
        stats.jobs += 1;
      }
      continue;
    }

    unknownKeys.push(key);
  }
}

async function main() {
  console.log(`Phase-1 import ${dryRun ? '(dry-run)' : '(apply)'} → ${makerRoot()}`);
  await importBots();
  await importRuntime();
  await importApply();
  console.log('Stats:', stats);
  if (unknownKeys.length) {
    console.log(`Unknown Apply keys (${unknownKeys.length}):`);
    for (const k of unknownKeys.slice(0, 50)) console.log(' -', k);
    if (unknownKeys.length > 50) console.log(` ... +${unknownKeys.length - 50} more`);
  }
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
