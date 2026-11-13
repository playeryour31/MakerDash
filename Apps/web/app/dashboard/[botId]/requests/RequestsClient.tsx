'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  Layers,
  Loader2,
  Search,
  Settings2,
  UserRound,
  X,
} from 'lucide-react';
import {
  BotLoadError,
  BotPageSkeleton,
  SectionCard,
} from '@/components/apply/BotFormBits';
import EmptyState from '@/components/EmptyState';
import { useBotOverview } from '@/hooks/useBotOverview';
import { useToast } from '@/hooks/useToast';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { api } from '@/lib/api';
import type { BotPanel, PendingApplication } from '@/lib/botTypes';

type TabKey = 'pending' | 'accepted' | 'rejected' | 'all';

function panelLabel(panel: BotPanel) {
  return panel.embed?.title || panel.buttonLabel || panel.messageId;
}

function appPanelId(item: PendingApplication) {
  return item.panelMessageId || item.messageId;
}

function formatWhen(iso: string | undefined, locale: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function statusTone(status: string) {
  if (status === 'accepted') return 'accepted';
  if (status === 'rejected') return 'rejected';
  return 'pending';
}

export default function RequestsClient() {
  const { botId } = useParams<{ botId: string }>();
  const toast = useToast();
  const { t, locale } = useI18n();
  const { data, loading, loadError, load, retry } = useBotOverview(botId);

  const [tab, setTab] = useState<TabKey>('pending');
  const [query, setQuery] = useState('');
  const [panelFilter, setPanelFilter] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const panels = data?.panels || [];
  const apps = data?.pending || [];

  const counts = useMemo(() => {
    let pending = 0;
    let accepted = 0;
    let rejected = 0;
    for (const a of apps) {
      if (a.status === 'pending') pending += 1;
      else if (a.status === 'accepted') accepted += 1;
      else if (a.status === 'rejected') rejected += 1;
    }
    return { pending, accepted, rejected, all: apps.length };
  }, [apps]);

  const panelOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of panels) map.set(p.messageId, panelLabel(p));
    for (const a of apps) {
      const id = appPanelId(a);
      if (id && !map.has(id)) map.set(id, id);
    }
    return Array.from(map.entries());
  }, [panels, apps]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return apps
      .filter((item) => {
        if (tab !== 'all' && item.status !== tab) return false;
        if (panelFilter !== 'all' && appPanelId(item) !== panelFilter) return false;
        if (!q) return true;
        const hay = [
          item.userId,
          item.status,
          ...(item.answers || []).flatMap((a) => [a.qes, a.ans]),
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => {
        const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
        const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
        return tb - ta;
      });
  }, [apps, tab, panelFilter, query]);

  const pendingVisible = useMemo(
    () => filtered.filter((a) => a.status === 'pending'),
    [filtered],
  );

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllPending() {
    setSelected(new Set(pendingVisible.map((a) => a.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function decideOne(
    item: PendingApplication,
    action: 'accept' | 'reject',
    { silent }: { silent?: boolean } = {},
  ) {
    await api(`/apply/${botId}/applications/decide`, {
      method: 'POST',
      body: JSON.stringify({
        action,
        guildId: item.guildId,
        channelId: item.channelId,
        messageId: item.messageId,
        userId: item.userId,
        roleId: item.roleId,
        pendingId: item.id,
      }),
    });
    if (!silent) {
      toast.success(
        action === 'accept' ? t.requests.queuedAccept : t.requests.queuedReject,
      );
    }
  }

  async function decide(item: PendingApplication, action: 'accept' | 'reject') {
    const ok = window.confirm(
      action === 'accept' ? t.requests.confirmAccept : t.requests.confirmReject,
    );
    if (!ok) return;
    setBusyId(item.id);
    try {
      await decideOne(item, action);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      await load();
    } catch {
      toast.error(t.requests.decideFailed);
    } finally {
      setBusyId(null);
    }
  }

  async function decideBulk(action: 'accept' | 'reject') {
    const targets = pendingVisible.filter((a) => selected.has(a.id));
    if (!targets.length) return;
    const ok = window.confirm(
      action === 'accept'
        ? t.requests.confirmBulkAccept
        : t.requests.confirmBulkReject,
    );
    if (!ok) return;
    setBulkBusy(true);
    try {
      for (const item of targets) {
        await decideOne(item, action, { silent: true });
      }
      toast.success(
        action === 'accept'
          ? t.requests.queuedBulkAccept
          : t.requests.queuedBulkReject,
      );
      clearSelection();
      await load();
    } catch {
      toast.error(t.requests.decideFailed);
      await load();
    } finally {
      setBulkBusy(false);
    }
  }

  async function copyUserId(userId: string) {
    try {
      await navigator.clipboard.writeText(userId);
      toast.success(t.requests.copied);
    } catch {
      toast.error(t.errors.copyLink);
    }
  }

  function statusLabel(status: string) {
    if (status === 'accepted') return t.requests.accepted;
    if (status === 'rejected') return t.requests.rejected;
    if (status === 'pending') return t.requests.pending;
    return status;
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

  const tabs: Array<{ key: TabKey; label: string; count: number }> = [
    { key: 'pending', label: t.requests.pending, count: counts.pending },
    { key: 'accepted', label: t.requests.accepted, count: counts.accepted },
    { key: 'rejected', label: t.requests.rejected, count: counts.rejected },
    { key: 'all', label: t.requests.all, count: counts.all },
  ];

  const busy = busyId !== null || bulkBusy;

  return (
    <main className="dashboard-page">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {t.requests.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.requests.subtitle}</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              setTab(item.key);
              clearSelection();
            }}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
              tab === item.key
                ? 'border-primary/40 bg-primary/15 text-primary'
                : 'border-border bg-card text-muted-foreground hover:bg-muted/60'
            }`}
          >
            {item.label}
            <span className="tabular-nums rounded-lg bg-background/60 px-1.5 py-0.5 text-[11px]">
              {item.count}
            </span>
          </button>
        ))}
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-end">
        <label className="relative min-w-0 flex-1 text-sm">
          <span className="text-muted-foreground">{t.requests.search}</span>
          <Search
            size={15}
            className="pointer-events-none absolute bottom-3 start-3 text-muted-foreground"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.requests.searchPlaceholder}
            className="mt-1.5 w-full rounded-xl border border-border bg-background py-2.5 ps-9 pe-3 text-sm outline-none ring-primary/30 focus:ring-2"
          />
        </label>
        <label className="block text-sm sm:w-56">
          <span className="text-muted-foreground">{t.requests.filterPanel}</span>
          <select
            value={panelFilter}
            onChange={(e) => setPanelFilter(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none ring-primary/30 focus:ring-2"
          >
            <option value="all">{t.requests.allPanels}</option>
            {panelOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </section>

      {tab === 'pending' && pendingVisible.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
          <button
            type="button"
            className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted/60"
            onClick={selectAllPending}
            disabled={busy}
          >
            {t.requests.selectAll}
          </button>
          {selected.size > 0 ? (
            <>
              <button
                type="button"
                className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted/60"
                onClick={clearSelection}
                disabled={busy}
              >
                {t.requests.clearSelection}
              </button>
              <span className="text-xs text-muted-foreground">
                {selected.size} {t.requests.selected}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => void decideBulk('accept')}
                className="ms-auto inline-flex items-center gap-1.5 rounded-lg bg-success/15 px-2.5 py-1.5 text-xs font-semibold text-success disabled:opacity-50"
              >
                {bulkBusy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                {t.requests.bulkAccept}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void decideBulk('reject')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-destructive/15 px-2.5 py-1.5 text-xs font-semibold text-destructive disabled:opacity-50"
              >
                {bulkBusy ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                {t.requests.bulkReject}
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      <SectionCard
        icon={UserRound}
        title={tabs.find((x) => x.key === tab)?.label || t.requests.title}
        badge={filtered.length}
      >
        <div className="space-y-3">
          {filtered.map((item) => {
            const panel = panels.find((p) => p.messageId === appPanelId(item));
            const isOpen = expanded.has(item.id);
            const isPending = item.status === 'pending';
            const itemBusy = busyId === item.id || bulkBusy;

            return (
              <article
                key={item.id}
                className="ui-interactive rounded-xl border border-border/70 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {isPending ? (
                        <input
                          type="checkbox"
                          checked={selected.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          disabled={busy}
                          className="rounded border-border"
                          aria-label={t.requests.selectAll}
                        />
                      ) : null}
                      <p className="inline-flex items-center gap-2 text-sm font-semibold">
                        <UserRound size={15} className="text-primary" />
                        <span className="font-mono text-xs" dir="ltr">
                          {item.userId}
                        </span>
                      </p>
                      <button
                        type="button"
                        onClick={() => void copyUserId(item.userId)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted/60"
                      >
                        <ClipboardCopy size={12} />
                        {t.requests.copyUserId}
                      </button>
                      <span
                        className={`overview-status-pill is-${statusTone(item.status)}`}
                      >
                        {statusLabel(item.status)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t.requests.panel}:{' '}
                      <span className="text-foreground/80">
                        {panel ? panelLabel(panel) : appPanelId(item)}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.requests.submittedAt}:{' '}
                      <span dir="ltr">{formatWhen(item.createdAt, locale)}</span>
                      {item.decidedAt ? (
                        <>
                          {' · '}
                          {t.requests.decidedAt}:{' '}
                          <span dir="ltr">
                            {formatWhen(item.decidedAt, locale)}
                          </span>
                        </>
                      ) : null}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => toggleExpand(item.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted px-3 py-2 text-sm font-medium hover:bg-muted/70"
                    >
                      {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {isOpen ? t.requests.hideAnswers : t.requests.showAnswers}
                    </button>
                    {isPending ? (
                      <>
                        <button
                          type="button"
                          disabled={itemBusy}
                          onClick={() => void decide(item, 'accept')}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-success/15 px-3 py-2 text-sm font-semibold text-success disabled:opacity-50"
                        >
                          {busyId === item.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Check size={14} />
                          )}
                          {t.requests.accept}
                        </button>
                        <button
                          type="button"
                          disabled={itemBusy}
                          onClick={() => void decide(item, 'reject')}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-destructive/15 px-3 py-2 text-sm font-semibold text-destructive disabled:opacity-50"
                        >
                          {busyId === item.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <X size={14} />
                          )}
                          {t.requests.reject}
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>

                {isOpen ? (
                  <ul className="mt-3 space-y-1.5 border-t border-border/70 pt-3 text-sm text-foreground/80">
                    {(item.answers || []).length ? (
                      (item.answers || []).map((a, idx) => (
                        <li key={idx}>
                          <span className="text-muted-foreground">{a.qes}: </span>
                          {a.ans}
                        </li>
                      ))
                    ) : (
                      <li className="text-muted-foreground">{t.requests.noAnswers}</li>
                    )}
                  </ul>
                ) : null}
              </article>
            );
          })}

          {!filtered.length ? (
            <EmptyState
              icon={UserRound}
              title={
                tab === 'pending' ? t.requests.emptyPending : t.requests.empty
              }
              body={
                !panels.length
                  ? t.requests.emptyHintPanels
                  : !data?.guildId
                    ? t.requests.emptyHintSettings
                    : undefined
              }
              actionHref={
                !panels.length
                  ? `/dashboard/${botId}/panels`
                  : !data?.guildId
                    ? `/dashboard/${botId}/settings`
                    : undefined
              }
              actionLabel={
                !panels.length
                  ? t.overview.managePanels
                  : !data?.guildId
                    ? t.overview.quickSettings
                    : undefined
              }
            />
          ) : null}
        </div>
      </SectionCard>

      {!panels.length || !data?.guildId ? (
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {!panels.length ? (
            <Link
              href={`/dashboard/${botId}/panels`}
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <Layers size={13} />
              {t.requests.emptyHintPanels}
            </Link>
          ) : null}
          {!data?.guildId ? (
            <Link
              href={`/dashboard/${botId}/settings`}
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <Settings2 size={13} />
              {t.requests.emptyHintSettings}
            </Link>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
