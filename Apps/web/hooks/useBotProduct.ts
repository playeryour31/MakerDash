'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { useMyBots } from '@/hooks/useAuthData';
import { api } from '@/lib/api';
import {
  getBotTypeConfig,
  resolveBotTypeKey,
  type BotTypeKey,
} from '@/lib/botTypeConfig';

function isMuslimType(raw?: string | null): boolean {
  return resolveBotTypeKey(raw) === 'muslim';
}

function isSystemType(raw?: string | null): boolean {
  return resolveBotTypeKey(raw) === 'system';
}

function isProtectionType(raw?: string | null): boolean {
  return resolveBotTypeKey(raw) === 'protection';
}

function isLogsType(raw?: string | null): boolean {
  return resolveBotTypeKey(raw) === 'logs';
}

export function useBotProduct(botId: string | undefined) {
  const { bots, loading } = useMyBots();
  const bot = useMemo(
    () => bots.find((b) => String(b.clientId) === String(botId)) ?? null,
    [bots, botId],
  );
  const fromList = bot?.type ?? null;
  const listMuslim = isMuslimType(fromList);
  const listSystem = isSystemType(fromList);
  const listProtection = isProtectionType(fromList);
  const listLogs = isLogsType(fromList);

  // Probe Muslim only when list type is not already a known product type
  const shouldProbe =
    Boolean(botId) &&
    !loading &&
    !listMuslim &&
    !listSystem &&
    !listProtection &&
    !listLogs;

  const { data: muslimProbe, isLoading: probing } = useSWR(
    shouldProbe ? ['muslim-probe', String(botId)] : null,
    async () => {
      try {
        await api(`/muslim/${botId}`);
        return true;
      } catch {
        return false;
      }
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
      keepPreviousData: false,
    },
  );

  return useMemo(() => {
    const probedMuslim = muslimProbe === true;
    const isMuslim = listMuslim || probedMuslim;
    const isSystem =
      !isMuslim && (listSystem || resolveBotTypeKey(fromList) === 'system');
    const isProtection =
      !isMuslim &&
      !isSystem &&
      (listProtection || resolveBotTypeKey(fromList) === 'protection');
    const isLogs =
      !isMuslim &&
      !isSystem &&
      !isProtection &&
      (listLogs || resolveBotTypeKey(fromList) === 'logs');
    const typeKey: BotTypeKey = isMuslim
      ? 'muslim'
      : isSystem
        ? 'system'
        : isProtection
          ? 'protection'
          : isLogs
            ? 'logs'
            : resolveBotTypeKey(fromList);
    const config = getBotTypeConfig(
      isMuslim
        ? 'muslim'
        : isSystem
          ? 'system'
          : isProtection
            ? 'protection'
            : isLogs
              ? 'logs'
              : fromList,
    );
    const ready = !loading && (!shouldProbe || !probing);
    return {
      bot,
      typeKey,
      config,
      isMuslim,
      isSystem,
      isProtection,
      isLogs,
      /** @deprecated use isMuslim */
      isAzkar: isMuslim,
      isApply: typeKey === 'applications',
      loading: loading || (shouldProbe && probing),
      ready,
    };
  }, [
    bot,
    fromList,
    listMuslim,
    listSystem,
    listProtection,
    listLogs,
    muslimProbe,
    loading,
    shouldProbe,
    probing,
  ]);
}
