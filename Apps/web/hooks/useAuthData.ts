'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ApiError, api, clearToken, getToken } from '@/lib/api';

export type SecurityMethod = 'email' | 'totp' | 'backup';

export type SecurityStatus = {
  email: {
    enabled: boolean;
    address: string | null;
    enabledAt: string | null;
  };
  totp: {
    enabled: boolean;
    enabledAt: string | null;
  };
  backup: {
    enabled: boolean;
    remaining: number;
    enabledAt: string | null;
  };
  methods: SecurityMethod[];
  mailConfigured?: boolean;
};

export type MeUser = {
  id: string;
  username?: string;
  avatar?: string | null;
  role?: 'bot-owner' | 'bot-admin';
  botIds?: string[];
  adminBotIds?: string[];
  security?: SecurityStatus;
  twoFactorEnabled?: boolean;
  twoFactorEnabledAt?: string | null;
  recoveryCodesRemaining?: number;
};

/** Avoid SSR/client token mismatch that causes hydration errors. */
function useClientToken() {
  const [ready, setReady] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    setHasToken(Boolean(getToken()));
    setReady(true);
  }, []);

  return { ready, hasToken };
}

export function useMe() {
  const router = useRouter();
  const { ready, hasToken } = useClientToken();

  const { data, error, isLoading, mutate } = useSWR(
    ready && hasToken ? ['auth-me'] : null,
    () => api<MeUser>('/auth/me'),
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
      onError(err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          clearToken();
          router.replace('/');
        }
      },
    },
  );

  return {
    me: data ?? null,
    loading: !ready || (hasToken && isLoading && !data),
    error,
    mutate,
  };
}

export type OwnedBot = {
  clientId: string;
  type: string;
  running: boolean;
  guild: string | null;
  owner: string | null;
  source: string;
  dashboardUrl: string | null;
  endTime?: string | null;
  accessRole?: 'owner' | 'admin';
  subscriptionStatus?: 'active' | 'warn' | 'grace' | 'expired';
  graceUntil?: string | null;
  graceMsLeft?: number;
  graceDaysLeft?: number;
  locked?: boolean;
  renewable?: boolean;
  renewPrice?: number | null;
};

export function useMyBots() {
  const router = useRouter();
  const { ready, hasToken } = useClientToken();

  useEffect(() => {
    if (!ready) return;
    if (!hasToken) router.replace('/');
  }, [ready, hasToken, router]);

  const { data, error, isLoading, mutate } = useSWR(
    ready && hasToken ? ['bots-mine'] : null,
    () => api<OwnedBot[]>('/bots/mine'),
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

  return {
    bots: data ?? [],
    loading: !ready || (hasToken && isLoading && !data),
    error,
    reload: () => mutate(),
    mutate,
  };
}
