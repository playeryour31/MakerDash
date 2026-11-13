'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Settings2, Shield } from 'lucide-react';
import dynamic from 'next/dynamic';
import {
  BotLoadError,
  BotPageSkeleton,
  Field,
  SectionCard,
  SelectField,
} from '@/components/apply/BotFormBits';
import {
  BotRuntimeBar,
  syncHomeBotRunning,
  type RuntimeBusy,
} from '@/components/dashboard/BotRuntimeBar';
import UnsavedChangesBar from '@/components/UnsavedChangesBar';
import { useBotOverview } from '@/hooks/useBotOverview';
import { useToast } from '@/hooks/useToast';
import { useUnsavedDraft } from '@/hooks/useUnsavedDraft';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { EMPTY_SETTINGS, type SettingsDraft } from '@/lib/botTypes';

const BotDiscordProfileEditor = dynamic(
  () => import('@/components/BotDiscordProfileEditor'),
  {
    loading: () => (
      <div className="h-52 animate-pulse rounded-2xl border border-border bg-card" />
    ),
    ssr: false,
  },
);

type GuildOptions = {
  channels: Array<{ id: string; name: string; type: number }>;
  roles: Array<{ id: string; name: string }>;
};

export default function SettingsClient() {
  const { botId } = useParams<{ botId: string }>();
  const toast = useToast();
  const { t } = useI18n();
  const { data, loading, loadError, load, reload, retry } =
    useBotOverview(botId);
  const settings = useUnsavedDraft<SettingsDraft>(EMPTY_SETTINGS);
  const hydrateSettings = settings.hydrate;
  const hydratedRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [runtimeBusy, setRuntimeBusy] = useState<RuntimeBusy>(null);
  const [guildOpts, setGuildOpts] = useState<GuildOptions | null>(null);
  const [optsLoading, setOptsLoading] = useState(false);

  useEffect(() => {
    if (!data || hydratedRef.current) return;
    hydratedRef.current = true;
    hydrateSettings({
      guildId: data.guildId || '',
      adminRoleId: data.settings?.adminRoleId || '',
      logsChannelId:
        data.settings?.logsChannelId ||
        data.settings?.resultsChannelId ||
        '',
      language: data.settings?.language === 'En' ? 'En' : 'Ar',
      dmAccept: data.settings?.dmMode?.accept || 'off',
      dmReject: data.settings?.dmMode?.reject || 'off',
    });
  }, [data, hydrateSettings]);

  useEffect(() => {
    const guildId = settings.draft.guildId.trim();
    if (!botId || !guildId) {
      setGuildOpts(null);
      return;
    }
    let cancelled = false;
    setOptsLoading(true);
    api<GuildOptions>(
      `/apply/${botId}/guild-options?guildId=${encodeURIComponent(guildId)}`,
    )
      .then((opts) => {
        if (!cancelled) setGuildOpts(opts);
      })
      .catch(() => {
        if (!cancelled) setGuildOpts(null);
      })
      .finally(() => {
        if (!cancelled) setOptsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [botId, settings.draft.guildId]);

  async function saveSettings() {
    setSaving(true);
    try {
      const draft = settings.draft;
      await api(`/apply/${botId}/settings`, {
        method: 'PATCH',
        body: JSON.stringify({
          guildId: draft.guildId,
          adminRoleId: draft.adminRoleId,
          logsChannelId: draft.logsChannelId,
          language: draft.language,
          dmMode: { accept: draft.dmAccept, reject: draft.dmReject },
        }),
      });
      settings.commit(draft);
      toast.success(t.settings.saved);
      await load();
    } catch {
      toast.error(t.settings.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function setRuntime(running: boolean) {
    if (!data || runtimeBusy) return;
    setRuntimeBusy(running ? 'start' : 'stop');
    try {
      const res = await api<{ running: boolean }>(`/apply/${botId}/runtime`, {
        method: 'POST',
        body: JSON.stringify({ running }),
      });
      await syncHomeBotRunning(botId, Boolean(res.running));
      toast.success(running ? t.settings.runtimeOn : t.settings.runtimeOff);
      await reload();
    } catch {
      toast.error(t.settings.runtimeFailed);
    } finally {
      setRuntimeBusy(null);
    }
  }

  async function restartRuntime() {
    if (!data?.running || runtimeBusy) return;
    setRuntimeBusy('restart');
    try {
      const res = await api<{ running: boolean }>(`/apply/${botId}/runtime`, {
        method: 'POST',
        body: JSON.stringify({ restart: true }),
      });
      await syncHomeBotRunning(botId, Boolean(res.running ?? true));
      toast.success(t.settings.runtimeRestart);
      await reload();
    } catch {
      toast.error(t.settings.runtimeFailed);
    } finally {
      setRuntimeBusy(null);
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

  const d = settings.draft;
  const textChannels = (guildOpts?.channels || []).filter(
    (c) => c.type === 0 || c.type === 5,
  );
  const isOnline = Boolean(data?.running);

  return (
    <main
      className={`dashboard-page settings-page ${settings.isDirty ? 'pb-28' : ''}`}
    >
      <header className="settings-page-header">
        <div>
          <p className="settings-page-eyebrow">{t.nav.botManage}</p>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {t.settings.title}
          </h1>
          <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
            {botId}
          </p>
        </div>

        <BotRuntimeBar
          running={isOnline}
          busy={runtimeBusy}
          onStart={() => void setRuntime(true)}
          onStop={() => void setRuntime(false)}
          onRestart={() => void restartRuntime()}
        />
      </header>

      <BotDiscordProfileEditor botId={botId} />

      <SectionCard icon={Settings2} title={t.settings.sectionServer}>
        <div className="settings-server-grid">
          <Field
            label={t.settings.guildId}
            value={d.guildId}
            onChange={(v) => settings.patch({ guildId: v })}
          />

          <label className="block text-sm">
            <span className="text-muted-foreground">{t.settings.adminRole}</span>
            {optsLoading ? (
              <p className="mt-1.5 text-xs text-muted-foreground">
                {t.settings.loadingRoles}
              </p>
            ) : null}
            {(guildOpts?.roles || []).length ? (
              <select
                className="mt-1.5 w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
                value={d.adminRoleId}
                onChange={(e) =>
                  settings.patch({ adminRoleId: e.target.value })
                }
              >
                <option value="">{t.settings.pickRole}</option>
                {(guildOpts?.roles || []).map((r) => (
                  <option key={r.id} value={r.id}>
                    @{r.name}
                  </option>
                ))}
                {d.adminRoleId &&
                !(guildOpts?.roles || []).some(
                  (r) => r.id === d.adminRoleId,
                ) ? (
                  <option value={d.adminRoleId}>{d.adminRoleId}</option>
                ) : null}
              </select>
            ) : (
              <input
                className="mt-1.5 w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
                value={d.adminRoleId}
                onChange={(e) =>
                  settings.patch({ adminRoleId: e.target.value })
                }
              />
            )}
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="text-muted-foreground">
              {t.settings.logsChannel}
              <span className="ms-1 text-[11px] font-normal opacity-70">
                ({t.settings.optional})
              </span>
            </span>
            {optsLoading ? (
              <p className="mt-1.5 text-xs text-muted-foreground">
                {t.settings.loadingChannels}
              </p>
            ) : null}
            {textChannels.length ? (
              <select
                className="mt-1.5 w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
                value={d.logsChannelId}
                onChange={(e) =>
                  settings.patch({ logsChannelId: e.target.value })
                }
              >
                <option value="">{t.settings.noneChannel}</option>
                {textChannels.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="mt-1.5 w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
                value={d.logsChannelId}
                placeholder={t.settings.logsPlaceholder}
                onChange={(e) =>
                  settings.patch({ logsChannelId: e.target.value })
                }
              />
            )}
            <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">
              {t.settings.logsHint}
            </span>
          </label>
        </div>
      </SectionCard>

      <SectionCard icon={Shield} title={t.settings.sectionAccess}>
        <div className="settings-server-grid">
          <SelectField
            label={t.settings.botLanguage}
            value={d.language}
            onChange={(v) =>
              settings.patch({ language: v === 'En' ? 'En' : 'Ar' })
            }
            options={[
              { value: 'Ar', label: t.settings.langAr },
              { value: 'En', label: t.settings.langEn },
            ]}
            hint={t.settings.languageHint}
          />

          <SelectField
            label={t.settings.dmAccept}
            value={d.dmAccept}
            onChange={(v) => settings.patch({ dmAccept: v })}
          />
          <SelectField
            label={t.settings.dmReject}
            value={d.dmReject}
            onChange={(v) => settings.patch({ dmReject: v })}
          />

          {settings.isDirty ? (
            <p className="sm:col-span-2 text-xs text-amber-400/90">
              {t.settings.dirtyHint}
            </p>
          ) : (
            <p className="sm:col-span-2 text-xs text-muted-foreground">
              {t.settings.cleanHint}
            </p>
          )}
        </div>
      </SectionCard>

      <UnsavedChangesBar
        open={settings.isDirty}
        saving={saving}
        onSave={saveSettings}
        onDiscard={settings.discard}
      />
    </main>
  );
}
