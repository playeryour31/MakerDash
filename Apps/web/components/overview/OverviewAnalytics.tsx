'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  Clock3,
  Download,
  Layers,
  Percent,
  RefreshCw,
  Settings2,
  Timer,
} from 'lucide-react';
import { BotLoadError, BotPageSkeleton } from '@/components/apply/BotFormBits';
import { useBotOverview } from '@/hooks/useBotOverview';
import { useI18n } from '@/lib/i18n/I18nProvider';
import type { BotPanel, PendingApplication } from '@/lib/botTypes';

type RangeKey = '7' | '30' | '90' | 'all';

function formatDateLabel(date: Date, locale: string) {
  return date.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function pct(n: number) {
  return `${n.toFixed(1)}%`;
}

function panelLabel(panel: BotPanel) {
  return panel.embed?.title || panel.buttonLabel || panel.messageId;
}

function appPanelId(item: PendingApplication) {
  return item.panelMessageId || item.messageId;
}

function inRange(iso: string | undefined, start: Date | null, end: Date) {
  if (!start) return true;
  if (!iso) return true;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return true;
  return t >= start.getTime() && t <= end.getTime();
}

function formatAvgMs(
  ms: number | null,
  labels: { minutes: string; hours: string; days: string },
) {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return null;
  const mins = ms / 60000;
  if (mins < 60) return `${Math.max(1, Math.round(mins))}${labels.minutes}`;
  const hours = mins / 60;
  if (hours < 48) return `${hours.toFixed(1)}${labels.hours}`;
  return `${(hours / 24).toFixed(1)}${labels.days}`;
}

function relativeTime(
  iso: string | undefined,
  locale: string,
  labels: {
    justNow: string;
    mins: string;
    hours: string;
    days: string;
  },
) {
  if (!iso) return '—';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '—';
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return labels.justNow;
  if (mins < 60) return `${mins}${labels.mins}`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}${labels.hours}`;
  const days = Math.floor(hours / 24);
  return `${days}${labels.days}`;
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function OverviewAnalytics({ botId }: { botId: string }) {
  const { t, locale } = useI18n();
  const { data, loading, loadError, reload, retry } = useBotOverview(botId);
  const [nameFilter, setNameFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [rangeKey, setRangeKey] = useState<RangeKey>('30');
  const [refreshing, setRefreshing] = useState(false);

  const range = useMemo(() => {
    const end = new Date();
    if (rangeKey === 'all') return { start: null as Date | null, end };
    const start = new Date();
    const days = rangeKey === '7' ? 7 : rangeKey === '90' ? 90 : 30;
    start.setDate(end.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }, [rangeKey]);

  const panels = data?.panels || [];
  const pending = data?.pending || [];

  const rangedApps = useMemo(() => {
    return pending.filter((item) =>
      inRange(item.createdAt, range.start, range.end),
    );
  }, [pending, range]);

  const filteredPending = useMemo(() => {
    return rangedApps.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (nameFilter !== 'all') {
        const panel = panels.find((p) => p.messageId === appPanelId(item));
        const name = panel ? panelLabel(panel) : '';
        if (name !== nameFilter) return false;
      }
      return true;
    });
  }, [rangedApps, panels, nameFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = filteredPending.length;
    const pendingCount = filteredPending.filter((p) => p.status === 'pending')
      .length;
    const accepted = filteredPending.filter((p) => p.status === 'accepted')
      .length;
    const rejected = filteredPending.filter((p) => p.status === 'rejected')
      .length;
    const decided = accepted + rejected;
    const approval = decided ? (accepted / decided) * 100 : 0;
    const completion = total ? (decided / total) * 100 : 0;

    const reviewSamples = filteredPending
      .filter(
        (p) =>
          (p.status === 'accepted' || p.status === 'rejected') &&
          p.createdAt &&
          p.decidedAt,
      )
      .map((p) => Date.parse(p.decidedAt!) - Date.parse(p.createdAt!))
      .filter((ms) => Number.isFinite(ms) && ms >= 0);
    const avgReviewMs = reviewSamples.length
      ? reviewSamples.reduce((a, b) => a + b, 0) / reviewSamples.length
      : null;

    return {
      total,
      pendingCount,
      approval,
      completion,
      accepted,
      rejected,
      avgReviewMs,
    };
  }, [filteredPending]);

  const statusRows = useMemo(() => {
    const total = Math.max(stats.total, 1);
    return [
      {
        key: 'pending',
        label: t.overview.statusPending,
        count: stats.pendingCount,
        tone: 'warn' as const,
      },
      {
        key: 'accepted',
        label: t.overview.statusAccepted,
        count: stats.accepted,
        tone: 'ok' as const,
      },
      {
        key: 'rejected',
        label: t.overview.statusRejected,
        count: stats.rejected,
        tone: 'bad' as const,
      },
    ].map((row) => ({
      ...row,
      share: Math.round((row.count / total) * 100),
    }));
  }, [stats, t]);

  const panelRows = useMemo(() => {
    return panels
      .map((panel) => {
        const apps = rangedApps.filter(
          (p) => appPanelId(p) === panel.messageId,
        );
        return {
          id: panel.messageId,
          name: panelLabel(panel),
          appliedCount: panel.appliedCount || apps.length,
          pendingCount: apps.filter((a) => a.status === 'pending').length,
          status: panel.status,
        };
      })
      .sort((a, b) => b.appliedCount - a.appliedCount);
  }, [panels, rangedApps]);

  const panelNames = useMemo(
    () => Array.from(new Set(panels.map(panelLabel).filter(Boolean))),
    [panels],
  );

  const statuses = useMemo(
    () => Array.from(new Set(pending.map((p) => p.status).filter(Boolean))),
    [pending],
  );

  const activity = useMemo(() => {
    const days =
      rangeKey === '7' ? 7 : rangeKey === '90' ? 90 : rangeKey === '30' ? 30 : 14;
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const buckets: Array<{ key: string; label: string; count: number }> = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date(end);
      d.setDate(end.getDate() - i);
      const key = dayKey(d);
      buckets.push({
        key,
        label: d.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
          month: 'short',
          day: 'numeric',
        }),
        count: 0,
      });
    }
    const index = new Map(buckets.map((b, i) => [b.key, i]));
    for (const app of filteredPending) {
      if (!app.createdAt) continue;
      const d = new Date(app.createdAt);
      if (Number.isNaN(d.getTime())) continue;
      d.setHours(0, 0, 0, 0);
      const i = index.get(dayKey(d));
      if (i != null) buckets[i].count += 1;
    }
    return buckets;
  }, [filteredPending, rangeKey, locale]);

  const activityMax = Math.max(1, ...activity.map((d) => d.count));

  const avgLabel = formatAvgMs(stats.avgReviewMs, {
    minutes: t.overview.minutes,
    hours: t.overview.avgTimeHours,
    days: t.overview.avgTimeDays,
  });

  async function onRefresh() {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }

  function onExport() {
    const payload = {
      exportedAt: new Date().toISOString(),
      botId,
      range: {
        key: rangeKey,
        start: range.start?.toISOString() ?? null,
        end: range.end.toISOString(),
      },
      stats,
      applications: filteredPending,
      panels: panels.map((p) => ({
        messageId: p.messageId,
        title: panelLabel(p),
        appliedCount: p.appliedCount,
        status: p.status,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maker-apply-overview-${botId.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading && !data) return <BotPageSkeleton />;
  if (!data && loadError) {
    return (
      <BotLoadError
        message={loadError === 'LOAD_BOT' ? t.errors.loadBot : loadError}
        onRetry={retry}
      />
    );
  }

  const dateLabel =
    range.start == null
      ? t.overview.rangeAll
      : `${formatDateLabel(range.start, locale)} – ${formatDateLabel(range.end, locale)}`;
  const hasApps = filteredPending.length > 0;
  const hasPanels = panelRows.length > 0;
  const pendingNow = pending.filter((p) => p.status === 'pending').length;

  return (
    <main className="dashboard-page overview-page">
      <header className="overview-hero">
        <div className="overview-hero-copy">
          <div className="overview-hero-meta">
            <span className="overview-chip">{t.overview.badge}</span>
            {data?.running != null ? (
              <span
                className={`overview-live ${data.running ? 'is-on' : 'is-off'}`}
              >
                <i />
                {data.running ? t.common.online : t.common.offline}
              </span>
            ) : null}
          </div>
          <h1 className="overview-title">{t.overview.title}</h1>
          <p className="overview-subtitle">{t.overview.subtitle}</p>
        </div>

        <div className="overview-hero-actions">
          <span className="overview-action is-static" title={t.overview.dateRange}>
            <span dir="ltr">{dateLabel}</span>
          </span>
          <button type="button" className="overview-action" onClick={onExport}>
            <Download size={15} strokeWidth={1.75} />
            {t.common.export}
          </button>
          <button
            type="button"
            className="overview-action is-primary"
            onClick={onRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              size={15}
              strokeWidth={1.75}
              className={refreshing ? 'animate-spin' : undefined}
            />
            {t.common.refresh}
          </button>
        </div>
      </header>

      <section className="overview-quick">
        <p className="overview-quick-label">{t.overview.quickActions}</p>
        <div className="overview-quick-row">
          <Link
            href={`/dashboard/${botId}/requests`}
            className="overview-quick-link"
          >
            <Clock3 size={15} />
            {t.overview.quickPending}
            <strong className="tabular-nums">{pendingNow}</strong>
          </Link>
          <Link
            href={`/dashboard/${botId}/panels`}
            className="overview-quick-link"
          >
            <Layers size={15} />
            {t.overview.quickPanels}
          </Link>
          <Link
            href={`/dashboard/${botId}/settings`}
            className="overview-quick-link"
          >
            <Settings2 size={15} />
            {t.overview.quickSettings}
          </Link>
        </div>
      </section>

      <section className="overview-toolbar">
        <label className="overview-filter">
          <span>{t.overview.filterRange}</span>
          <select
            value={rangeKey}
            onChange={(e) => setRangeKey(e.target.value as RangeKey)}
            className="field-input"
          >
            <option value="7">{t.overview.range7}</option>
            <option value="30">{t.overview.range30}</option>
            <option value="90">{t.overview.range90}</option>
            <option value="all">{t.overview.rangeAll}</option>
          </select>
        </label>
        <label className="overview-filter">
          <span>{t.overview.filterName}</span>
          <select
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="field-input"
          >
            <option value="all">{t.common.allTypes}</option>
            {panelNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="overview-filter">
          <span>{t.overview.filterStatus}</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="field-input"
          >
            <option value="all">{t.common.allStatuses}</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        {(nameFilter !== 'all' || statusFilter !== 'all' || rangeKey !== '30') && (
          <button
            type="button"
            className="overview-clear"
            onClick={() => {
              setNameFilter('all');
              setStatusFilter('all');
              setRangeKey('30');
            }}
          >
            {t.common.clearFilters}
          </button>
        )}
      </section>

      <section className="overview-kpi-grid">
        <article className="overview-kpi">
          <div className="overview-kpi-top">
            <p>{t.overview.kpiTotal}</p>
            <span>
              <ClipboardList size={15} strokeWidth={1.75} />
            </span>
          </div>
          <strong className="tabular-nums">{stats.total}</strong>
        </article>
        <article className="overview-kpi">
          <div className="overview-kpi-top">
            <p>{t.overview.kpiPending}</p>
            <span>
              <Clock3 size={15} strokeWidth={1.75} />
            </span>
          </div>
          <strong className="tabular-nums">{stats.pendingCount}</strong>
        </article>
        <article className="overview-kpi">
          <div className="overview-kpi-top">
            <p>{t.overview.kpiApproval}</p>
            <span>
              <Percent size={15} strokeWidth={1.75} />
            </span>
          </div>
          <strong className="tabular-nums">{pct(stats.approval)}</strong>
        </article>
        <article className="overview-kpi">
          <div className="overview-kpi-top">
            <p>{t.overview.kpiCompletion}</p>
            <span>
              <CheckCircle2 size={15} strokeWidth={1.75} />
            </span>
          </div>
          <strong className="tabular-nums">{pct(stats.completion)}</strong>
        </article>
        <article className="overview-kpi">
          <div className="overview-kpi-top">
            <p>{t.overview.kpiPanels}</p>
            <span>
              <Layers size={15} strokeWidth={1.75} />
            </span>
          </div>
          <strong className="tabular-nums">{panels.length}</strong>
        </article>
        <article className="overview-kpi">
          <div className="overview-kpi-top">
            <p>{t.overview.kpiAvgTime}</p>
            <span>
              <Timer size={15} strokeWidth={1.75} />
            </span>
          </div>
          <strong className="tabular-nums">{avgLabel ?? '—'}</strong>
          {!avgLabel ? <em>{t.overview.avgTimeHint}</em> : null}
        </article>
      </section>

      <section className="overview-card">
        <header className="overview-card-head">
          <h2>{t.overview.chartActivity}</h2>
          <span className="tabular-nums">{stats.total}</span>
        </header>
        {hasApps ? (
          <div className="overview-activity">
            {activity.map((day) => (
              <div key={day.key} className="overview-activity-col" title={`${day.label}: ${day.count}`}>
                <div className="overview-activity-track">
                  <i style={{ height: `${Math.max((day.count / activityMax) * 100, day.count ? 8 : 0)}%` }} />
                </div>
                <span>{day.label}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="overview-empty">
            <p>{t.overview.emptySubmitted}</p>
          </div>
        )}
      </section>

      <section className="overview-split">
        <article className="overview-card">
          <header className="overview-card-head">
            <h2>{t.overview.chartStatus}</h2>
            <span>{stats.total}</span>
          </header>
          {hasApps ? (
            <ul className="overview-status-list">
              {statusRows.map((row) => (
                <li key={row.key}>
                  <div className="overview-status-meta">
                    <span>{row.label}</span>
                    <strong className="tabular-nums">
                      {row.count}
                      <small>{row.share}%</small>
                    </strong>
                  </div>
                  <div className="overview-bar">
                    <i
                      className={`tone-${row.tone}`}
                      style={{
                        width: `${Math.max(row.share, row.count ? 4 : 0)}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="overview-empty">
              <p>{t.overview.emptySubmitted}</p>
            </div>
          )}
        </article>

        <article className="overview-card">
          <header className="overview-card-head">
            <h2>{t.overview.chartByName}</h2>
            <Link href={`/dashboard/${botId}/panels`} className="overview-link">
              {t.overview.managePanels}
            </Link>
          </header>
          {hasPanels ? (
            <ul className="overview-panel-list">
              {panelRows.map((row) => (
                <li key={row.id}>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{row.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {row.pendingCount} {t.overview.pendingShort}
                    </p>
                  </div>
                  <strong className="tabular-nums">{row.appliedCount}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <div className="overview-empty">
              <p>{t.overview.emptyPanels}</p>
              <Link
                href={`/dashboard/${botId}/panels`}
                className="overview-link mt-3 inline-flex"
              >
                {t.overview.managePanels}
              </Link>
            </div>
          )}
        </article>
      </section>

      <section className="overview-card">
        <header className="overview-card-head">
          <h2>{t.overview.recentApps}</h2>
          <Link href={`/dashboard/${botId}/requests`} className="overview-link">
            {t.overview.viewRequests}
          </Link>
        </header>
        {hasApps ? (
          <ul className="overview-apps-list">
            {filteredPending.slice(0, 8).map((item: PendingApplication) => {
              const panel = panels.find((p) => p.messageId === appPanelId(item));
              return (
                <li key={item.id}>
                  <div className="min-w-0">
                    <p className="font-mono text-xs" dir="ltr">
                      {item.userId}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {panel ? panelLabel(panel) : appPanelId(item)}
                      {' · '}
                      {relativeTime(item.createdAt, locale, {
                        justNow: t.overview.relativeJustNow,
                        mins: t.overview.relativeMins,
                        hours: t.overview.relativeHours,
                        days: t.overview.relativeDays,
                      })}
                    </p>
                  </div>
                  <span className={`overview-status-pill is-${item.status}`}>
                    {item.status === 'pending'
                      ? t.overview.statusPending
                      : item.status === 'accepted'
                        ? t.overview.statusAccepted
                        : item.status === 'rejected'
                          ? t.overview.statusRejected
                          : item.status}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="overview-empty">
            <p>{t.overview.emptySubmitted}</p>
          </div>
        )}
      </section>
    </main>
  );
}
