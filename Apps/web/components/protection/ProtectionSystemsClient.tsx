'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Bomb,
  Bot,
  ChevronDown,
  DoorOpen,
  KeyRound,
  Link2,
  Lock,
  MessageSquareWarning,
  RefreshCw,
  ServerCog,
  ShieldAlert,
  Sparkles,
  UserCheck,
  UserMinus,
  type LucideIcon,
} from 'lucide-react';
import {
  BotLoadError,
  BotPageSkeleton,
} from '@/components/apply/BotFormBits';
import UiSwitch from '@/components/UiSwitch';
import { useToast } from '@/hooks/useToast';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n/I18nProvider';

const ProtectionFeatureClient = dynamic(
  () => import('@/components/protection/ProtectionFeatureClient'),
  { loading: () => <BotPageSkeleton />, ssr: false },
);
const ProtectionAutomodClient = dynamic(
  () => import('@/components/protection/ProtectionAutomodClient'),
  { loading: () => <BotPageSkeleton />, ssr: false },
);
const ProtectionHardeningClient = dynamic(
  () => import('@/components/protection/ProtectionHardeningClient'),
  { loading: () => <BotPageSkeleton />, ssr: false },
);

type FeatureId =
  | 'anti-spam'
  | 'anti-links'
  | 'automod'
  | 'anti-nuke'
  | 'anti-raid'
  | 'anti-bots'
  | 'anti-perms'
  | 'anti-server'
  | 'anti-prune'
  | 'recovery'
  | 'whitelist'
  | 'join-gate'
  | 'lockdown';

type TabId = 'content' | 'defense' | 'access' | 'emergency';

type FeatureFlag = { id: string; enabled: boolean };

const TABS: { id: TabId; labelKey: string; features: FeatureId[] }[] = [
  {
    id: 'content',
    labelKey: 'tabContent',
    features: ['anti-spam', 'anti-links', 'automod'],
  },
  {
    id: 'defense',
    labelKey: 'tabDefense',
    features: [
      'anti-nuke',
      'anti-raid',
      'anti-bots',
      'anti-perms',
      'anti-server',
      'anti-prune',
      'recovery',
    ],
  },
  {
    id: 'access',
    labelKey: 'tabAccess',
    features: ['whitelist', 'join-gate'],
  },
  {
    id: 'emergency',
    labelKey: 'tabEmergency',
    features: ['lockdown'],
  },
];

const META: Record<
  FeatureId,
  { icon: LucideIcon; titleKey: string; bodyKey: string }
> = {
  'anti-spam': {
    icon: MessageSquareWarning,
    titleKey: 'antiSpam',
    bodyKey: 'antiSpamBody',
  },
  'anti-links': {
    icon: Link2,
    titleKey: 'antiLinks',
    bodyKey: 'antiLinksBody',
  },
  automod: { icon: Sparkles, titleKey: 'automod', bodyKey: 'automodBody' },
  'anti-nuke': { icon: Bomb, titleKey: 'antiNuke', bodyKey: 'antiNukeBody' },
  'anti-raid': {
    icon: ShieldAlert,
    titleKey: 'antiRaid',
    bodyKey: 'antiRaidBody',
  },
  'anti-bots': { icon: Bot, titleKey: 'antiBots', bodyKey: 'antiBotsBody' },
  'anti-perms': {
    icon: KeyRound,
    titleKey: 'antiPerms',
    bodyKey: 'antiPermsBody',
  },
  'anti-server': {
    icon: ServerCog,
    titleKey: 'antiServer',
    bodyKey: 'antiServerBody',
  },
  'anti-prune': {
    icon: UserMinus,
    titleKey: 'antiPrune',
    bodyKey: 'antiPruneBody',
  },
  recovery: {
    icon: RefreshCw,
    titleKey: 'recovery',
    bodyKey: 'recoveryBody',
  },
  whitelist: {
    icon: UserCheck,
    titleKey: 'whitelist',
    bodyKey: 'whitelistBody',
  },
  'join-gate': {
    icon: DoorOpen,
    titleKey: 'joinGate',
    bodyKey: 'joinGateBody',
  },
  lockdown: { icon: Lock, titleKey: 'lockdown', bodyKey: 'lockdownBody' },
};

const HARDEN: FeatureId[] = [
  'anti-perms',
  'recovery',
  'anti-prune',
  'anti-server',
];
const CLASSIC: FeatureId[] = [
  'anti-nuke',
  'anti-bots',
  'whitelist',
  'anti-raid',
  'anti-spam',
  'anti-links',
  'join-gate',
  'lockdown',
];

function tabForFeature(id: FeatureId): TabId {
  for (const tab of TABS) {
    if (tab.features.includes(id)) return tab.id;
  }
  return 'content';
}

function isFeatureId(v: string | null): v is FeatureId {
  return !!v && v in META;
}

export default function ProtectionSystemsClient() {
  const { botId } = useParams<{ botId: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { t } = useI18n();
  const p = t.protection as Record<string, any>;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);

  const featureParam = searchParams.get('f');
  const activeFeature = isFeatureId(featureParam) ? featureParam : null;
  const activeTab = useMemo<TabId>(() => {
    if (activeFeature) return tabForFeature(activeFeature);
    const tabQ = searchParams.get('tab');
    if (tabQ === 'content' || tabQ === 'defense' || tabQ === 'access' || tabQ === 'emergency') {
      return tabQ;
    }
    return 'content';
  }, [activeFeature, searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await api<{ features?: FeatureFlag[] }>(
        `/protection/${botId}`,
      );
      setFlags(res.features || []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [botId]);

  useEffect(() => {
    void load();
  }, [load]);

  function setQuery(next: { tab?: TabId; f?: FeatureId | null }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.tab) params.set('tab', next.tab);
    if (next.f === null) params.delete('f');
    else if (next.f) {
      params.set('f', next.f);
      params.set('tab', tabForFeature(next.f));
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  async function quickToggle(id: FeatureId, enabled: boolean) {
    if (id === 'whitelist') {
      setQuery({ f: id });
      return;
    }
    setToggling(id);
    try {
      const body: Record<string, unknown> =
        id === 'lockdown'
          ? { enabled, active: enabled }
          : id === 'anti-bots'
            ? { enabled, mode: enabled ? 'on' : 'off' }
            : { enabled };
      await api(`/protection/${botId}/features/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setFlags((prev) => {
        const rest = prev.filter((x) => x.id !== id);
        return [...rest, { id, enabled }];
      });
      toast.success(p.saved);
    } catch {
      toast.error(t.errors.generic);
    } finally {
      setToggling(null);
    }
  }

  if (loading) return <BotPageSkeleton />;
  if (loadError) {
    return (
      <BotLoadError message={t.errors.loadBot} onRetry={() => void load()} />
    );
  }

  const tabFeatures = TABS.find((x) => x.id === activeTab)?.features || [];

  return (
    <main className="dashboard-page space-y-6 pb-24">
      <header>
        <p className="settings-page-eyebrow">{p.badge}</p>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {p.systemsTitle}
        </h1>
        <p className="mt-1 max-w-[56ch] text-sm text-muted-foreground">
          {p.systemsSubtitle}
        </p>
      </header>

      <div
        className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
      >
        {TABS.map((tab) => {
          const on = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setQuery({ tab: tab.id, f: null })}
              className={`ui-press shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                on
                  ? 'border border-primary/45 bg-primary/25 text-primary-foreground'
                  : 'border border-border bg-card/80 text-muted-foreground hover:border-primary/30 hover:text-foreground'
              }`}
            >
              {p[tab.labelKey]}
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {tabFeatures.map((id) => {
          const meta = META[id];
          const Icon = meta.icon;
          const enabled = Boolean(flags.find((f) => f.id === id)?.enabled);
          const open = activeFeature === id;
          return (
            <div
              key={id}
              className={`overflow-hidden rounded-2xl border transition ${
                open
                  ? 'border-primary/40 bg-card'
                  : 'border-border bg-card/90'
              }`}
            >
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() =>
                    setQuery({ f: open ? null : id, tab: activeTab })
                  }
                  className="flex min-w-0 flex-1 items-start gap-3 text-start"
                >
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {p[meta.titleKey]}
                      </span>
                      <ChevronDown
                        size={16}
                        className={`text-muted-foreground transition ${
                          open ? 'rotate-180' : ''
                        }`}
                      />
                    </span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {p[meta.bodyKey]}
                    </span>
                  </span>
                </button>
                <div className="flex shrink-0 items-center gap-3 self-end sm:self-center">
                  {id !== 'whitelist' ? (
                    <UiSwitch
                      checked={enabled}
                      disabled={toggling === id}
                      onCheckedChange={(next) => void quickToggle(id, next)}
                      showLabel={false}
                      aria-label={p[meta.titleKey]}
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={() =>
                      setQuery({ f: open ? null : id, tab: activeTab })
                    }
                    className="ui-press rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-semibold transition hover:border-primary/40"
                  >
                    {open ? p.closeEditor : p.editSystem}
                  </button>
                </div>
              </div>

              {open ? (
                <div className="border-t border-border/80 px-2 pb-4 pt-2 sm:px-4">
                  {id === 'automod' ? (
                    <ProtectionAutomodClient embedded />
                  ) : HARDEN.includes(id) ? (
                    <ProtectionHardeningClient
                      feature={id as 'anti-perms' | 'recovery' | 'anti-prune' | 'anti-server'}
                      embedded
                    />
                  ) : CLASSIC.includes(id) ? (
                    <ProtectionFeatureClient
                      feature={id as any}
                      embedded
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </main>
  );
}
