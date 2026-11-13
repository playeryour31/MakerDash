'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bomb,
  Bot,
  ClipboardList,
  Command,
  DoorOpen,
  HandMetal,
  Hash,
  Headphones,
  KeyRound,
  LayoutDashboard,
  Layers,
  Link2,
  ListChecks,
  Lock,
  LogOut,
  MessageSquareText,
  MessageSquareWarning,
  Mic,
  RefreshCw,
  ScrollText,
  ServerCog,
  Settings2,
  Shield,
  ShieldAlert,
  SmilePlus,
  Sparkles,
  Trophy,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';
import BrandMark from './BrandMark';
import LanguageSwitcher from './LanguageSwitcher';
import { clearToken } from '@/lib/api';
import { useMe, type MeUser } from '@/hooks/useAuthData';
import { useBotProduct } from '@/hooks/useBotProduct';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { quranT } from '@/lib/i18n/dictionaries';

export type Me = MeUser;

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

export function useBotAccessRole(botId: string | undefined) {
  const { me } = useMe();
  return useMemo(() => {
    if (!botId || !me) return { me, isOwner: false, isAdminOnly: false, ready: !!me };
    const owned = (me.botIds || []).map(String).includes(String(botId));
    const admin = (me.adminBotIds || []).map(String).includes(String(botId));
    return {
      me,
      isOwner: owned,
      isAdminOnly: !owned && admin,
      ready: true,
    };
  }, [botId, me]);
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`dash-nav-link ${active ? 'dash-nav-link-active' : ''}`}
      aria-current={active ? 'page' : undefined}
    >
      <span className={`dash-nav-icon ${active ? 'dash-nav-icon-active' : ''}`}>
        <Icon size={15} strokeWidth={1.85} />
      </span>
      <span className="dash-nav-link-label">{label}</span>
      {active ? <span className="dash-nav-dot" aria-hidden /> : null}
    </Link>
  );
}

export default function BotSidebar({
  running,
}: {
  running?: boolean | null;
}) {
  const { botId } = useParams<{ botId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const { t, locale } = useI18n();
  const q = quranT(locale, t);
  const { me, isAdminOnly, ready } = useBotAccessRole(botId);
  const { isMuslim, isSystem, isProtection, isLogs, config, ready: productReady } =
    useBotProduct(botId);
  const base = `/dashboard/${botId}`;
  const [mounted, setMounted] = useState(false);
  const BackIcon = locale === 'ar' ? ArrowRight : ArrowLeft;

  const productLabel = useMemo(() => {
    if (!mounted || !productReady) return null;
    if (isMuslim) return t.botTypes.muslim;
    if (isSystem) return t.botTypes.system;
    if (isProtection) return t.botTypes.protection;
    if (isLogs) return t.botTypes.logs;
    return t.botTypes[config.key] || null;
  }, [
    mounted,
    productReady,
    isMuslim,
    isSystem,
    isProtection,
    isLogs,
    config.key,
    t.botTypes,
  ]);

  const ownerGroups = useMemo<NavGroup[]>(
    () => [
      {
        id: 'general',
        label: t.nav.groupGeneral,
        items: [
          { href: 'overview', label: t.nav.overview, icon: LayoutDashboard },
          { href: 'settings', label: t.nav.settings, icon: Settings2 },
          { href: 'commands', label: t.nav.commands, icon: Command },
        ],
      },
      {
        id: 'apply',
        label: t.nav.groupApply,
        items: [
          { href: 'panels', label: t.nav.panels, icon: Layers },
          { href: 'requests', label: t.nav.requests, icon: ClipboardList },
        ],
      },
      {
        id: 'team',
        label: t.nav.groupTeam,
        items: [{ href: 'admins', label: t.nav.admins, icon: Users }],
      },
    ],
    [t],
  );

  const muslimGroups = useMemo<NavGroup[]>(
    () => [
      {
        id: 'general',
        label: t.nav.groupGeneral,
        items: [
          { href: 'settings', label: t.nav.settings, icon: Settings2 },
          { href: 'commands', label: t.nav.commands, icon: Command },
        ],
      },
      {
        id: 'quran',
        label: t.nav.groupQuran,
        items: [{ href: 'quran', label: q.title, icon: Headphones }],
      },
      {
        id: 'azkar',
        label: t.nav.groupAzkar,
        items: [{ href: 'azkar', label: t.nav.groupAzkar, icon: BookOpen }],
      },
    ],
    [t, q.title],
  );

  const systemGroups = useMemo<NavGroup[]>(
    () => [
      {
        id: 'general',
        label: t.nav.groupGeneral,
        items: [
          { href: 'overview', label: t.nav.overview, icon: LayoutDashboard },
          { href: 'settings', label: t.nav.settings, icon: Settings2 },
          { href: 'commands', label: t.nav.commands, icon: Command },
        ],
      },
      {
        id: 'system',
        label: t.nav.groupSystem,
        items: [
          { href: 'auto-responder', label: t.nav.autoResponder, icon: MessageSquareText },
          { href: 'auto-roles', label: t.nav.autoRoles, icon: UserPlus },
          { href: 'welcome', label: t.nav.welcome, icon: HandMetal },
          { href: 'leveling', label: t.nav.leveling, icon: Trophy },
          { href: 'reaction-roles', label: t.nav.reactionRoles, icon: SmilePlus },
        ],
      },
    ],
    [t],
  );

  const protectionGroups = useMemo<NavGroup[]>(
    () => [
      {
        id: 'general',
        label: t.nav.groupGeneral,
        items: [
          { href: 'overview', label: t.nav.overview, icon: LayoutDashboard },
          { href: 'settings', label: t.nav.settings, icon: Settings2 },
          { href: 'commands', label: t.nav.commands, icon: Command },
        ],
      },
      {
        id: 'systems',
        label: t.nav.systems,
        items: [
          { href: 'anti-nuke', label: t.nav.antiNuke, icon: Bomb },
          { href: 'anti-raid', label: t.nav.antiRaid, icon: ShieldAlert },
          { href: 'anti-bots', label: t.nav.antiBots, icon: Bot },
          { href: 'anti-perms', label: t.nav.antiPerms, icon: KeyRound },
          { href: 'anti-server', label: t.nav.antiServer, icon: ServerCog },
          { href: 'recovery', label: t.nav.recovery, icon: RefreshCw },
          { href: 'anti-prune', label: t.nav.antiPrune, icon: UserMinus },
          { href: 'anti-spam', label: t.nav.antiSpam, icon: MessageSquareWarning },
          { href: 'anti-links', label: t.nav.antiLinks, icon: Link2 },
          { href: 'automod', label: t.nav.automod, icon: Sparkles },
          { href: 'join-gate', label: t.nav.joinGate, icon: DoorOpen },
          { href: 'whitelist', label: t.nav.whitelist, icon: UserCheck },
          { href: 'lockdown', label: t.nav.lockdown, icon: Lock },
        ],
      },
    ],
    [t],
  );

  const logsGroups = useMemo<NavGroup[]>(
    () => [
      {
        id: 'general',
        label: t.nav.groupGeneral,
        items: [
          { href: 'overview', label: t.nav.overview, icon: LayoutDashboard },
          { href: 'settings', label: t.nav.settings, icon: Settings2 },
          { href: 'commands', label: t.nav.commands, icon: Command },
        ],
      },
      {
        id: 'logs',
        label: t.nav.groupLogs,
        items: [
          { href: 'members', label: t.nav.logMembers, icon: Users },
          { href: 'messages', label: t.nav.logMessages, icon: MessageSquareText },
          { href: 'voice', label: t.nav.logVoice, icon: Mic },
          { href: 'roles', label: t.nav.logRoles, icon: ScrollText },
          { href: 'channels', label: t.nav.logChannels, icon: Hash },
        ],
      },
    ],
    [t],
  );

  const adminGroups = useMemo<NavGroup[]>(
    () => [
      {
        id: 'apply',
        label: t.nav.groupApply,
        items: [{ href: 'requests', label: t.nav.requests, icon: ClipboardList }],
      },
    ],
    [t],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!ready || !productReady || !botId) return;
    if (isMuslim || isSystem || isProtection || isLogs) return;
    if (!isAdminOnly) return;
    const allowed = `${base}/requests`;
    if (!pathname.startsWith(allowed)) {
      router.replace(allowed);
    }
  }, [
    ready,
    productReady,
    isMuslim,
    isSystem,
    isProtection,
    isLogs,
    isAdminOnly,
    botId,
    base,
    pathname,
    router,
  ]);

  let groups: NavGroup[] | null = null;
  if (mounted && productReady) {
    if (isMuslim) groups = muslimGroups;
    else if (isSystem) groups = systemGroups;
    else if (isProtection) groups = protectionGroups;
    else if (isLogs) groups = logsGroups;
    else if (isAdminOnly) groups = adminGroups;
    else groups = ownerGroups;
  }

  useEffect(() => {
    if (!mounted || !productReady || !botId) return;
    if (!isMuslim && !isSystem && !isProtection && !isLogs) return;
    const applyBlocked = [
      'panels',
      'requests',
      'admins',
      'auto-responder',
      'auto-roles',
      'welcome',
      'leveling',
      'reaction-roles',
      'quran',
      'azkar',
    ];
    const protectionBlocked = [
      'anti-nuke',
      'anti-bots',
      'whitelist',
      'anti-raid',
      'anti-spam',
      'anti-links',
      'join-gate',
      'lockdown',
      'automod',
      'anti-perms',
      'recovery',
      'anti-prune',
      'anti-server',
      'systems',
    ];
    const logsBlocked = ['members', 'messages', 'voice', 'roles', 'channels', 'logs'];
    const blocked = isMuslim
      ? [
          'overview',
          ...applyBlocked,
          ...protectionBlocked,
          ...logsBlocked,
        ]
      : isSystem
        ? [
            'panels',
            'requests',
            'admins',
            ...protectionBlocked,
            ...logsBlocked,
          ]
        : isProtection
          ? [...applyBlocked, ...logsBlocked]
          : [
              ...applyBlocked,
              ...protectionBlocked,
            ];
    const segment = pathname.replace(`${base}/`, '').split('/')[0] || '';
    if (blocked.includes(segment)) {
      router.replace(
        `${base}/${isMuslim ? 'settings' : 'overview'}`,
      );
    }
  }, [
    mounted,
    productReady,
    isMuslim,
    isSystem,
    isProtection,
    isLogs,
    botId,
    base,
    pathname,
    router,
  ]);

  const avatarUrl =
    me?.id && me?.avatar
      ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png?size=64`
      : null;

  const shortId = botId
    ? `${String(botId).slice(0, 6)}…${String(botId).slice(-4)}`
    : '';

  return (
    <aside className="dash-sidebar hidden lg:flex">
      <div className="dash-sidebar-glow" aria-hidden />
      <div className="dash-sidebar-edge" aria-hidden />

      <div className="dash-sidebar-header">
        <Link href="/dashboard" className="dash-sidebar-brand">
          <span className="dash-sidebar-logo">
            <BrandMark size={32} />
          </span>
          <div className="min-w-0">
            <p className="dash-sidebar-brand-title">{t.common.maker}</p>
            <p className="dash-sidebar-brand-sub" suppressHydrationWarning>
              {mounted && isAdminOnly ? t.nav.adminAccess : t.nav.botManage}
            </p>
          </div>
        </Link>

        <div className="dash-bot-chip">
          <div className="dash-bot-chip-row">
            <div className="min-w-0">
              <p className="dash-bot-chip-label">Bot ID</p>
              <p
                className="dash-bot-chip-id"
                title={botId}
                suppressHydrationWarning
              >
                {shortId}
              </p>
            </div>
            {mounted && running != null ? (
              <span
                className={`dash-status-pill ${
                  running ? 'is-online' : 'is-offline'
                }`}
              >
                <i />
                {running ? t.common.online : t.common.offline}
              </span>
            ) : null}
          </div>
          {productLabel ? (
            <p className="dash-bot-chip-type" suppressHydrationWarning>
              {productLabel}
            </p>
          ) : null}
          {mounted && isAdminOnly ? (
            <p className="dash-bot-chip-note">
              <Shield size={11} />
              {t.nav.acceptRejectOnly}
            </p>
          ) : null}
        </div>
      </div>

      <nav className="dash-sidebar-nav" aria-label={t.nav.sections}>
        {!groups ? (
          <div className="dash-nav-group animate-pulse space-y-3 px-1">
            <div className="h-2 w-16 rounded bg-muted/60" />
            <div className="h-9 rounded-xl bg-muted/40" />
            <div className="h-9 rounded-xl bg-muted/40" />
            <div className="h-9 rounded-xl bg-muted/40" />
          </div>
        ) : null}
        {groups?.map((group, index) => (
          <div
            key={group.id}
            className={`dash-nav-group ${index > 0 ? 'dash-nav-group-spaced' : ''}`}
          >
            <p className="dash-nav-label">{group.label}</p>
            <div className="dash-nav-stack">
              {group.items.map(({ href, label, icon }) => {
                const full = `${base}/${href}`;
                const active =
                  pathname === full || pathname.startsWith(`${full}/`);
                return (
                  <NavLink
                    key={href}
                    href={full}
                    label={label}
                    icon={icon}
                    active={active}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="dash-sidebar-footer">
        <div className="dash-sidebar-lang">
          <LanguageSwitcher size="sm" fullWidth />
        </div>

        <div className="dash-nav-group">
          <p className="dash-nav-label">{t.nav.account}</p>
          <div className="dash-nav-stack">
            <Link href="/dashboard" className="dash-nav-link">
              <span className="dash-nav-icon">
                <BackIcon size={15} strokeWidth={1.85} />
              </span>
              <span className="dash-nav-link-label">{t.nav.backToBots}</span>
            </Link>

            {mounted && me ? (
              <Link href="/dashboard/profile" className="dash-user-card">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="dash-user-avatar" />
                ) : (
                  <span className="dash-user-avatar dash-user-avatar-fallback">
                    {(me.username || '?').slice(0, 1)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium leading-tight">
                    {me.username || me.id}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                    {me.id}
                  </p>
                </div>
              </Link>
            ) : null}

            <button
              type="button"
              onClick={() => {
                clearToken();
                router.push('/');
              }}
              className="dash-nav-link dash-nav-link-danger w-full"
            >
              <span className="dash-nav-icon">
                <LogOut size={15} strokeWidth={1.85} />
              </span>
              <span className="dash-nav-link-label text-start">
                {t.common.logout}
              </span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function BotMobileNav() {
  const { botId } = useParams<{ botId: string }>();
  const pathname = usePathname();
  const { t } = useI18n();
  const { me } = useMe();
  const { isAdminOnly } = useBotAccessRole(botId);
  const { isMuslim, isSystem, isProtection, isLogs, ready: productReady } =
    useBotProduct(botId);
  const [mounted, setMounted] = useState(false);
  const base = `/dashboard/${botId}`;

  const ownerNav = useMemo(
    () =>
      [
        { href: 'overview', label: t.nav.overview, icon: LayoutDashboard },
        { href: 'settings', label: t.nav.settings, icon: Settings2 },
        { href: 'commands', label: t.nav.commands, icon: Command },
        { href: 'panels', label: t.nav.panels, icon: Layers },
        { href: 'requests', label: t.nav.requests, icon: ClipboardList },
        { href: 'admins', label: t.nav.admins, icon: Users },
      ] as const,
    [t],
  );

  const muslimNav = useMemo(
    () =>
      [
        { href: 'settings', label: t.nav.settings, icon: Settings2 },
        { href: 'commands', label: t.nav.commands, icon: Command },
        { href: 'quran', label: t.nav.groupQuran, icon: Headphones },
        { href: 'azkar', label: t.nav.groupAzkar, icon: BookOpen },
      ] as const,
    [t],
  );

  const systemNav = useMemo(
    () =>
      [
        { href: 'overview', label: t.nav.overview, icon: LayoutDashboard },
        { href: 'settings', label: t.nav.settings, icon: Settings2 },
        { href: 'commands', label: t.nav.commands, icon: Command },
        { href: 'auto-responder', label: t.nav.autoResponder, icon: MessageSquareText },
        { href: 'welcome', label: t.nav.welcome, icon: HandMetal },
        { href: 'leveling', label: t.nav.leveling, icon: Trophy },
      ] as const,
    [t],
  );

  const protectionNav = useMemo(
    () =>
      [
        { href: 'overview', label: t.nav.overview, icon: LayoutDashboard },
        { href: 'settings', label: t.nav.settings, icon: Settings2 },
        { href: 'commands', label: t.nav.commands, icon: Command },
        { href: 'anti-nuke', label: t.nav.antiNuke, icon: Bomb },
        { href: 'anti-raid', label: t.nav.antiRaid, icon: ShieldAlert },
        { href: 'anti-bots', label: t.nav.antiBots, icon: Bot },
        { href: 'anti-perms', label: t.nav.antiPerms, icon: KeyRound },
        { href: 'anti-server', label: t.nav.antiServer, icon: ServerCog },
        { href: 'recovery', label: t.nav.recovery, icon: RefreshCw },
        { href: 'anti-prune', label: t.nav.antiPrune, icon: UserMinus },
        { href: 'anti-spam', label: t.nav.antiSpam, icon: MessageSquareWarning },
        { href: 'anti-links', label: t.nav.antiLinks, icon: Link2 },
        { href: 'automod', label: t.nav.automod, icon: Sparkles },
        { href: 'join-gate', label: t.nav.joinGate, icon: DoorOpen },
        { href: 'whitelist', label: t.nav.whitelist, icon: ListChecks },
        { href: 'lockdown', label: t.nav.lockdown, icon: Lock },
      ] as const,
    [t],
  );

  const logsNav = useMemo(
    () =>
      [
        { href: 'overview', label: t.nav.overview, icon: LayoutDashboard },
        { href: 'settings', label: t.nav.settings, icon: Settings2 },
        { href: 'commands', label: t.nav.commands, icon: Command },
        { href: 'members', label: t.nav.logMembers, icon: Users },
        { href: 'messages', label: t.nav.logMessages, icon: MessageSquareText },
        { href: 'voice', label: t.nav.logVoice, icon: Mic },
        { href: 'roles', label: t.nav.logRoles, icon: ScrollText },
        { href: 'channels', label: t.nav.logChannels, icon: Hash },
      ] as const,
    [t],
  );

  const adminNav = useMemo(
    () =>
      [{ href: 'requests', label: t.nav.requests, icon: ClipboardList }] as const,
    [t],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Never default to Apply/Muslim nav before productReady (avoids sticky wrong type)
  let nav: ReadonlyArray<NavItem> | null = null;
  if (mounted && productReady) {
    if (isMuslim) nav = muslimNav;
    else if (isSystem) nav = systemNav;
    else if (isProtection) nav = protectionNav;
    else if (isLogs) nav = logsNav;
    else if (isAdminOnly) nav = adminNav;
    else nav = ownerNav;
  }

  const avatarUrl =
    me?.id && me?.avatar
      ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png?size=64`
      : null;

  return (
    <div className="dash-mobile-nav lg:hidden">
      <div className="dash-mobile-nav-top">
        <p className="dash-mobile-nav-eyebrow">{t.nav.sections}</p>
        <div className="dash-mobile-nav-tools">
          <LanguageSwitcher size="sm" />
          {mounted && me ? (
            <Link href="/dashboard/profile" className="dash-user-card dash-user-card-compact">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="dash-user-avatar" />
              ) : (
                <span className="dash-user-avatar dash-user-avatar-fallback">
                  {(me.username || '?').slice(0, 1)}
                </span>
              )}
            </Link>
          ) : null}
        </div>
      </div>
      <div className="dash-mobile-nav-scroll">
        <Link href="/dashboard" className="dash-mobile-chip">
          {t.nav.myBots}
        </Link>
        {!nav ? (
          <div className="flex animate-pulse gap-1">
            <span className="h-8 w-16 shrink-0 rounded-xl bg-muted/40" />
            <span className="h-8 w-20 shrink-0 rounded-xl bg-muted/40" />
            <span className="h-8 w-16 shrink-0 rounded-xl bg-muted/40" />
          </div>
        ) : (
          nav.map(({ href, label, icon: Icon }) => {
            const full = `${base}/${href}`;
            const active = pathname === full || pathname.startsWith(`${full}/`);
            return (
              <Link
                key={href}
                href={full}
                className={`dash-mobile-chip ${active ? 'is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={14} strokeWidth={1.85} />
                {label}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
