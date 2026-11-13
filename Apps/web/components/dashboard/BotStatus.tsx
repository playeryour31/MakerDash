'use client';

type StatusVariant = 'online' | 'offline' | 'locked' | 'warn';

type Props = {
  online: boolean;
  onlineLabel: string;
  offlineLabel: string;
  variant?: StatusVariant;
  lockedLabel?: string;
  warnLabel?: string;
};

export function BotStatus({
  online,
  onlineLabel,
  offlineLabel,
  variant,
  lockedLabel,
  warnLabel,
}: Props) {
  const mode: StatusVariant =
    variant || (online ? 'online' : 'offline');

  const label =
    mode === 'locked'
      ? lockedLabel || offlineLabel
      : mode === 'warn'
        ? warnLabel || onlineLabel
        : mode === 'online'
          ? onlineLabel
          : offlineLabel;

  const shell =
    mode === 'online'
      ? 'border-success/30 bg-success/10 text-success shadow-[0_0_18px_-8px_rgba(34,197,94,0.7)]'
      : mode === 'locked'
        ? 'border-destructive/35 bg-destructive/10 text-destructive'
        : mode === 'warn'
          ? 'border-amber-500/35 bg-amber-500/10 text-amber-300'
          : 'border-white/10 bg-white/[0.03] text-muted-foreground';

  const dot =
    mode === 'online'
      ? 'bg-success animate-live-pulse'
      : mode === 'locked'
        ? 'bg-destructive'
        : mode === 'warn'
          ? 'bg-amber-400'
          : 'bg-muted-foreground';

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${shell}`}
      title={label}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
      <span>{label}</span>
    </span>
  );
}
