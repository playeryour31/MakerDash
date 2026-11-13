'use client';

import type { LucideIcon } from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nProvider';

export function SectionCard({
  icon: Icon,
  title,
  badge,
  disabled = false,
  children,
}: {
  icon: LucideIcon;
  title: string;
  badge?: number;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={[
        'bot-panel-section rounded-2xl border border-border bg-card/90 p-5 sm:p-6 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--foreground)_5%,transparent)]',
        disabled ? 'feature-section-disabled' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-disabled={disabled || undefined}
    >
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold sm:text-xl">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
          <Icon size={16} />
        </span>
        {title}
        {badge != null && badge > 0 ? (
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {badge}
          </span>
        ) : null}
      </h2>
      <div
        className="mt-4"
        {...(disabled
          ? { 'aria-hidden': true as const, tabIndex: -1 }
          : {})}
        style={disabled ? { pointerEvents: 'none' } : undefined}
      >
        {children}
      </div>
    </section>
  );
}

export function Field({
  label,
  value,
  onChange,
  hint,
  placeholder,
  optional,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  placeholder?: string;
  optional?: boolean;
}) {
  const { t } = useI18n();
  return (
    <label className="block text-sm">
      <span className="text-muted-foreground">
        {label}
        {optional ? (
          <span className="ms-1 text-[11px] font-normal opacity-70">
            ({t.settings.optional})
          </span>
        ) : null}
      </span>
      <input
        className="mt-1.5 w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint ? (
        <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options?: Array<{ value: string; label: string }>;
  hint?: string;
}) {
  const opts = options || [
    { value: 'on', label: 'on' },
    { value: 'off', label: 'off' },
  ];
  return (
    <label className="block text-sm">
      <span className="text-muted-foreground">{label}</span>
      <select
        className="mt-1.5 w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {opts.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint ? (
        <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export function BotPageSkeleton() {
  return (
    <main className="dashboard-page">
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded-lg bg-muted/70" />
        <div className="mt-6 h-40 animate-pulse rounded-2xl border border-border bg-card" />
        <div className="h-56 animate-pulse rounded-2xl border border-border bg-card" />
      </div>
    </main>
  );
}

export function BotLoadError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const { t } = useI18n();
  return (
    <main className="dashboard-page">
      <div className="mx-auto max-w-md rounded-2xl border border-destructive/25 bg-destructive/10 p-6 text-center">
        <p className="text-sm text-destructive">{message}</p>
        <button
          type="button"
          className="mt-4 rounded-xl bg-gradient-to-r from-primary to-brand-soft px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
          onClick={onRetry}
        >
          {t.common.retry}
        </button>
      </div>
    </main>
  );
}
