/**
 * BullMQ workers that run Discord-side panel/apply/log jobs for customer bots.
 */
const { startBotWorkers } = require('@maker/queue');

/**
 * @param {{ getClient: (botClientId: string) => import('discord.js').Client | null }} deps
 */
async function startMakerQueueWorkers(deps) {
  const getClient = deps.getClient;

  async function withClient(job, fn) {
    const botId = String(job.data?.botClientId || '');
    const client = getClient(botId);
    if (!client) {
      throw new Error(`Bot client not online: ${botId}`);
    }
    return fn(client, job.data?.payload || {}, job.data);
  }

  const workers = await startBotWorkers({
    async onPanelCreate(job) {
      return withClient(job, async (client, payload) => {
        const applydb = require('../../../Maker/lib/applyDb');
        await applydb.set(`Create_Applection_${client.user.id}`, payload);
        if (typeof deps.processCreatePanel === 'function') {
          await deps.processCreatePanel(client, payload);
          await applydb.delete(`Create_Applection_${client.user.id}`);
        }
      });
    },
    async onPanelUpdate(job) {
      return withClient(job, async (client, payload) => {
        const applydb = require('../../../Maker/lib/applyDb');
        await applydb.set(`Applection_Update_Data_${client.user.id}`, payload);
        if (typeof deps.processUpdatePanel === 'function') {
          await deps.processUpdatePanel(client, payload);
          await applydb.delete(`Applection_Update_Data_${client.user.id}`);
        }
      });
    },
    async onPanelDelete(job) {
      return withClient(job, async (client, payload) => {
        const applydb = require('../../../Maker/lib/applyDb');
        await applydb.set(`Delete_Applection_${client.user.id}`, payload);
        if (typeof deps.processDeletePanel === 'function') {
          await deps.processDeletePanel(client, payload);
          await applydb.delete(`Delete_Applection_${client.user.id}`);
        }
      });
    },
    async onApplyAction(job) {
      return withClient(job, async (client, payload) => {
        const applydb = require('../../../Maker/lib/applyDb');
        const key = `Dashboard_Apply_Action_${client.user.id}`;
        const list = (await applydb.get(key)) || [];
        const arr = Array.isArray(list) ? list : [];
        arr.push(payload);
        await applydb.set(key, arr);
        if (typeof deps.processApplyActions === 'function') {
          await deps.processApplyActions(client);
        }
      });
    },
    async onDashboardLog(job) {
      return withClient(job, async (client, payload) => {
        if (typeof deps.processDashboardLog === 'function') {
          await deps.processDashboardLog(client, payload);
          return;
        }
        const channelId = payload.channelId;
        if (!channelId) return;
        const ch = await client.channels.fetch(channelId).catch(() => null);
        if (!ch?.send) return;
        await ch.send({
          embeds: [
            {
              title: payload.title || payload.action || 'Dashboard',
              description: payload.description || '',
              color: payload.color || 0x71717a,
              timestamp: payload.at || new Date().toISOString(),
            },
          ],
        });
      });
    },
  });

  if (workers.length) {
    console.log(`[queue] started ${workers.length} Maker workers`);
  }
  return workers;
}

module.exports = { startMakerQueueWorkers };
