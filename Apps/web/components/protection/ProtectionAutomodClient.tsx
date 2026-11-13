'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import {
  BotLoadError,
  BotPageSkeleton,
  SectionCard,
  SelectField,
} from '@/components/apply/BotFormBits';
import FeatureEnableCard from '@/components/FeatureEnableCard';
import UnsavedChangesBar from '@/components/UnsavedChangesBar';
import { useToast } from '@/hooks/useToast';
import { useUnsavedDraft } from '@/hooks/useUnsavedDraft';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n/I18nProvider';
import {
  ProtectionTip,
  ProtectionWhy,
} from '@/components/protection/ProtectionHelp';
import ProtectionToggleRow from '@/components/protection/ProtectionToggleRow';

type AutomodDraft = {
  enabled: boolean;
  alertChannelId: string;
  blockInvites: boolean;
  blockLinks: boolean;
  mentionSpamLimit: number;
  keywordPresets: string[];
  customKeywordsText: string;
  timeoutSeconds: number;
  lastSyncError: string;
  lastSyncedAt: string | null;
};

type GuildOptions = {
  channels: Array<{ id: string; name: string; type: number }>;
  roles: Array<{ id: string; name: string }>;
};

const PRESETS = [
  { id: 'profanity', labelKey: 'automodPresetProfanity' },
  { id: 'sexual_content', labelKey: 'automodPresetSexual' },
  { id: 'slurs', labelKey: 'automodPresetSlurs' },
] as const;

const EMPTY: AutomodDraft = {
  enabled: false,
  alertChannelId: '',
  blockInvites: true,
  blockLinks: false,
  mentionSpamLimit: 0,
  keywordPresets: [],
  customKeywordsText: '',
  timeoutSeconds: 0,
  lastSyncError: '',
  lastSyncedAt: null,
};

function settingsToDraft(settings: Record<string, any>): AutomodDraft {
  return {
    enabled: Boolean(settings.enabled),
    alertChannelId: String(settings.alertChannelId || ''),
    blockInvites: settings.blockInvites !== false,
    blockLinks: Boolean(settings.blockLinks),
    mentionSpamLimit: Number(settings.mentionSpamLimit ?? 0),
    keywordPresets: Array.isArray(settings.keywordPresets)
      ? settings.keywordPresets.map(String)
      : [],
    customKeywordsText: Array.isArray(settings.customKeywords)
      ? settings.customKeywords.join('\n')
      : '',
    timeoutSeconds: Number(settings.timeoutSeconds ?? 0),
    lastSyncError: String(settings.lastSyncError || ''),
    lastSyncedAt: settings.lastSyncedAt ? String(settings.lastSyncedAt) : null,
  };
}

function draftToPatch(d: AutomodDraft): Record<string, unknown> {
  return {
    enabled: d.enabled,
    alertChannelId: d.alertChannelId,
    blockInvites: d.blockInvites,
    blockLinks: d.blockLinks,
    mentionSpamLimit: d.mentionSpamLimit,
    keywordPresets: d.keywordPresets,
    customKeywords: d.customKeywordsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean),
    timeoutSeconds: d.timeoutSeconds,
  };
}

export default function ProtectionAutomodClient({
  embedded = false,
}: {
  embedded?: boolean;
} = {}) {
  const { botId } = useParams<{ botId: string }>();
  const toast = useToast();
  const { t } = useI18n();
  const p = t.protection as Record<string, any>;
  const draft = useUnsavedDraft<AutomodDraft>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [guild, setGuild] = useState<GuildOptions | null>(null);
  const d = draft.draft;

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await api<{ settings: Record<string, any> }>(
        `/protection/${botId}/features/automod`,
      );
      draft.hydrate(settingsToDraft(res.settings || {}));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    api<GuildOptions>(`/apply/${botId}/guild-options`)
      .then((opts) => {
        if (!cancelled) setGuild(opts);
      })
      .catch(() => {
        if (!cancelled) setGuild({ channels: [], roles: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [botId]);

  async function save() {
    setSaving(true);
    try {
      const res = await api<{ settings: Record<string, any> }>(
        `/protection/${botId}/features/automod`,
        {
          method: 'PATCH',
          body: JSON.stringify(draftToPatch(d)),
        },
      );
      draft.hydrate(settingsToDraft(res.settings || {}));
      toast.success(p.saved);
    } catch {
      toast.error(t.errors.generic);
    } finally {
      setSaving(false);
    }
  }

  function togglePreset(id: string) {
    draft.setDraft((prev) => {
      const has = prev.keywordPresets.includes(id);
      return {
        ...prev,
        keywordPresets: has
          ? prev.keywordPresets.filter((x) => x !== id)
          : [...prev.keywordPresets, id],
      };
    });
  }

  if (loading) return <BotPageSkeleton />;
  if (loadError) {
    return (
      <BotLoadError
        message={t.errors.loadBot}
        onRetry={() => void load()}
      />
    );
  }

  const textChannels =
    guild?.channels?.filter((c) => c.type === 0 || c.type === 5) || [];

  return (
    <main
      className={
        embedded ? 'space-y-5 pb-8' : 'dashboard-page space-y-6 pb-24'
      }
    >
      {!embedded ? (
        <header>
          <p className="settings-page-eyebrow">{p.badge}</p>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {p.automod}
          </h1>
          <p className="mt-1 max-w-[52ch] text-sm text-muted-foreground">
            {p.automodBody}
          </p>
        </header>
      ) : null}

      <ProtectionWhy title={p.whyTitle} body={p.automodWhy} icon={Sparkles} />
      <ProtectionTip title={p.tipTitle} body={p.automodTip} />

      <FeatureEnableCard
        icon={Sparkles}
        title={p.toggleTitle}
        description={p.automodEnableHint}
        enabled={d.enabled}
        enabledLabel={p.enabled}
        disabledLabel={p.disabled}
        onEnabledChange={(enabled) => draft.setDraft((prev) => ({ ...prev, enabled }))}
      />

      {(d.lastSyncError || d.lastSyncedAt) && (
        <SectionCard title={p.automodSyncStatus} icon={Sparkles}>
          {d.lastSyncError ? (
            <p className="text-sm text-amber-400">{d.lastSyncError}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {p.automodLastSynced}:{' '}
              {d.lastSyncedAt
                ? new Date(d.lastSyncedAt).toLocaleString()
                : '—'}
            </p>
          )}
        </SectionCard>
      )}

      <SectionCard title={p.automodFilters} icon={Sparkles}>
        <div className="space-y-1 divide-y divide-border/60">
          <ProtectionToggleRow
            label={p.blockInvites}
            checked={d.blockInvites}
            onCheckedChange={(blockInvites) =>
              draft.setDraft((prev) => ({ ...prev, blockInvites }))
            }
          />
          <ProtectionToggleRow
            label={p.blockLinks}
            checked={d.blockLinks}
            onCheckedChange={(blockLinks) =>
              draft.setDraft((prev) => ({ ...prev, blockLinks }))
            }
          />
          <label className="block pt-3 text-sm">
            <span className="text-muted-foreground">{p.automodMentionLimit}</span>
            <input
              type="number"
              min={0}
              max={50}
              value={d.mentionSpamLimit}
              onChange={(e) =>
                draft.setDraft((prev) => ({
                  ...prev,
                  mentionSpamLimit: Number(e.target.value),
                }))
              }
              className="mt-1.5 w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              {p.automodMentionHint}
            </span>
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">{p.timeoutSeconds}</span>
            <input
              type="number"
              min={0}
              max={2419200}
              value={d.timeoutSeconds}
              onChange={(e) =>
                draft.setDraft((prev) => ({
                  ...prev,
                  timeoutSeconds: Number(e.target.value),
                }))
              }
              className="mt-1.5 w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              {p.automodTimeoutHint}
            </span>
          </label>
        </div>
      </SectionCard>

      <SectionCard title={p.automodPresets} icon={Sparkles}>
        <div className="divide-y divide-border/60">
          {PRESETS.map((pr) => (
            <ProtectionToggleRow
              key={pr.id}
              label={p[pr.labelKey]}
              checked={d.keywordPresets.includes(pr.id)}
              onCheckedChange={() => togglePreset(pr.id)}
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard title={p.automodCustomKeywords} icon={Sparkles}>
        <textarea
          rows={5}
          value={d.customKeywordsText}
          onChange={(e) =>
            draft.setDraft((prev) => ({
              ...prev,
              customKeywordsText: e.target.value,
            }))
          }
          placeholder={p.automodKeywordsPlaceholder}
          className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
        />
      </SectionCard>

      <SectionCard title={p.automodAlertChannel} icon={Sparkles}>
        <SelectField
          label={p.automodAlertChannel}
          value={d.alertChannelId}
          onChange={(alertChannelId) =>
            draft.setDraft((prev) => ({ ...prev, alertChannelId }))
          }
          options={[
            { value: '', label: p.selectChannel },
            ...textChannels.map((c) => ({
              value: c.id,
              label: `#${c.name}`,
            })),
          ]}
        />
      </SectionCard>

      <UnsavedChangesBar
        open={draft.isDirty}
        saving={saving}
        onSave={() => void save()}
        onDiscard={draft.discard}
      />
    </main>
  );
}
