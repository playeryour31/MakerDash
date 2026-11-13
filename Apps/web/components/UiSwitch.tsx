'use client';

import type { ButtonHTMLAttributes } from 'react';

type Props = {
  checked: boolean;
  onCheckedChange?: (next: boolean) => void;
  label?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'type'>;

export default function UiSwitch({
  checked,
  onCheckedChange,
  label,
  showLabel = Boolean(label),
  size = 'md',
  className = '',
  disabled,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={[
        'ui-switch',
        size === 'sm' ? 'ui-switch-sm' : '',
        checked ? 'is-on' : 'is-off',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {showLabel && label ? (
        <span className="ui-switch-label">{label}</span>
      ) : null}
      <span className="ui-switch-track" aria-hidden>
        <span className="ui-switch-thumb" />
      </span>
    </button>
  );
}
