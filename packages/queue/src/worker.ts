import { Worker, type Processor, type WorkerOptions } from 'bullmq';
import { createRedisConnection, isRedisReachable } from './connection';
import { QUEUE_NAMES, type QueueName } from './names';

export type BotWorkerHandlers = {
  onPanelCreate?: Processor;
  onPanelUpdate?: Processor;
  onPanelDelete?: Processor;
  onApplyAction?: Processor;
  onDashboardLog?: Processor;
};

function workerOpts(): WorkerOptions {
  return {
    connection: createRedisConnection(),
    concurrency: Number(process.env.BOT_QUEUE_CONCURRENCY || 5),
  };
}

export async function startBotWorkers(handlers: BotWorkerHandlers): Promise<Worker[]> {
  const ok = await isRedisReachable();
  if (!ok) {
    console.warn(
      '[queue] Redis not reachable — Maker workers skipped (polling/legacy paths still work)',
    );
    return [];
  }

  const workers: Worker[] = [];
  const opts = workerOpts();

  const map: Array<[QueueName, Processor | undefined]> = [
    [QUEUE_NAMES.PANEL_CREATE, handlers.onPanelCreate],
    [QUEUE_NAMES.PANEL_UPDATE, handlers.onPanelUpdate],
    [QUEUE_NAMES.PANEL_DELETE, handlers.onPanelDelete],
    [QUEUE_NAMES.APPLY_ACTION, handlers.onApplyAction],
    [QUEUE_NAMES.DASHBOARD_LOG, handlers.onDashboardLog],
  ];

  for (const [name, processor] of map) {
    if (!processor) continue;
    const conn = createRedisConnection();
    await conn.connect().catch(() => undefined);
    const w = new Worker(name, processor, {
      ...opts,
      connection: conn,
    });
    w.on('failed', (job, err) => {
      console.warn(`[queue] ${name} job ${job?.id} failed: ${err?.message || err}`);
    });
    w.on('error', (err) => {
      console.warn(`[queue] ${name} worker error: ${err.message}`);
    });
    workers.push(w);
  }

  return workers;
}

export async function stopWorkers(workers: Worker[]): Promise<void> {
  await Promise.all(workers.map((w) => w.close()));
}
