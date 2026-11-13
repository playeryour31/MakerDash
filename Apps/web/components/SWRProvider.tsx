'use client';

import { SWRConfig, type Cache } from 'swr';
import type { ReactNode } from 'react';
import { createPersistProvider } from '@/lib/swrPersistCache';

let persistProvider: Cache | undefined;

function getProvider(): Cache {
  if (typeof window === 'undefined') {
    return new Map();
  }
  if (!persistProvider) persistProvider = createPersistProvider() as Cache;
  return persistProvider;
}

export default function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        provider: getProvider,
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        revalidateIfStale: true,
        dedupingInterval: 8000,
        keepPreviousData: true,
        shouldRetryOnError: false,
      }}
    >
      {children}
    </SWRConfig>
  );
}
