/**
 * Persist SWR cache entries to localStorage (full node shape — not just `.data`).
 * Stripping values caused "Invalid value used as weak map key" in SWR internals.
 */
const STORAGE_KEY = 'maker-swr-cache-v2';
const MAX_AGE_MS = 10 * 60 * 1000;

type PersistBlob = {
  at: number;
  entries: [unknown, unknown][];
};

function loadMap(): Map<unknown, unknown> {
  if (typeof window === 'undefined') return new Map();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    const blob = JSON.parse(raw) as PersistBlob;
    if (!blob?.at || Date.now() - blob.at > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return new Map();
    }
    return new Map(blob.entries ?? []);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return new Map();
  }
}

function saveMap(map: Map<unknown, unknown>) {
  if (typeof window === 'undefined') return;
  try {
    const blob: PersistBlob = {
      at: Date.now(),
      entries: Array.from(map.entries()),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
  } catch {
    /* quota / private mode */
  }
}

export function clearPersistCache() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('maker-swr-cache-v1');
  } catch {
    /* ignore */
  }
}

/** SWR-compatible cache provider (client-only). */
export function createPersistProvider(): Map<unknown, unknown> {
  const map = loadMap();

  if (typeof window !== 'undefined') {
    const flush = () => saveMap(map);
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
  }

  return map;
}
