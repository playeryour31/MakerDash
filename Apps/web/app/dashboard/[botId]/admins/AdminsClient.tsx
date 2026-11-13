'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Copy, Link2, Trash2, UserPlus, Users } from 'lucide-react';
import {
  BotLoadError,
  BotPageSkeleton,
  SectionCard,
} from '@/components/apply/BotFormBits';
import { useBotAccessRole } from '@/components/BotSidebar';
import { useToast } from '@/hooks/useToast';
import { ApiError, api, getToken } from '@/lib/api';
import { useI18n } from '@/lib/i18n/I18nProvider';

type AdminInvite = {
  slug: string;
  clientId: string;
  email: string;
  status: 'pending' | 'accepted' | 'revoked';
  discordUserId: string | null;
  invitedBy: string;
  createdAt: string;
  acceptedAt: string | null;
  inviteUrl: string;
};

export default function AdminsClient() {
  const { botId } = useParams<{ botId: string }>();
  const router = useRouter();
  const toast = useToast();
  const { t } = useI18n();
  const { isOwner, isAdminOnly, ready } = useBotAccessRole(botId);
  const [admins, setAdmins] = useState<AdminInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (isAdminOnly) {
      router.replace(`/dashboard/${botId}/requests`);
    }
  }, [ready, isAdminOnly, botId, router]);

  const load = useCallback(async () => {
    if (!botId || !getToken()) return;
    const list = await api<AdminInvite[]>(`/bots/${botId}/admins`);
    setAdmins(list);
    setLoadError('');
  }, [botId]);

  useEffect(() => {
    if (!ready || !isOwner) return;
    let cancelled = false;
    setLoading(true);
    load()
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          setLoadError(t.adminsPage.forbidden);
          return;
        }
        setLoadError(t.adminsPage.loadFailed);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, isOwner, load, t]);

  async function invite(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    try {
      const created = await api<AdminInvite>(`/bots/${botId}/admins`, {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });
      setEmail('');
      toast.success(t.adminsPage.invited);
      await load();
      try {
        await navigator.clipboard.writeText(created.inviteUrl);
        toast.info(t.adminsPage.inviteCopied);
      } catch {
        /* ignore */
      }
    } catch {
      toast.error(t.adminsPage.inviteFailed);
    } finally {
      setBusy(false);
    }
  }

  async function copyInvite(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t.adminsPage.inviteCopied);
    } catch {
      toast.error(t.adminsPage.copyFailed);
    }
  }

  async function revoke(slug: string) {
    setBusy(true);
    try {
      await api(`/bots/${botId}/admins/${slug}`, { method: 'DELETE' });
      toast.success(t.adminsPage.revoked);
      await load();
    } catch {
      toast.error(t.adminsPage.revokeFailed);
    } finally {
      setBusy(false);
    }
  }

  if (!ready || (ready && isAdminOnly)) {
    return <BotPageSkeleton />;
  }

  if (loading && !admins.length && !loadError) return <BotPageSkeleton />;
  if (loadError && !admins.length) {
    return (
      <BotLoadError
        message={loadError}
        onRetry={() => {
          setLoadError('');
          setLoading(true);
          load()
            .catch(() => setLoadError(t.adminsPage.loadFailed))
            .finally(() => setLoading(false));
        }}
      />
    );
  }

  return (
    <main className="dashboard-page">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {t.adminsPage.title}
        </h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          {t.adminsPage.subtitle}
        </p>
      </header>

      <SectionCard icon={UserPlus} title={t.adminsPage.inviteTitle}>
        <form onSubmit={invite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1 text-sm">
            <span className="text-muted-foreground">{t.adminsPage.email}</span>
            <input
              type="email"
              required
              dir="ltr"
              placeholder="admin@example.com"
              className="mt-1.5 w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
            />
          </label>
          <button
            type="submit"
            disabled={busy || !email.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-brand-soft px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition active:translate-y-px disabled:opacity-50"
          >
            <UserPlus size={16} />
            {t.adminsPage.addInvite}
          </button>
        </form>
      </SectionCard>

      <SectionCard icon={Users} title={t.adminsPage.listTitle} badge={admins.length}>
        <div className="space-y-3">
          {admins.map((admin) => (
            <div
              key={admin.slug}
              className="ui-interactive rounded-xl border border-border/70 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold" dir="ltr">
                    {admin.email}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.adminsPage.status}:{' '}
                    <span
                      className={
                        admin.status === 'accepted'
                          ? 'text-success'
                          : 'text-amber-400'
                      }
                    >
                      {admin.status === 'accepted'
                        ? t.adminsPage.active
                        : t.adminsPage.pending}
                    </span>
                    {admin.discordUserId
                      ? ` · Discord: ${admin.discordUserId}`
                      : null}
                  </p>
                  <p className="mt-2 break-all font-mono text-[11px] text-muted-foreground">
                    {admin.inviteUrl}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => copyInvite(admin.inviteUrl)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/15 px-3 py-2 text-sm font-medium transition hover:bg-primary/25 disabled:opacity-50"
                  >
                    <Copy size={14} />
                    {t.adminsPage.copyLink}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => revoke(admin.slug)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/15 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    {t.adminsPage.revoke}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {!admins.length ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              <Link2 className="mx-auto mb-2 text-primary" size={20} />
              {t.adminsPage.empty}
            </div>
          ) : null}
        </div>
      </SectionCard>
    </main>
  );
}
