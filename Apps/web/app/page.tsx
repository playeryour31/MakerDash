import { Suspense } from 'react';
import type { Metadata } from 'next';
import HomePage from './HomeClient';

export const metadata: Metadata = {
  title: 'Volyx Maker | Bot Dashboard',
  description:
    'Sign in with Discord to manage all your Maker bots from one dashboard.',
  alternates: { canonical: '/' },
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </main>
      }
    >
      <HomePage />
    </Suspense>
  );
}
