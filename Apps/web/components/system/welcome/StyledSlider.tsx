'use client';

import { useCallback, useId, useRef } from 'react';

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  formatValue?: (v: number) => string;
  disabled?: boolean;
  onChange: (value: number) => void;
  className?: string;
};

export default function StyledSlider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  formatValue,
  disabled = false,
  onChange,
  className = '',
}: Props) {
  const id = useId();
  const trackRef = useRef<HTMLDivElement>(null);
  const pct = ((value - min) / (max - min)) * 100;
  const display = formatValue ? formatValue(value) : `${value}${unit}`;

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track || disabled) return;
      const rect = track.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const raw = min + ratio * (max - min);
      const stepped = Math.round(raw / step) * step;
      onChange(Math.min(max, Math.max(min, stepped)));
    },
    [disabled, max, min, onChange, step],
  );

  return (
    <div className={`welcome-slider ${className}`.trim()}>
      <div className="welcome-slider-head">
        <label htmlFor={id} className="welcome-slider-label">
          {label}
        </label>
        <span className="welcome-slider-value">{display}</span>
      </div>
      <div
        ref={trackRef}
        className={`welcome-slider-track-wrap ${disabled ? 'is-disabled' : ''}`}
        onPointerDown={(e) => {
          if (disabled) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          updateFromClientX(e.clientX);
        }}
        onPointerMove={(e) => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
          updateFromClientX(e.clientX);
        }}
      >
        <div className="welcome-slider-track">
          <div className="welcome-slider-fill" style={{ width: `${pct}%` }} />
        </div>
        <input
          id={id}
          type="range"
          className="welcome-slider-input"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-valuetext={display}
        />
        <div
          className="welcome-slider-thumb"
          style={{ left: `${pct}%` }}
          aria-hidden
        />
      </div>
    </div>
  );
}
