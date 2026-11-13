'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Link2, RefreshCw } from 'lucide-react';
import type { OwnedBot } from '@/hooks/useAuthData';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import {
  BOT_TYPE_ACCENTS,
  getBotTypeConfig,
  truncateBotId,
  type BotTypeKey,
} from '@/lib/botTypeConfig';
import { BotTypeBadge, BotTypeIcon } from './BotTypeIcon';
import { BotStatus } from './BotStatus';

type Props = {
  bot: OwnedBot;
  locale: string;
  t: Dictionary;
  busy: boolean;
  renewing?: boolean;
  onCopyLink: () => void;
  onRenew?: () => void;
};

function typeLabel(t: Dictionary, key: BotTypeKey): string {
  return t.botTypes[key];
}

function typeDesc(t: Dictionary, key: BotTypeKey): string {
  const descKey = `${key}Desc` as keyof typeof t.botTypes;
  return t.botTypes[descKey] || t.botTypes[key];
}

function parseGraceMs(bot: OwnedBot): number {
  if (typeof bot.graceMsLeft === 'number' && bot.graceMsLeft >= 0) {
    return bot.graceMsLeft;
  }
  if (!bot.graceUntil) return 0;
  const d = new Date(String(bot.graceUntil).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(0, d.getTime() - Date.now());
}

function formatCountdown(ms: number, locale: string): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  if (locale === 'ar') {
    if (days > 0) return `${days}ي ${hours}س`;
    if (hours > 0) return `${hours}س ${mins}د`;
    return `${mins}د`;
  }
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function BotCard({
  bot,
  locale,
  t,
  busy,
  renewing = false,
  onCopyLink,
  onRenew,
}: Props) {
  const config = getBotTypeConfig(bot.type);
  const tones = BOT_TYPE_ACCENTS[config.accent];
  const isAdmin = bot.accessRole === 'admin';
  const Chevron = locale === 'ar' ? ChevronLeft : ChevronRight;
  const isMuslim = config.key === 'muslim';
  const category = typeLabel(t, config.key);
  const categoryDesc = typeDesc(t, config.key);
  const locked = Boolean(bot.locked || bot.subscriptionStatus === 'grace');
  const warn = bot.subscriptionStatus === 'warn' && !locked;
  const renewable = Boolean(bot.renewable) && !isAdmin;

  const manageHref = isAdmin
    ? `/dashboard/${bot.clientId}/requests`
    : isMuslim
      ? `/dashboard/${bot.clientId}/settings`
      : `/dashboard/${bot.clientId}/overview`;
  const manageLabel = isAdmin ? t.dashboard.requests : t.dashboard.manage;
  const productName = category;

  const [msLeft, setMsLeft] = useState(() => parseGraceMs(bot));

  useEffect(() => {
    setMsLeft(parseGraceMs(bot));
    if (!locked) return;
    const tick = () => setMsLeft(parseGraceMs(bot));
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [bot.graceUntil, bot.graceMsLeft, locked, bot]);

  const countdown = useMemo(
    () => formatCountdown(msLeft, locale),
    [msLeft, locale],
  );

  const statusVariant = locked ? 'locked' : warn ? 'warn' : undefined;
  const priceLabel =
    bot.renewPrice != null && Number.isFinite(bot.renewPrice)
      ? String(bot.renewPrice)
      : null;

  return (
    <article
      className={`bot-card group relative flex min-h-[17rem] w-full flex-col gap-4 overflow-hidden rounded-[1.35rem] border p-4 transition duration-300 sm:p-5 ${
        locked
          ? 'bot-card-locked border-destructive/25 bg-[#161018] opacity-[0.98]'
          : 'border-white/[0.08] bg-[#12121a] hover:-translate-y-1 hover:border-white/18'
      }`}
      data-bot-type={config.key}
      data-locked={locked ? 'true' : undefined}
      style={
        {
          '--bot-accent': locked ? '#ef4444' : tones.accent,
          backgroundImage: locked
            ? `linear-gradient(160deg, color-mix(in srgb, #ef4444 14%, #161018) 0%, #12121a 58%)`
            : `linear-gradient(160deg, color-mix(in srgb, ${tones.accent} 16%, #12121a) 0%, #12121a 55%)`,
        } as CSSProperties
      }
    >
      <span className="bot-card-accent" aria-hidden />
      <span className="bot-card-sheen" aria-hidden />

      <header className="relative z-[1] flex items-start justify-between gap-3 ps-1">
        <BotTypeIcon type={bot.type} size="lg" />
        <BotStatus
          online={bot.running}
          onlineLabel={t.common.online}
          offlineLabel={t.common.offline}
          variant={statusVariant}
          lockedLabel={t.dashboard.statusExpired}
          warnLabel={t.dashboard.statusWarn}
        />
      </header>

      <div className="relative z-[1] min-w-0 ps-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-[1.15rem] font-bold tracking-tight sm:text-lg">
            {productName}
          </h2>
          {isAdmin ? (
            <span className="rounded-md border border-primary/30 bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-brand-soft">
              {t.dashboard.adminBadge}
            </span>
          ) : null}
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {locked ? t.dashboard.graceHint : categoryDesc}
        </p>
        {locked ? (
          <p className="mt-2 text-xs font-semibold text-destructive/90">
            {t.dashboard.graceCountdown.replace('{time}', countdown)}
          </p>
        ) : null}
        {warn && renewable ? (
          <p className="mt-2 text-xs font-medium text-amber-300/90">
            {t.dashboard.warnHint}
          </p>
        ) : null}
      </div>

      <div className="relative z-[1] mt-auto flex flex-wrap items-center justify-between gap-3 ps-1">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/75">
            {t.dashboard.botId}
          </p>
          <code
            className="mt-0.5 block truncate font-mono text-xs text-muted-foreground"
            dir="ltr"
            title={bot.clientId}
          >
            {truncateBotId(bot.clientId)}
          </code>
        </div>
        <BotTypeBadge
          label={category}
          accent={config.accent}
          icon={config.icon}
        />
      </div>

      <footer className="relative z-[1] flex gap-2 border-t border-white/[0.06] pt-3.5 ps-1">
        {locked ? (
          <button
            type="button"
            disabled={renewing || !onRenew}
            onClick={onRenew}
            className="ui-press inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-primary/45 bg-primary/30 px-3.5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/45 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              strokeWidth={1.85}
              className={renewing ? 'animate-spin' : undefined}
              aria-hidden
            />
            {renewing
              ? t.dashboard.renewing
              : priceLabel
                ? t.dashboard.renewFor.replace('{price}', priceLabel)
                : t.dashboard.renew}
          </button>
        ) : (
          <>
            <Link
              href={manageHref}
              className="ui-press bot-card-cta inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition"
            >
              {manageLabel}
              <Chevron size={15} strokeWidth={1.85} aria-hidden />
            </Link>
            {warn && renewable && onRenew ? (
              <button
                type="button"
                disabled={renewing}
                onClick={onRenew}
                className="ui-press inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                title={
                  priceLabel
                    ? t.dashboard.renewFor.replace('{price}', priceLabel)
                    : t.dashboard.renew
                }
              >
                <RefreshCw
                  size={14}
                  strokeWidth={1.85}
                  className={renewing ? 'animate-spin' : undefined}
                  aria-hidden
                />
                <span>{renewing ? '…' : t.dashboard.renew}</span>
              </button>
            ) : null}
          </>
        )}
        {!isAdmin && !locked ? (
          <button
            type="button"
            disabled={busy}
            onClick={onCopyLink}
            className="ui-press inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs font-semibold text-muted-foreground transition hover:border-white/20 hover:bg-white/[0.06] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            title={bot.dashboardUrl ? t.dashboard.copy : t.dashboard.link}
          >
            <Link2 size={14} strokeWidth={1.85} aria-hidden />
            <span>
              {busy
                ? '…'
                : bot.dashboardUrl
                  ? t.dashboard.copy
                  : t.dashboard.link}
            </span>
          </button>
        ) : null}
      </footer>
    </article>
  );
}
