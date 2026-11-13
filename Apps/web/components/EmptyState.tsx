'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

type Props = {
  icon?: LucideIcon;
  title: string;
  body?: string;
  actionHref?: string;
  actionLabel?: string;
};

export default function EmptyState({
  icon: Icon,
  title,
  body,
  actionHref,
  actionLabel,
}: Props) {
  return (
    <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
      {Icon ? (
        <Icon className="mx-auto mb-2 text-primary" size={22} strokeWidth={1.75} />
      ) : null}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {body ? (
        <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">{body}</p>
      ) : null}
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-4 inline-flex rounded-xl border border-primary/30 bg-primary/15 px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/25"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
