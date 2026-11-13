'use client';

import { ExternalLink } from 'lucide-react';

type Props = {
  code?: string | null;
  inviteUrl?: string | null;
  guildId?: string | null;
  title: string;
  body: string;
  inviteLabel: string;
  guildLabel?: string;
};

/** Banner when channels/roles cannot be imported (bot not in locked guild). */
export default function GuildPresenceBanner({
  code,
  inviteUrl,
  guildId,
  title,
  body,
  inviteLabel,
  guildLabel,
}: Props) {
  if (!code || code === 'OK') return null;

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
      <p className="font-medium text-amber-900 dark:text-amber-100">{title}</p>
      <p className="mt-1 text-amber-800/90 dark:text-amber-200/80">{body}</p>
      {guildId ? (
        <p className="mt-2 font-mono text-[11px] text-muted-foreground" dir="ltr">
          {guildLabel || 'Server ID'}: {guildId}
        </p>
      ) : null}
      {inviteUrl ? (
        <a
          href={inviteUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/60"
        >
          <ExternalLink size={12} />
          {inviteLabel}
        </a>
      ) : null}
    </div>
  );
}
