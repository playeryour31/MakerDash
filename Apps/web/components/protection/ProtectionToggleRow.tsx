'use client';

import UiSwitch from '@/components/UiSwitch';

/** Labeled row with UiSwitch — replaces native checkboxes in Protection UI. */
export default function ProtectionToggleRow({
  label,
  hint,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint ? (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
      <UiSwitch
        checked={checked}
        onCheckedChange={onCheckedChange}
        showLabel={false}
        disabled={disabled}
        aria-label={label}
        className="shrink-0"
      />
    </div>
  );
}
