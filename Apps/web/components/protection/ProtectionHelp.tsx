'use client';

import { CircleHelp, Lightbulb, ListOrdered, type LucideIcon } from 'lucide-react';

/** Soft callout explaining why a feature/setting matters. */
export function ProtectionWhy({
  title,
  body,
  icon: Icon = CircleHelp,
}: {
  title: string;
  body: string;
  icon?: LucideIcon;
}) {
  return (
    <aside className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
          <Icon size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {body}
          </p>
        </div>
      </div>
    </aside>
  );
}

/** Short tip under a control. */
export function ProtectionHint({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground/90">
      {children}
    </p>
  );
}

/** Numbered setup steps for Overview. */
export function ProtectionSetupGuide({
  title,
  subtitle,
  steps,
}: {
  title: string;
  subtitle: string;
  steps: string[];
}) {
  return (
    <section className="rounded-2xl border border-border bg-card/90 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
          <ListOrdered size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-medium">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <ol className="mt-4 space-y-3">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-semibold text-emerald-400">
                  {i + 1}
                </span>
                <span className="pt-0.5 leading-relaxed text-muted-foreground">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/** Compact tip strip. */
export function ProtectionTip({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-border/80 bg-secondary/40 px-3.5 py-3">
      <Lightbulb
        size={16}
        className="mt-0.5 shrink-0 text-amber-400"
        aria-hidden
      />
      <div className="min-w-0 text-sm">
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
