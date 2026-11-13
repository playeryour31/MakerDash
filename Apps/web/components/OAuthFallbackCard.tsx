'use client';

import { Shield, ShieldCheck } from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useI18n } from '@/lib/i18n/I18nProvider';

export default function OAuthFallbackCard({
  kind,
  state,
  error,
}: {
  kind: 'admin' | 'bot';
  state: string;
  error?: string | null;
}) {
  const { t, locale } = useI18n();
  const Icon = kind === 'admin' ? Shield : ShieldCheck;
  const title =
    kind === 'admin' ? t.links.adminInviteTitle : t.links.botLinkTitle;

  return (
    <section className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card/90 p-8 text-center shadow-glow-lg backdrop-blur">
      <div className="mb-5 flex justify-center">
        <LanguageSwitcher size="sm" />
      </div>
      <div className="mx-auto flex items-center justify-center gap-3">
        <BrandMark size={40} />
        <div className={locale === 'ar' ? 'text-right' : 'text-left'}>
          <p className="font-display text-xs font-semibold tracking-wider text-primary">
            VOLYX MAKER
          </p>
          <h1 className="font-display text-xl font-bold">{title}</h1>
        </div>
      </div>
      <p className="mt-6 text-sm text-destructive">
        {error || t.common.discordRedirectFailed}
      </p>
      <a
        href={`/api/auth/discord?state=${encodeURIComponent(state)}`}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
      >
        <Icon size={16} />
        {t.common.continueDiscord}
      </a>
    </section>
  );
}
