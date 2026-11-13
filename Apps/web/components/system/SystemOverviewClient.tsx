'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquareText,
  UserPlus,
  HandMetal,
  Trophy,
  SmilePlus,
  Settings2,
  Command,
  ChevronLeft,
  ChevronRight,
  MessagesSquare,
  Users,
  UserMinus,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BotLoadError,
  BotPageSkeleton,
  SectionCard,
} from '@/components/apply/BotFormBits';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n/I18nProvider';

type FeatureFlag = { id: string; enabled: boolean };

type OverviewData = {
  botId: string;
  running: boolean;
  guildId: string | null;
  features?: FeatureFlag[];
};

type StatsPoint = {
  day: string;
  messages: number;
  joins: number;
  leaves: number;
  net: number;
};

type StatsData = {
  botId: string;
  guildId: string | null;
  range: number;
  members: number | null;
  last24h: { messages: number; joins: number; leaves: number };
  series: StatsPoint[];
};

const FEATURE_META: Record<
  string,
  { href: string; icon: typeof LayoutDashboard; titleKey: string; bodyKey: string }
> = {
  'auto-responder': {
    href: 'auto-responder',
    icon: MessageSquareText,
    titleKey: 'autoResponder',
    bodyKey: 'autoResponderBody',
  },
  'auto-roles': {
    href: 'auto-roles',
    icon: UserPlus,
    titleKey: 'autoRoles',
    bodyKey: 'autoRolesBody',
  },
  welcome: {
    href: 'welcome',
    icon: HandMetal,
    titleKey: 'welcome',
    bodyKey: 'welcomeBody',
  },
  leveling: {
    href: 'leveling',
    icon: Trophy,
    titleKey: 'leveling',
    bodyKey: 'levelingBody',
  },
  'reaction-roles': {
    href: 'reaction-roles',
    icon: SmilePlus,
    titleKey: 'reactionRoles',
    bodyKey: 'reactionRolesBody',
  },
};

function cssVar(name: string, fallback: string) {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function formatDayLabel(day: string, locale: string) {
  const d = new Date(`${day}T12:00:00.000Z`);
  return d.toLocaleDateString(locale === 'ar' ? 'ar' : 'en', {
    month: 'short',
    day: 'numeric',
  });
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      {payload.map((p) => (
        <p key={String(p.name)} style={{ color: p.color }} className="tabular-nums">
          {p.name}: {Number(p.value ?? 0).toLocaleString()}
        </p>
      ))}
    </div>
  );
}

export default function SystemOverviewClient() {
  const { botId } = useParams<{ botId: string }>();
  const { t, locale } = useI18n();
  const s = t.system;
  const [data, setData] = useState<OverviewData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [range, setRange] = useState<7 | 30>(7);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const Chevron = locale === 'ar' ? ChevronLeft : ChevronRight;
  const base = `/dashboard/${botId}`;

  const chartColors = useMemo(
    () => ({
      primary: cssVar('--primary', '#4c1d95'),
      muted: cssVar('--muted-foreground', '#71717a'),
      join: '#16a34a',
      leave: '#dc2626',
      net: '#0ea5e9',
      grid: 'color-mix(in srgb, var(--border) 80%, transparent)',
    }),
    // re-read when locale/theme class may change after mount
    [locale, data?.running],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<OverviewData>(`/system/${botId}`)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [botId]);

  useEffect(() => {
    let cancelled = false;
    api<StatsData>(`/system/${botId}/stats?range=${range}`)
      .then((res) => {
        if (!cancelled) setStats(res);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      });
    return () => {
      cancelled = true;
    };
  }, [botId, range]);

  if (loading) return <BotPageSkeleton />;
  if (loadError || !data) return <BotLoadError message={t.errors.loadBot} onRetry={() => window.location.reload()} />;

  const series = (stats?.series || []).map((p) => ({
    ...p,
    label: formatDayLabel(p.day, locale),
  }));
  const hasSeriesActivity = series.some(
    (p) => p.messages > 0 || p.joins > 0 || p.leaves > 0,
  );
  const last24h = stats?.last24h || { messages: 0, joins: 0, leaves: 0 };
  const members =
    stats?.members != null ? stats.members.toLocaleString(locale === 'ar' ? 'ar' : 'en') : '—';

  return (
    <div className="dashboard-page space-y-5">
      <header>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {s.badge}
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
            {s.overviewTitle}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {s.overviewSubtitle}
          </p>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card/90 p-5 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--foreground)_5%,transparent)]">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{s.kpiMessages}</p>
              <p className="mt-2 font-display text-3xl font-semibold tabular-nums tracking-tight">
                {last24h.messages.toLocaleString(locale === 'ar' ? 'ar' : 'en')}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">{s.kpiMessagesHint}</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
              <MessagesSquare size={16} />
            </span>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card/90 p-5 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--foreground)_5%,transparent)]">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{s.kpiJoinsLeaves}</p>
              <p className="mt-2 font-display text-3xl font-semibold tabular-nums tracking-tight">
                <span className="text-emerald-600 dark:text-emerald-400">
                  {last24h.joins.toLocaleString(locale === 'ar' ? 'ar' : 'en')}
                </span>
                <span className="mx-1 text-muted-foreground">/</span>
                <span className="text-rose-600 dark:text-rose-400">
                  {last24h.leaves.toLocaleString(locale === 'ar' ? 'ar' : 'en')}
                </span>
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">{s.kpiJoinsLeavesHint}</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
              <UserMinus size={16} />
            </span>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card/90 p-5 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--foreground)_5%,transparent)]">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{s.kpiMembers}</p>
              <p className="mt-2 font-display text-3xl font-semibold tabular-nums tracking-tight">
                {members}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">{s.kpiMembersHint}</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
              <Users size={16} />
            </span>
          </div>
        </section>
      </div>

      <SectionCard title={s.statsSection} icon={LayoutDashboard}>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              range === 7
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-border bg-secondary text-muted-foreground hover:border-primary/40'
            }`}
            onClick={() => setRange(7)}
          >
            {s.statsRange7}
          </button>
          <button
            type="button"
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              range === 30
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-border bg-secondary text-muted-foreground hover:border-primary/40'
            }`}
            onClick={() => setRange(30)}
          >
            {s.statsRange30}
          </button>
        </div>

        {!hasSeriesActivity ? (
          <p className="mb-4 text-sm text-muted-foreground">{s.noStatsYet}</p>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-1">
          <div>
            <h3 className="mb-3 text-sm font-semibold">{s.chartJoinsLeaves}</h3>
            <div className="h-56 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: chartColors.muted }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: chartColors.muted }} width={36} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="joins"
                    name={s.chartJoins}
                    stroke={chartColors.join}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="leaves"
                    name={s.chartLeaves}
                    stroke={chartColors.leave}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold">{s.chartNet}</h3>
            <div className="h-56 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: chartColors.muted }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: chartColors.muted }} width={36} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="net"
                    name={s.chartNetLabel}
                    stroke={chartColors.net}
                    fill={chartColors.net}
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold">{s.chartMessages}</h3>
            <div className="h-56 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: chartColors.muted }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: chartColors.muted }} width={36} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="messages"
                    name={s.chartMessagesLabel}
                    stroke={chartColors.primary}
                    fill={chartColors.primary}
                    fillOpacity={0.18}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title={s.quickLinks} icon={LayoutDashboard}>
        <div className="grid gap-2 sm:grid-cols-2">
          <Link href={`${base}/settings`} className="sys-feature-link ui-press">
            <Settings2 size={16} />
            <span>{t.nav.settings}</span>
            <Chevron size={16} className="ms-auto opacity-50" />
          </Link>
          <Link href={`${base}/commands`} className="sys-feature-link ui-press">
            <Command size={16} />
            <span>{t.nav.commands}</span>
            <Chevron size={16} className="ms-auto opacity-50" />
          </Link>
        </div>
      </SectionCard>

      <SectionCard title={t.nav.groupSystem} icon={LayoutDashboard}>
        <div className="grid gap-2">
          {(data.features || Object.keys(FEATURE_META).map((id) => ({ id, enabled: false }))).map(
            (f) => {
              const meta = FEATURE_META[f.id];
              if (!meta) return null;
              const Icon = meta.icon;
              const title = (s as any)[meta.titleKey] || f.id;
              const body = (s as any)[meta.bodyKey] || '';
              return (
                <Link
                  key={f.id}
                  href={`${base}/${meta.href}`}
                  className="sys-feature-link ui-press"
                >
                  <span className="sys-feature-icon">
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0 flex-1 text-start">
                    <span className="block text-sm font-semibold">{title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {body}
                    </span>
                  </span>
                  <span
                    className={`sys-feature-pill ${f.enabled ? 'is-on' : 'is-off'}`}
                  >
                    {f.enabled ? s.enabled : s.disabled}
                  </span>
                  <Chevron size={16} className="opacity-50" />
                </Link>
              );
            },
          )}
        </div>
      </SectionCard>
    </div>
  );
}
