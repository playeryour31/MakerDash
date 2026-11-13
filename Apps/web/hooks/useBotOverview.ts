'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ApiError, api, clearToken, hasSession } from '@/lib/api';
import type { AccessInfo, BotOverview } from '@/lib/botTypes';

async function fetchOverview(botId: string) {
  return api<BotOverview>(`/apply/${botId}`);
}

async function fetchAccess(botId: string) {
  try {
    return await api<AccessInfo>(`/bots/${botId}/access`, { method: 'POST' });
  } catch {
    return null;
  }
}

export function useBotOverview(botId: string | undefined) {
  const router = useRouter();
  const ready = Boolean(
    botId && typeof window !== 'undefined' && hasSession(),
  );

  useEffect(() => {
    if (!hasSession()) {
      router.replace('/');
    }
  }, [router]);

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR(
    ready ? ['bot-overview', botId] : null,
    ([, id]) => fetchOverview(String(id)),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      onError(err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          clearToken();
          router.replace('/?error=oauth_failed');
        }
      },
    },
  );

  const { data: access, mutate: mutateAccess } = useSWR(
    ready && data ? ['bot-access', botId] : null,
    ([, id]) => fetchAccess(String(id)),
    {
      revalidateOnFocus: false,
      dedupingInterval: 15000,
    },
  );

  const load = useCallback(async () => {
    if (!botId) return null;
    const overview = await mutate(fetchOverview(botId), { revalidate: false });
    await mutateAccess(fetchAccess(botId), { revalidate: false });
    return overview ?? null;
  }, [botId, mutate, mutateAccess]);

  const reload = useCallback(async () => {
    try {
      await mutate();
      await mutateAccess();
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        clearToken();
        router.replace('/?error=oauth_failed');
      }
    }
  }, [mutate, mutateAccess, router]);

  const retry = useCallback(() => {
    void reload();
  }, [reload]);

  const loadError =
    error && !(error instanceof ApiError && (error.status === 401 || error.status === 403))
      ? 'LOAD_BOT'
      : '';

  return {
    data: data ?? null,
    setData: (
      next:
        | BotOverview
        | null
        | ((prev: BotOverview | null) => BotOverview | null),
    ) => {
      void mutate(
        (current) => {
          const prev = current ?? null;
          return typeof next === 'function' ? next(prev) ?? undefined : next ?? undefined;
        },
        { revalidate: false },
      );
    },
    access: access ?? null,
    loading: Boolean(botId) && isLoading && !data,
    validating: isValidating,
    loadError,
    load,
    reload,
    retry,
  };
}
