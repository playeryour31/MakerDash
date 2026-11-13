'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  Copy,
  ExternalLink,
  LogOut,
  PlugZap,
  Shield,
  UserRound,
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { clearToken } from '@/lib/api';
import { useMe, useMyBots } from '@/hooks/useAuthData';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { resolveBotTypeKey } from '@/lib/botTypeConfig';
import SecurityErrorBoundary from '@/components/SecurityErrorBoundary';

const ProfileSecurityPanel = dynamic(
  () => import('@/components/ProfileSecurityPanel'),
  {
    loading: () => (
      <div className="profile-panel profile-panel-skeleton h-72 animate-pulse" />
    ),
    ssr: false,
  },
);

type ProfileTab = 'about' | 'security';

export default function ProfileClient() {
  const router = useRouter();
  const toast = useToast();
  const { t, locale } = useI18n();
  const { me, loading: meLoading, error: meError, mutate: mutateMe } = useMe();
  const { bots, loading: botsLoading, error: botsError } = useMyBots();
  const loading = meLoading || botsLoading;
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('about');
  const BackIcon = locale === 'ar' ? ArrowRight : ArrowLeft;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash === '#security') {
      setActiveTab('security');
    }
  }, []);

  useEffect(() => {
    if (meError || botsError) {
      toast.error(t.errors.loadProfile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meError, botsError]);

  const avatarUrl =
    me?.id && me?.avatar
      ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png?size=256`
      : null;

  const ownedCount = useMemo(
    () => bots.filter((b) => b.accessRole !== 'admin').length,
    [bots],
  );
  const adminCount = useMemo(
    () => bots.filter((b) => b.accessRole === 'admin').length,
    [bots],
  );
  const onlineCount = useMemo(
    () => bots.filter((b) => b.running).length,
    [bots],
  );

  const roleLabel =
    me?.role === 'bot-admin' ? t.profile.roleAdmin : t.profile.roleOwner;

  const securityCount = me?.security?.methods?.length ?? 0;

  function switchTab(tab: ProfileTab) {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const hash = tab === 'security' ? '#security' : '';
      window.history.replaceState(null, '', `${window.location.pathname}${hash}`);
    }
  }

  async function copyId() {
    if (!me?.id) return;
    try {
      await navigator.clipboard.writeText(me.id);
      setCopied(true);
      toast.success(t.profile.copyIdSuccess);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error(t.profile.copyFailed);
    }
  }

  if (loading && !me) {
    return (
      <main className="dashboard-page profile-page">
        <div className="profile-skeleton-stack" aria-busy="true">
          <div className="profile-panel profile-panel-skeleton h-52" />
          <div className="profile-stat-rail">
            {[0, 1, 2].map((i) => (
              <div key={i} className="profile-panel profile-panel-skeleton h-24" />
            ))}
          </div>
          <div className="profile-panel profile-panel-skeleton h-72" />
          <div className="profile-bento">
            <div className="profile-panel profile-panel-skeleton h-64" />
            <div className="profile-panel profile-panel-skeleton h-64" />
          </div>
        </div>
      </main>
    );
  }

  if (!me) {
    return (
      <main className="dashboard-page profile-page">
        <div className="profile-empty-state">{t.profile.emptyProfile}</div>
      </main>
    );
  }

  return (
    <main className="dashboard-page profile-page">
      <header className="profile-toolbar">
        <Link href="/dashboard" className="profile-back">
          <BackIcon size={15} strokeWidth={1.75} />
          {t.profile.backToBots}
        </Link>

        <div
          className="profile-tab-bar"
          role="tablist"
          aria-label={t.profile.title}
        >
          <button
            type="button"
            role="tab"
            id="profile-tab-about"
            aria-selected={activeTab === 'about'}
            aria-controls="profile-panel-about"
            className={`profile-tab ui-press ${
              activeTab === 'about' ? 'is-active' : ''
            }`}
            onClick={() => switchTab('about')}
          >
            <UserRound size={14} strokeWidth={1.75} />
            {t.profile.tabAboutMe}
          </button>
          <button
            type="button"
            role="tab"
            id="profile-tab-security"
            aria-selected={activeTab === 'security'}
            aria-controls="profile-panel-security"
            className={`profile-tab ui-press ${
              activeTab === 'security' ? 'is-active' : ''
            }`}
            onClick={() => switchTab('security')}
          >
            <Shield size={14} strokeWidth={1.75} />
            {t.profile.tabSecurity}
          </button>
        </div>
      </header>

      {activeTab === 'about' ? (
        <div
          id="profile-panel-about"
          role="tabpanel"
          aria-labelledby="profile-tab-about"
          className="profile-tab-panel"
        >
          <section className="profile-hero profile-hero-v2">
            <div className="profile-hero-bg" aria-hidden />
            <div className="profile-hero-grid">
              <div className="profile-hero-main">
                <div className="profile-identity">
                  <div className="profile-avatar-wrap">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt="" className="profile-avatar" />
                    ) : (
                      <span className="profile-avatar profile-avatar-fallback">
                        {(me.username || '?').slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="profile-avatar-ring" aria-hidden />
                  </div>

                  <div className="min-w-0">
                    <p className="profile-hero-kicker">{t.profile.aboutMe}</p>
                    <h1 className="profile-hero-name">
                      {me.username || t.profile.discordUser}
                    </h1>
                    <div className="profile-meta-row">
                      <span className="profile-role-pill">{roleLabel}</span>
                      {securityCount > 0 ? (
                        <button
                          type="button"
                          className="profile-secure-chip profile-secure-chip-btn ui-press"
                          onClick={() => switchTab('security')}
                        >
                          <Shield size={12} strokeWidth={1.75} />
                          {t.profile.security.enabledCount.replace(
                            '{count}',
                            String(securityCount),
                          )}
                        </button>
                      ) : null}
                    </div>
                    <p className="profile-hero-sub">{t.profile.pageSubtitle}</p>
                  </div>
                </div>

                <div className="profile-hero-actions">
                  <a
                    href={`https://discord.com/users/${me.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="profile-btn-discord ui-press"
                  >
                    <ExternalLink size={15} strokeWidth={1.75} />
                    {t.profile.openDiscord}
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      clearToken();
                      router.push('/');
                    }}
                    className="profile-btn-danger ui-press"
                  >
                    <LogOut size={15} strokeWidth={1.75} />
                    {t.common.logout}
                  </button>
                </div>
              </div>

              <aside className="profile-hero-aside" aria-label={t.profile.aboutMe}>
                <Stat
                  icon={Bot}
                  label={t.profile.ownedBots}
                  value={ownedCount}
                  tone="primary"
                />
                <Stat
                  icon={Shield}
                  label={t.profile.adminBots}
                  value={adminCount}
                  tone="cyan"
                />
                <Stat
                  icon={PlugZap}
                  label={t.profile.onlineNow}
                  value={onlineCount}
                  tone="success"
                />
              </aside>
            </div>
          </section>

          <section className="profile-bento">
            <article className="profile-panel profile-panel-account">
              <header className="profile-panel-head">
                <h2 className="profile-panel-title">
                  <span className="profile-section-icon">
                    <UserRound size={16} strokeWidth={1.75} />
                  </span>
                  {t.profile.accountData}
                </h2>
              </header>

              <dl className="profile-detail-list">
                <DetailRow
                  label={t.profile.displayName}
                  value={me.username || '—'}
                />
                <div className="profile-detail-row">
                  <dt>{t.profile.dashboardRole}</dt>
                  <dd>{roleLabel}</dd>
                </div>
                <div className="profile-detail-row">
                  <dt>{t.profile.permissions}</dt>
                  <dd>
                    {me.role === 'bot-admin'
                      ? t.profile.permAdmin
                      : t.profile.permOwner}
                  </dd>
                </div>
                <div className="profile-detail-row">
                  <dt>{t.profile.security.loginMethod}</dt>
                  <dd>{t.profile.connectedVia}</dd>
                </div>
                <div className="profile-detail-row profile-detail-row-id">
                  <dt>Discord User ID</dt>
                  <dd>
                    <code className="profile-mono" dir="ltr">
                      {me.id}
                    </code>
                    <button
                      type="button"
                      onClick={copyId}
                      className="profile-btn-ghost ui-press"
                    >
                      {copied ? (
                        <Check size={13} className="text-success" />
                      ) : (
                        <Copy size={13} />
                      )}
                      {copied ? t.profile.copied : t.profile.copy}
                    </button>
                  </dd>
                </div>
              </dl>
            </article>

            <article className="profile-panel profile-panel-bots">
              <header className="profile-panel-head">
                <h2 className="profile-panel-title">
                  <span className="profile-section-icon">
                    <Bot size={16} strokeWidth={1.75} />
                  </span>
                  {t.profile.linkedBots}
                </h2>
                {bots.length > 0 ? (
                  <Link href="/dashboard" className="profile-panel-link">
                    {t.profile.viewAllBots}
                  </Link>
                ) : null}
              </header>

              {bots.length > 0 ? (
                <ul className="profile-bot-list">
                  {bots.slice(0, 6).map((bot) => (
                    <li key={bot.clientId}>
                      <Link
                        href={
                          bot.accessRole === 'admin'
                            ? `/dashboard/${bot.clientId}/requests`
                            : resolveBotTypeKey(bot.type) === 'muslim'
                              ? `/dashboard/${bot.clientId}/settings`
                              : `/dashboard/${bot.clientId}/overview`
                        }
                        className="profile-bot-card ui-press"
                      >
                        <div className="profile-bot-card-main">
                          <p className="profile-bot-name">
                            {bot.type || 'Apply'}
                            {bot.accessRole === 'admin' ? (
                              <span className="profile-bot-badge">
                                {t.dashboard.adminBadge}
                              </span>
                            ) : null}
                          </p>
                          <p
                            className="profile-bot-id"
                            dir="ltr"
                            title={bot.clientId}
                          >
                            {bot.clientId}
                          </p>
                        </div>
                        <span
                          className={`profile-bot-status ${
                            bot.running ? 'is-online' : 'is-offline'
                          }`}
                        >
                          {bot.running ? (
                            <span className="profile-bot-dot" aria-hidden />
                          ) : null}
                          {bot.running ? t.common.online : t.common.offline}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="profile-bot-empty">{t.profile.emptyBots}</p>
              )}
            </article>
          </section>
        </div>
      ) : (
        <div
          id="profile-panel-security"
          role="tabpanel"
          aria-labelledby="profile-tab-security"
          className="profile-tab-panel"
        >
          <SecurityErrorBoundary>
            <div id="security" className="profile-security-section">
              <ProfileSecurityPanel me={me} onChanged={() => mutateMe()} />
            </div>
          </SecurityErrorBoundary>
        </div>
      )}
    </main>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Bot;
  label: string;
  value: number;
  tone: 'primary' | 'success' | 'cyan';
}) {
  return (
    <div className={`profile-stat profile-stat-${tone}`}>
      <div className="profile-stat-top">
        <span className="profile-stat-icon">
          <Icon size={16} strokeWidth={1.75} />
        </span>
        <p className="profile-stat-value">{value}</p>
      </div>
      <p className="profile-stat-label">{label}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="profile-detail-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
