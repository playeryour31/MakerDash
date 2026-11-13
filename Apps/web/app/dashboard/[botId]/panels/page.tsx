'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { Layers, Pencil, Trash2 } from 'lucide-react';
import type { PanelFormState } from '@/components/apply/ApplyPanelEditor';
import {
  BotLoadError,
  BotPageSkeleton,
  SectionCard,
} from '@/components/apply/BotFormBits';
import ApplyOnlyGuard from '@/components/muslim/ApplyOnlyGuard';
import EmptyState from '@/components/EmptyState';
import UiSwitch from '@/components/UiSwitch';
import { useBotOverview } from '@/hooks/useBotOverview';
import { useToast } from '@/hooks/useToast';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { panelToForm, questionsToApi } from '@/lib/panelForm';

const ApplyPanelEditor = dynamic(
  () => import('@/components/apply/ApplyPanelEditor'),
  {
    loading: () => (
      <div className="h-40 animate-pulse rounded-xl border border-border bg-muted/40" />
    ),
    ssr: false,
  },
);

function BotPanelsPageInner() {
  const { botId } = useParams<{ botId: string }>();
  const toast = useToast();
  const { t } = useI18n();
  const { data, loading, loadError, load, retry } = useBotOverview(botId);
  const [panelBusy, setPanelBusy] = useState(false);
  const [createKey, setCreateKey] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const guildId = data?.guildId || '';

  async function createPanel(form: PanelFormState) {
    setPanelBusy(true);
    try {
      await api(`/apply/${botId}/panels`, {
        method: 'POST',
        body: JSON.stringify({
          guild: guildId,
          applicationChannel: form.applicationChannel,
          requestsChannel: form.requestsChannel,
          applicationRole: form.applicationRole,
          applicationMessage: form.embed.description,
          applicationMessageType: form.messageType,
          buttonLabel: form.buttonLabel,
          buttonEmoji: form.buttonEmoji || '',
          buttonColor: form.buttonColor || 'Primary',
          embed: form.embed,
          questions: questionsToApi(form),
        }),
      });
      toast.success(t.panels.created);
      setCreateKey((k) => k + 1);
      await load();
    } catch {
      toast.error(t.panels.createFailed);
    } finally {
      setPanelBusy(false);
    }
  }

  async function updatePanel(messageId: string, form: PanelFormState) {
    setPanelBusy(true);
    try {
      await api(`/apply/${botId}/panels`, {
        method: 'PATCH',
        body: JSON.stringify({
          guild: guildId,
          appID: messageId,
          appMessage: form.embed.description,
          appStatus: 'on',
          applicationMessageType: form.messageType,
          buttonLabel: form.buttonLabel,
          buttonEmoji: form.buttonEmoji || '',
          buttonColor: form.buttonColor || 'Primary',
          requestsChannel: form.requestsChannel,
          applicationRole: form.applicationRole,
          embed: form.embed,
          questions: questionsToApi(form),
        }),
      });
      toast.success(t.panels.updated);
      setEditingId(null);
      await load();
    } catch {
      toast.error(t.panels.updateFailed);
    } finally {
      setPanelBusy(false);
    }
  }

  async function togglePanel(messageId: string, status: string) {
    try {
      await api(`/apply/${botId}/panels/${messageId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: status === 'on' ? 'off' : 'on' }),
      });
      toast.success(t.panels.statusUpdated);
      await load();
    } catch {
      toast.error(t.panels.statusFailed);
    }
  }

  async function deletePanel(messageId: string) {
    const ok = window.confirm(t.panels.deleteConfirm);
    if (!ok) return;

    setDeletingId(messageId);
    try {
      await api(`/apply/${botId}/panels/${messageId}`, { method: 'DELETE' });
      if (editingId === messageId) setEditingId(null);
      toast.success(t.panels.deleted);
      await load();
    } catch {
      toast.error(t.panels.deleteFailed);
    } finally {
      setDeletingId(null);
    }
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

  return (
    <main className="dashboard-page">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {t.panels.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.panels.subtitle}</p>
      </header>

      <SectionCard icon={Layers} title={t.panels.createTitle}>
        <ApplyPanelEditor
          key={createKey}
          mode="create"
          botId={String(botId)}
          guildId={guildId}
          submitting={panelBusy && !editingId}
          onSubmit={createPanel}
        />
      </SectionCard>

      <SectionCard icon={Layers} title={t.panels.listTitle}>
        <div className="space-y-4">
          {(data?.panels || []).map((panel) => (
            <div
              key={panel.messageId}
              className="ui-interactive rounded-xl border border-border/70 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    Message: {panel.messageId}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Channel: {panel.channel}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.panels.applicants}: {panel.appliedCount} · {t.panels.type}:{' '}
                    {panel.messageType || 'embed'}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-foreground/80">
                    {panel.embed?.title ? `${panel.embed.title} — ` : ''}
                    {panel.message || '—'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingId(
                        editingId === panel.messageId ? null : panel.messageId,
                      )
                    }
                    className="ui-press inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted px-3 py-2 text-sm font-medium hover:bg-muted/70"
                  >
                    <Pencil size={14} />
                    {editingId === panel.messageId
                      ? t.panels.close
                      : t.panels.edit}
                  </button>
                  <UiSwitch
                    checked={(panel.status || 'on') === 'on'}
                    onCheckedChange={() =>
                      togglePanel(panel.messageId, panel.status)
                    }
                    label={
                      (panel.status || 'on') === 'on'
                        ? t.panels.statusOn
                        : t.panels.statusOff
                    }
                    aria-label={
                      (panel.status || 'on') === 'on'
                        ? t.panels.statusOn
                        : t.panels.statusOff
                    }
                  />
                  <button
                    type="button"
                    disabled={deletingId === panel.messageId}
                    onClick={() => deletePanel(panel.messageId)}
                    className="ui-press inline-flex items-center gap-1.5 rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/15 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    {deletingId === panel.messageId
                      ? t.panels.deleting
                      : t.panels.delete}
                  </button>
                </div>
              </div>
              {editingId === panel.messageId ? (
                <div className="mt-4 border-t border-border pt-4">
                  <ApplyPanelEditor
                    key={`edit-${panel.messageId}`}
                    mode="edit"
                    botId={String(botId)}
                    initial={panelToForm(panel)}
                    guildId={guildId}
                    submitting={panelBusy}
                    onCancel={() => setEditingId(null)}
                    onSubmit={(form) => updatePanel(panel.messageId, form)}
                  />
                </div>
              ) : null}
            </div>
          ))}
          {!data?.panels?.length ? (
            <EmptyState
              icon={Layers}
              title={t.panels.empty}
              body={t.panels.emptyCta}
            />
          ) : null}
        </div>
      </SectionCard>
    </main>
  );
}

export default function BotPanelsPage() {
  return (
    <ApplyOnlyGuard>
      <BotPanelsPageInner />
    </ApplyOnlyGuard>
  );
}
