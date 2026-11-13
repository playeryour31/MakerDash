'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Gauge,
  Layers,
  ListOrdered,
  Trophy,
  Users,
} from 'lucide-react';
import {
  BotLoadError,
  BotPageSkeleton,
} from '@/components/apply/BotFormBits';
import UnsavedChangesBar from '@/components/UnsavedChangesBar';
import FeatureEnableCard from '@/components/FeatureEnableCard';
import LevelingDisplaySection from '@/components/system/leveling/LevelingDisplaySection';
import LevelingMembersSection from '@/components/system/leveling/LevelingMembersSection';
import LevelingRewardsSection from '@/components/system/leveling/LevelingRewardsSection';
import LevelingRulesSection from '@/components/system/leveling/LevelingRulesSection';
import LevelingSetupSection from '@/components/system/leveling/LevelingSetupSection';
import {
  EMPTY_LEVELING,
  toDraft,
  toPatch,
  type GuildOptions,
  type LevelingUser,
  type TabKey,
} from '@/components/system/leveling/types';
import { useToast } from '@/hooks/useToast';
import { useUnsavedDraft } from '@/hooks/useUnsavedDraft';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n/I18nProvider';

export default function LevelingClient() {
  const { botId } = useParams<{ botId: string }>();
  const toast = useToast();
  const { t, locale } = useI18n();
  const L = t.leveling;
  const s = t.system;
  const draft = useUnsavedDraft(EMPTY_LEVELING);
  const [tab, setTab] = useState<TabKey>('setup');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [guildOpts, setGuildOpts] = useState<GuildOptions | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [users, setUsers] = useState<LevelingUser[]>([]);
  const [usersQuery, setUsersQuery] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [userActionBusy, setUserActionBusy] = useState<string | null>(null);
  const [userAmount, setUserAmount] = useState('100');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await api<{ settings: Record<string, any> }>(
        `/system/${botId}/features/leveling`,
      );
      draft.hydrate(toDraft(res.settings || {}));
      setHydrated(true);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [botId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    api<GuildOptions>(`/apply/${botId}/guild-options`)
      .then((opts) => {
        if (!cancelled) setGuildOpts(opts);
      })
      .catch(() => {
        if (!cancelled) setGuildOpts({ channels: [], roles: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [botId]);

  const loadUsers = useCallback(
    async (q = usersQuery) => {
      setUsersLoading(true);
      try {
        const res = await api<{ users: LevelingUser[] }>(
          `/system/${botId}/leveling/users?limit=30&q=${encodeURIComponent(q)}`,
        );
        setUsers(res.users || []);
      } catch (err: any) {
        toast.error(err?.message || t.errors.generic);
      } finally {
        setUsersLoading(false);
      }
    },
    [botId, usersQuery, toast, t.errors.generic],
  );

  useEffect(() => {
    if (tab === 'members') void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, botId]);

  const d = draft.draft;
  const textChannels = useMemo(
    () =>
      (guildOpts?.channels || []).filter(
        (c) => c.type === 0 || c.type === 5 || c.type === undefined,
      ),
    [guildOpts],
  );

  const roleName = useCallback(
    (id: string) => guildOpts?.roles?.find((r) => r.id === id)?.name || id,
    [guildOpts],
  );
  const channelName = useCallback(
    (id: string) => textChannels.find((c) => c.id === id)?.name || id,
    [textChannels],
  );

  async function save() {
    setSaving(true);
    try {
      const res = await api<{ settings: Record<string, any> }>(
        `/system/${botId}/features/leveling`,
        {
          method: 'PATCH',
          body: JSON.stringify(toPatch(draft.draft)),
        },
      );
      draft.hydrate(toDraft(res.settings || {}));
      toast.success(s.saved);
    } catch (err: any) {
      toast.error(err?.message || t.errors.generic);
    } finally {
      setSaving(false);
    }
  }

  async function mutateUser(
    userId: string,
    action: 'add_xp' | 'remove_xp' | 'set_xp' | 'set_level' | 'reset',
  ) {
    setUserActionBusy(`${userId}:${action}`);
    try {
      await api(`/system/${botId}/leveling/users/${userId}`, {
        method: 'POST',
        body: JSON.stringify({
          action,
          amount: Number(userAmount) || 0,
        }),
      });
      toast.success(L.userUpdated || s.saved);
      await loadUsers();
    } catch (err: any) {
      toast.error(err?.message || t.errors.generic);
    } finally {
      setUserActionBusy(null);
    }
  }

  if (loading && !hydrated) return <BotPageSkeleton />;
  if (loadError) {
    return (
      <BotLoadError message={t.errors.loadBot} onRetry={() => void load()} />
    );
  }

  const tabs: Array<{ key: TabKey; label: string; icon: typeof Trophy }> = [
    { key: 'setup', label: L.tabSetup || 'Setup', icon: Gauge },
    { key: 'rules', label: L.tabRules || 'Rules', icon: Layers },
    { key: 'rewards', label: L.tabRewards || 'Rewards', icon: Trophy },
    { key: 'display', label: L.tabDisplay || 'Display', icon: ListOrdered },
    { key: 'members', label: L.tabMembers || L.tabUsers || 'Members', icon: Users },
  ];

  return (
    <div className="dashboard-page space-y-5 pb-24">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {t.nav.groupSystem}
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
          {s.leveling}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {L.subtitle || s.levelingBody}
        </p>
      </header>

      <FeatureEnableCard
        icon={Trophy}
        title={s.leveling}
        description={L.subtitle || s.levelingBody}
        enabled={d.enabled}
        enabledLabel={s.enabled}
        disabledLabel={s.disabled}
        switchAriaLabel={d.enabled ? s.enabled : s.disabled}
        onEnabledChange={(next) => draft.setDraft({ ...d, enabled: next })}
      />

      <nav
        className="grid grid-cols-2 gap-2 sm:grid-cols-5"
        aria-label={s.leveling}
      >
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`ui-press flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                active
                  ? 'border-primary/40 bg-primary/15 text-primary shadow-sm shadow-primary/10'
                  : 'border-border bg-card/90 text-muted-foreground hover:border-primary/25 hover:bg-muted/40'
              }`}
            >
              <Icon size={15} className="shrink-0 opacity-80" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div
        key={tab}
        className="space-y-4 transition-opacity duration-300 ease-out"
      >
        {tab === 'setup' ? (
          <LevelingSetupSection
            d={d}
            setDraft={draft.setDraft}
            L={L}
            s={s}
            textChannels={textChannels}
            channelName={channelName}
            onNavigate={setTab}
          />
        ) : null}

        {tab === 'rules' ? (
          <LevelingRulesSection
            d={d}
            setDraft={draft.setDraft}
            L={L}
            s={s}
            textChannels={textChannels}
            guildRoles={guildOpts?.roles || []}
            roleName={roleName}
            channelName={channelName}
            toastError={(msg) => toast.error(msg)}
            discardLabel={t.common.discard}
          />
        ) : null}

        {tab === 'rewards' ? (
          <LevelingRewardsSection
            d={d}
            setDraft={draft.setDraft}
            L={L}
            s={s}
            guildRoles={guildOpts?.roles || []}
            roleName={roleName}
            toastError={(msg) => toast.error(msg)}
            discardLabel={t.common.discard}
          />
        ) : null}

        {tab === 'display' ? (
          <LevelingDisplaySection
            d={d}
            setDraft={draft.setDraft}
            L={L}
            s={s}
            guildRoles={guildOpts?.roles || []}
            locale={locale}
          />
        ) : null}

        {tab === 'members' ? (
          <LevelingMembersSection
            L={L}
            users={users}
            usersQuery={usersQuery}
            setUsersQuery={setUsersQuery}
            userAmount={userAmount}
            setUserAmount={setUserAmount}
            usersLoading={usersLoading}
            userActionBusy={userActionBusy}
            loadUsers={() => void loadUsers()}
            mutateUser={(id, action) => void mutateUser(id, action)}
          />
        ) : null}
      </div>

      <UnsavedChangesBar
        open={draft.isDirty}
        saving={saving}
        onSave={() => void save()}
        onDiscard={() => draft.discard()}
      />
    </div>
  );
}
