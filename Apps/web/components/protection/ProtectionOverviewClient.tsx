'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Bomb,
  Bot,
  ChevronLeft,
  ChevronRight,
  Command,
  DoorOpen,
  KeyRound,
  Link2,
  Lock,
  MessageSquareWarning,
  RefreshCw,
  ServerCog,
  Settings2,
  Shield,
  ShieldAlert,
  ShieldBan,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserMinus,
} from 'lucide-react';
import {
  BotLoadError,
  BotPageSkeleton,
  SectionCard,
} from '@/components/apply/BotFormBits';
import { useToast } from '@/hooks/useToast';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n/I18nProvider';
import {
  ProtectionSetupGuide,
  ProtectionTip,
} from '@/components/protection/ProtectionHelp';

type FeatureFlag = { id: string; enabled: boolean };

type OverviewData = {
  botId: string;
  running: boolean;
  guildId: string | null;
  features?: FeatureFlag[];
  logChannelId?: string;
  activeLevel?: 'basic' | 'balanced' | 'strict' | 'custom' | null;
  automod?: {
    enabled: boolean;
    lastSyncError?: string;
    lastSyncedAt?: string | null;
  };
};

/** Keep in sync with BotSidebar protection `systems` group order. */
const FEATURE_META: Record<
  string,
  {
    href: string;
    icon: typeof Bomb;
    titleKey: string;
    bodyKey: string;
    whyKey: string;
  }
> = {
  'anti-nuke': {
    href: 'anti-nuke',
    icon: Bomb,
    titleKey: 'antiNuke',
    bodyKey: 'antiNukeBody',
    whyKey: 'antiNukeWhy',
  },
  'anti-raid': {
    href: 'anti-raid',
    icon: ShieldAlert,
    titleKey: 'antiRaid',
    bodyKey: 'antiRaidBody',
    whyKey: 'antiRaidWhy',
  },
  'anti-bots': {
    href: 'anti-bots',
    icon: Bot,
    titleKey: 'antiBots',
    bodyKey: 'antiBotsBody',
    whyKey: 'antiBotsWhy',
  },
  'anti-perms': {
    href: 'anti-perms',
    icon: KeyRound,
    titleKey: 'antiPerms',
    bodyKey: 'antiPermsBody',
    whyKey: 'antiPermsWhy',
  },
  'anti-server': {
    href: 'anti-server',
    icon: ServerCog,
    titleKey: 'antiServer',
    bodyKey: 'antiServerBody',
    whyKey: 'antiServerWhy',
  },
  recovery: {
    href: 'recovery',
    icon: RefreshCw,
    titleKey: 'recovery',
    bodyKey: 'recoveryBody',
    whyKey: 'recoveryWhy',
  },
  'anti-prune': {
    href: 'anti-prune',
    icon: UserMinus,
    titleKey: 'antiPrune',
    bodyKey: 'antiPruneBody',
    whyKey: 'antiPruneWhy',
  },
  'anti-spam': {
    href: 'anti-spam',
    icon: MessageSquareWarning,
    titleKey: 'antiSpam',
    bodyKey: 'antiSpamBody',
    whyKey: 'antiSpamWhy',
  },
  'anti-links': {
    href: 'anti-links',
    icon: Link2,
    titleKey: 'antiLinks',
    bodyKey: 'antiLinksBody',
    whyKey: 'antiLinksWhy',
  },
  automod: {
    href: 'automod',
    icon: Sparkles,
    titleKey: 'automod',
    bodyKey: 'automodBody',
    whyKey: 'automodWhy',
  },
  'join-gate': {
    href: 'join-gate',
    icon: DoorOpen,
    titleKey: 'joinGate',
    bodyKey: 'joinGateBody',
    whyKey: 'joinGateWhy',
  },
  whitelist: {
    href: 'whitelist',
    icon: UserCheck,
    titleKey: 'whitelist',
    bodyKey: 'whitelistBody',
    whyKey: 'whitelistWhy',
  },
  lockdown: {
    href: 'lockdown',
    icon: Lock,
    titleKey: 'lockdown',
    bodyKey: 'lockdownBody',
    whyKey: 'lockdownWhy',
  },
};

const LEVELS = [
  {
    id: 'basic' as const,
    icon: Shield,
    titleKey: 'levelBasic',
    bodyKey: 'levelBasicBody',
    pointsKey: 'levelBasicPoints',
  },
  {
    id: 'balanced' as const,
    icon: ShieldCheck,
    titleKey: 'levelBalanced',
    bodyKey: 'levelBalancedBody',
    pointsKey: 'levelBalancedPoints',
  },
  {
    id: 'strict' as const,
    icon: ShieldBan,
    titleKey: 'levelStrict',
    bodyKey: 'levelStrictBody',
    pointsKey: 'levelStrictPoints',
  },
];

function levelLabel(
  p: Record<string, any>,
  level: OverviewData['activeLevel'],
) {
  if (level === 'basic') return p.levelBasic;
  if (level === 'balanced') return p.levelBalanced;
  if (level === 'strict') return p.levelStrict;
  if (level === 'custom') return p.levelCustom;
  return p.levelNone;
}

export default function ProtectionOverviewClient() {
  const { botId } = useParams<{ botId: string }>();
  const toast = useToast();
  const { t, locale } = useI18n();
  const p = t.protection as Record<string, any>;
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const Chevron = locale === 'ar' ? ChevronLeft : ChevronRight;
  const base = `/dashboard/${botId}`;

  function loadOverview() {
    return api<OverviewData>(`/protection/${botId}`).then((res) => {
      setData(res);
      setLoadError(false);
    });
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadOverview()
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botId]);

  async function applyLevel(level: 'basic' | 'balanced' | 'strict') {
    setApplying(level);
    try {
      const res = await api<OverviewData>(
        `/protection/${botId}/levels/apply`,
        {
          method: 'POST',
          body: JSON.stringify({ level }),
        },
      );
      setData((prev) =>
        prev
          ? {
              ...prev,
              ...res,
              running: prev.running,
              guildId: res.guildId ?? prev.guildId,
            }
          : res,
      );
      toast.success(p.levelApplied);
    } catch {
      toast.error(p.levelApplyFailed);
    } finally {
      setApplying(null);
    }
  }

  if (loading && !data) return <BotPageSkeleton />;
  if (loadError || !data) {
    return (
      <BotLoadError
        message={t.errors.loadBot}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const features = data.features || [];
  const enabledCount = features.filter((f) => f.enabled).length;
  const activeLevel = data.activeLevel ?? null;
  const nextAction = !data.running
    ? p.nextActionOffline
    : !activeLevel || activeLevel === null
      ? p.nextActionNoLevel
      : !data.logChannelId
        ? p.nextActionNoLog
        : null;

  return (
    <main className="dashboard-page space-y-6">
      <header className="settings-page-header">
        <div>
          <p className="settings-page-eyebrow">{p.badge}</p>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {p.overviewTitle}
          </h1>
          <p className="mt-1 max-w-[52ch] text-sm text-muted-foreground">
            {p.overviewSubtitle}
          </p>
        </div>
      </header>

      <ProtectionSetupGuide
        title={p.guideTitle}
        subtitle={p.guideSubtitle}
        steps={[p.guideStep1, p.guideStep2, p.guideStep3, p.guideStep4]}
      />

      {nextAction ? (
        <ProtectionTip title={p.tipTitle} body={nextAction} />
      ) : (
        <ProtectionTip title={p.tipTitle} body={p.tipBotRole} />
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <SectionCard title={p.statusCard} icon={Settings2}>
          <p className="text-2xl font-semibold tracking-tight">
            {data.running ? p.online : p.offline}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.guildId || p.noGuild}
          </p>
        </SectionCard>
        <SectionCard title={p.featuresCard} icon={ShieldAlert}>
          <p className="text-2xl font-semibold tracking-tight">
            {enabledCount}
            <span className="ms-2 text-sm font-normal text-muted-foreground">
              / {features.length}
            </span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {p.featuresEnabled}
          </p>
        </SectionCard>
        <SectionCard title={p.levelCard} icon={ShieldCheck}>
          <p className="text-2xl font-semibold tracking-tight">
            {levelLabel(p, activeLevel)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.automod?.enabled
              ? data.automod.lastSyncError
                ? p.automodSyncError
                : p.automodOn
              : p.automodOff}
          </p>
        </SectionCard>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {p.levelsTitle}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{p.levelsSubtitle}</p>
          <p className="mt-2 text-xs text-muted-foreground/90">{p.levelsTip}</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {LEVELS.map((lvl) => {
            const Icon = lvl.icon;
            const active = activeLevel === lvl.id;
            const points = String(p[lvl.pointsKey] || '')
              .split('|')
              .map((s) => s.trim())
              .filter(Boolean);
            return (
              <div
                key={lvl.id}
                className={`rounded-2xl border p-4 transition ${
                  active
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-border bg-card/90'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                    <Icon size={18} />
                  </span>
                  {active ? (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                      {p.levelActive}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 font-medium">{p[lvl.titleKey]}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {p[lvl.bodyKey]}
                </p>
                <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                  {points.map((line) => (
                    <li key={line} className="flex gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={!!applying || active}
                  onClick={() => void applyLevel(lvl.id)}
                  className="ui-press mt-4 w-full rounded-xl border border-primary/45 bg-primary/30 px-3 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/45 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {applying === lvl.id
                    ? p.levelApplying
                    : active
                      ? p.levelActive
                      : p.levelApply}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {p.quickLinks}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Object.entries(FEATURE_META).map(([id, meta]) => {
            const Icon = meta.icon;
            const flag = features.find((f) => f.id === id);
            const title = p[meta.titleKey] as string;
            const body = p[meta.bodyKey] as string;
            const why = p[meta.whyKey] as string | undefined;
            return (
              <Link
                key={id}
                href={`${base}/${meta.href}`}
                className="group rounded-2xl border border-border bg-card/90 p-4 transition hover:border-primary/35 hover:bg-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                    <Icon size={18} />
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      flag?.enabled
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {flag?.enabled ? p.enabled : p.disabled}
                  </span>
                </div>
                <p className="mt-3 font-medium">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                {why ? (
                  <p className="mt-2 border-t border-border/60 pt-2 text-xs leading-relaxed text-muted-foreground/90">
                    <span className="font-medium text-foreground/80">
                      {p.whenUseful}:{' '}
                    </span>
                    {why}
                  </p>
                ) : null}
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-80 group-hover:opacity-100">
                  {t.nav.settings}
                  <Chevron size={14} />
                </span>
              </Link>
            );
          })}
          <Link
            href={`${base}/commands`}
            className="group rounded-2xl border border-border bg-card/90 p-4 transition hover:border-primary/35 hover:bg-card"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Command size={18} />
            </span>
            <p className="mt-3 font-medium">{t.nav.commands}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {p.settingsSubtitle}
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
