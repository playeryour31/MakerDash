'use client';

import { useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { fillWelcomePreview } from '@/lib/welcomeVariables';
import VariablePicker from './VariablePicker';

type Props = {
  label: string;
  hint?: string;
  placeholder?: string;
  value: string;
  maxLength?: number;
  disabled?: boolean;
  rows?: number;
  variableLabels: Record<string, string>;
  onChange: (next: string) => void;
};

export default function WelcomeMessageEditor({
  label,
  hint,
  placeholder,
  value,
  maxLength = 2000,
  disabled = false,
  rows = 5,
  variableLabels,
  onChange,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const count = value.length;
  const nearLimit = count > maxLength * 0.9;

  return (
    <div className="welcome-message-editor">
      <div className="welcome-message-head">
        <label htmlFor="welcome-message-input" className="welcome-message-label">
          {label}
        </label>
        <div className="welcome-message-actions">
          <button
            type="button"
            className="welcome-btn-ghost"
            disabled={disabled}
            onClick={() => setShowPreview((v) => !v)}
          >
            {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
            {showPreview
              ? variableLabels.hidePreview || 'Hide preview'
              : variableLabels.showPreview || 'Preview'}
          </button>
          <span
            className={`welcome-char-count ${nearLimit ? 'is-warn' : ''}`}
            aria-live="polite"
          >
            {count}/{maxLength}
          </span>
        </div>
      </div>

      <VariablePicker
        labels={variableLabels}
        targetRef={ref}
        value={value}
        onChange={onChange}
      />

      <textarea
        id="welcome-message-input"
        ref={ref}
        className="welcome-message-textarea ui-input"
        value={value}
        maxLength={maxLength}
        rows={rows}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />

      {hint ? <p className="welcome-message-hint">{hint}</p> : null}

      {showPreview ? (
        <div className="welcome-message-preview">
          <p className="welcome-message-preview-label">
            {variableLabels.livePreview || 'Live preview'}
          </p>
          <p className="welcome-message-preview-body">{fillWelcomePreview(value)}</p>
        </div>
      ) : null}
    </div>
  );
}
