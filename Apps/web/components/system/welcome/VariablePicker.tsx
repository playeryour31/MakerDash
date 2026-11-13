'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Variable } from 'lucide-react';
import {
  WELCOME_VARIABLES,
  insertAtCursor,
  type WelcomeVariableGroup,
} from '@/lib/welcomeVariables';

type Labels = Record<string, string>;

type Props = {
  labels: Labels;
  targetRef?: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
  value: string;
  onChange: (next: string) => void;
  compact?: boolean;
  maxVisible?: number;
};

const GROUP_ORDER: WelcomeVariableGroup[] = ['member', 'server', 'memberInfo'];

export default function VariablePicker({
  labels,
  targetRef,
  value,
  onChange,
  compact = false,
  maxVisible = 6,
}: Props) {
  const [open, setOpen] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<WelcomeVariableGroup, typeof WELCOME_VARIABLES>();
    for (const g of GROUP_ORDER) map.set(g, []);
    for (const v of WELCOME_VARIABLES) {
      map.get(v.group)?.push(v);
    }
    return map;
  }, []);

  const visible = WELCOME_VARIABLES.slice(0, maxVisible);
  const overflow = WELCOME_VARIABLES.slice(maxVisible);

  function insert(token: string) {
    const el = targetRef?.current;
    if (el) {
      insertAtCursor(el, token, value, onChange);
    } else {
      onChange(value + token);
    }
  }

  return (
    <div className={`welcome-vars ${compact ? 'is-compact' : ''}`}>
      <div className="welcome-vars-head">
        <span className="welcome-vars-title">
          <Variable size={14} aria-hidden />
          {labels.availableVariables || 'Available variables'}
        </span>
        {overflow.length > 0 ? (
          <button
            type="button"
            className="welcome-vars-more-btn"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {labels.moreVariables || 'More'}
            <ChevronDown
              size={14}
              className={open ? 'rotate-180 transition-transform' : 'transition-transform'}
            />
          </button>
        ) : null}
      </div>

      <div className="welcome-vars-pills">
        {visible.map((v) => (
          <button
            key={v.key}
            type="button"
            className="welcome-var-pill"
            title={v.token}
            onClick={() => insert(v.token)}
          >
            <code>{v.token}</code>
            <span>{labels[v.labelKey] || v.key}</span>
          </button>
        ))}
      </div>

      {open && overflow.length > 0 ? (
        <div className="welcome-vars-popover">
          {GROUP_ORDER.map((group) => {
            const items = grouped.get(group) || [];
            if (!items.length) return null;
            return (
              <div key={group} className="welcome-vars-group">
                <p className="welcome-vars-group-title">
                  {labels[`group_${group}`] || group}
                </p>
                <div className="welcome-vars-pills">
                  {items.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      className="welcome-var-pill"
                      title={v.token}
                      onClick={() => insert(v.token)}
                    >
                      <code>{v.token}</code>
                      <span>{labels[v.labelKey] || v.key}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
