'use client';

import { useMemo, useState } from 'react';
import { Bot } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useMyBots, type OwnedBot } from '@/hooks/useAuthData';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { useToast } from '@/components/ToastProvider';
import { BotCard } from '@/components/dashboard/BotCard';
import { BotGrid } from '@/components/dashboard/BotGrid';
import {
  DashboardStats,
  DASH_STAT_ICONS,
} from '@/components/dashboard/DashboardStats';

export default function DashboardClient() {
  const { t, locale } = useI18n();
  const toast = useToast();
  const { bots, loading, error: swrError, mutate } = useMyBots();
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [renewId, setRenewId] = useState('');

  const onlineCount = useMemo(
    () => bots.filter((b) => b.running && !b.locked).length,
    [bots],
  );

  async function ensureLink(clientId: string) {
    setBusyId(clientId);
    try {
      const access = await api<{ dashboardUrl: string }>(
        `/bots/${clientId}/access`,
        { method: 'POST' },
      );
      await mutate(
        (prev) =>
          (prev || []).map((b) =>
            b.clientId === clientId
              ? { ...b, dashboardUrl: access.dashboardUrl }
              : b,
          ),
        { revalidate: false },
      );
      await navigator.clipboard.writeText(access.dashboardUrl);
    } catch {
      setError(t.errors.copyLink);
    } finally {
      setBusyId('');
    }
  }

  async function renewBot(clientId: string) {
    setRenewId(clientId);
    setError('');
    try {
      const updated = await api<OwnedBot>(`/bots/${clientId}/renew`, {
        method: 'POST',
      });
      await mutate(
        (prev) =>
          (prev || []).map((b) =>
            b.clientId === clientId ? { ...b, ...updated, locked: false } : b,
          ),
        { revalidate: true },
      );
      toast.success(t.dashboard.renewSuccess);
    } catch (err) {
      let msg =
        err instanceof ApiError ? String(err.body || err.message || '') : '';
      try {
        const parsed = JSON.parse(msg);
        msg = Array.isArray(parsed?.message)
          ? parsed.message.join(' ')
          : String(parsed?.message || msg);
      } catch {
        /* plain text */
      }
      if (/Insufficient|balance|رصيد/i.test(msg)) {
        toast.error(t.errors.renewInsufficient);
      } else if (
        /fewer than|not allowed|cannot renew|Grace period|permanently deleted/i.test(
          msg,
        )
      ) {
        toast.error(t.errors.renewNotAllowed);
      } else {
        toast.error(t.dashboard.renewFailed);
      }
    } finally {
      setRenewId('');
    }
  }

  const displayError = error || (swrError ? t.errors.loadBots : '');

  const stats = useMemo(
    () => [
      {
        icon: DASH_STAT_ICONS.bots,
        label: t.dashboard.statBots,
        value: loading ? '—' : bots.length,
        tone: 'primary' as const,
      },
      {
        icon: DASH_STAT_ICONS.online,
        label: t.dashboard.statOnline,
        value: loading ? '—' : onlineCount,
        tone: 'success' as const,
      },
    ],
    [bots.length, loading, onlineCount, t.dashboard],
  );

  return (
    <main className="bots-hub relative mx-auto w-full max-w-[100rem] space-y-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
      <div className="bots-hub-glow" aria-hidden />

      <header className="bots-hub-hero">
        <div className="bots-hub-hero-copy">
          <p className="bots-hub-eyebrow">{t.nav.myBots}</p>
          <h1 className="bots-hub-title">{t.dashboard.title}</h1>
          <p className="bots-hub-subtitle">{t.dashboard.subtitle}</p>
        </div>
        <DashboardStats
          items={stats}
          loading={loading}
          aria-label={t.dashboard.title}
        />
      </header>

      {displayError ? (
        <p
          role="alert"
          className="w-full rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {displayError}
        </p>
      ) : null}

      {loading ? (
        <BotGrid loading>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="bots-hub-skeleton"
              style={{ animationDelay: `${i * 90}ms` }}
            />
          ))}
        </BotGrid>
      ) : (
        <BotGrid>
          {bots.map((bot: OwnedBot) => (
            <BotCard
              key={bot.clientId}
              bot={bot}
              locale={locale}
              t={t}
              busy={busyId === bot.clientId}
              renewing={renewId === bot.clientId}
              onCopyLink={() => ensureLink(bot.clientId)}
              onRenew={
                bot.accessRole === 'admin'
                  ? undefined
                  : () => renewBot(bot.clientId)
              }
            />
          ))}

          {!bots.length && !displayError ? (
            <div className="bots-hub-empty col-span-full">
              <span className="bots-hub-empty-icon" aria-hidden>
                <Bot size={28} strokeWidth={1.75} />
              </span>
              <h2 className="font-display text-lg font-semibold tracking-tight">
                {t.dashboard.emptyTitle}
              </h2>
              <p className="mx-auto mt-2 max-w-[36ch] text-sm leading-relaxed text-muted-foreground">
                {t.dashboard.emptyBody}
              </p>
            </div>
          ) : null}
        </BotGrid>
      )}
    </main>
  );
}
