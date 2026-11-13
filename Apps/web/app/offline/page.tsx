'use client';

import Link from 'next/link';
import BrandMark from '@/components/BrandMark';
import AmbientBackground from '@/components/AmbientBackground';
import { useI18n } from '@/lib/i18n/I18nProvider';

export default function OfflinePage() {
  const { t } = useI18n();

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center px-4">
      <AmbientBackground />
      <section className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card/90 p-8 text-center shadow-glow-lg backdrop-blur">
        <div className="mx-auto flex items-center justify-center gap-3">
          <BrandMark size={40} />
          <div>
            <p className="font-display text-xs font-semibold tracking-wider text-primary">
              VOLYX MAKER
            </p>
            <h1 className="font-display text-xl font-bold">{t.offline.title}</h1>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{t.offline.body}</p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          {t.offline.retry}
        </Link>
      </section>
    </main>
  );
}
