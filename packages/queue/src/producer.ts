import { Queue, type JobsOptions } from 'bullmq';
import {
  createRedisConnection,
  isRedisReachable,
} from './connection';
import { QUEUE_NAMES, type QueueName } from './names';
import type {
  ApplyActionJob,
  DashboardLogJob,
  PanelCreateJob,
  PanelDeleteJob,
  PanelUpdateJob,
} from './jobs';

const defaultJobOpts: JobsOptions = {
  removeOnComplete: 200,
  removeOnFail: 500,
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
};

const queues = new Map<string, Queue>();
let redisUnavailableLogged = false;

async function ensureQueue(name: QueueName): Promise<Queue | null> {
  const ok = await isRedisReachable();
  if (!ok) {
    if (!redisUnavailableLogged) {
      redisUnavailableLogged = true;
      console.warn('[queue] enqueue skipped — Redis not reachable');
    }
    return null;
  }
  let q = queues.get(name);
  if (!q) {
    const connection = createRedisConnection();
    await connection.connect().catch(() => undefined);
    q = new Queue(name, {
      connection,
      defaultJobOptions: defaultJobOpts,
    });
    queues.set(name, q);
  }
  return q;
}

function stamp(data: { botClientId: string; payload: Record<string, unknown> }) {
  return {
    ...data,
    enqueuedAt: new Date().toISOString(),
  };
}

export async function enqueuePanelCreate(data: PanelCreateJob) {
  const q = await ensureQueue(QUEUE_NAMES.PANEL_CREATE);
  if (!q) return null;
  return q.add('create', stamp(data), {
    jobId: `panel-create-${data.botClientId}-${Date.now()}`,
  });
}

export async function enqueuePanelUpdate(data: PanelUpdateJob) {
  const q = await ensureQueue(QUEUE_NAMES.PANEL_UPDATE);
  if (!q) return null;
  return q.add('update', stamp(data), {
    jobId: `panel-update-${data.botClientId}-${Date.now()}`,
  });
}

export async function enqueuePanelDelete(data: PanelDeleteJob) {
  const q = await ensureQueue(QUEUE_NAMES.PANEL_DELETE);
  if (!q) return null;
  return q.add('delete', stamp(data), {
    jobId: `panel-delete-${data.botClientId}-${Date.now()}`,
  });
}

export async function enqueueApplyAction(data: ApplyActionJob) {
  const q = await ensureQueue(QUEUE_NAMES.APPLY_ACTION);
  if (!q) return null;
  return q.add('action', stamp(data));
}

export async function enqueueDashboardLog(data: DashboardLogJob) {
  const q = await ensureQueue(QUEUE_NAMES.DASHBOARD_LOG);
  if (!q) return null;
  return q.add('log', stamp(data));
}

export async function closeAllQueues(): Promise<void> {
  await Promise.all([...queues.values()].map((q) => q.close()));
  queues.clear();
}

export function getQueue(name: QueueName): Queue {
  let q = queues.get(name);
  if (!q) {
    const connection = createRedisConnection();
    q = new Queue(name, {
      connection,
      defaultJobOptions: defaultJobOpts,
    });
    queues.set(name, q);
  }
  return q;
}
