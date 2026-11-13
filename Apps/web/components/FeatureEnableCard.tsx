'use client';

import type { LucideIcon } from 'lucide-react';
import UiSwitch from '@/components/UiSwitch';

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
  enabled: boolean;
  enabledLabel: string;
  disabledLabel: string;
  switchAriaLabel?: string;
  onEnabledChange: (next: boolean) => void;
  className?: string;
};

/**
 * Shared feature enable/disable banner used across system & muslim feature pages.
 */
export default function FeatureEnableCard({
  icon: Icon,
  title,
  description,
  enabled,
  enabledLabel,
  disabledLabel,
  switchAriaLabel,
  onEnabledChange,
  className = '',
}: Props) {
  return (
    <section
      className={['feature-enable-card', className].filter(Boolean).join(' ')}
    >
      <div className="feature-enable-main">
        <span className="feature-enable-icon" aria-hidden>
          <Icon size={20} />
        </span>
        <div className="feature-enable-copy">
          <h2 className="feature-enable-title">{title}</h2>
          <p className="feature-enable-desc">{description}</p>
        </div>
      </div>
      <div className="feature-enable-actions">
        <span
          className={`feature-enable-status ${enabled ? 'is-on' : 'is-off'}`}
        >
          {enabled ? enabledLabel : disabledLabel}
        </span>
        <UiSwitch
          checked={enabled}
          onCheckedChange={onEnabledChange}
          showLabel={false}
          aria-label={switchAriaLabel || title}
        />
      </div>
    </section>
  );
}
