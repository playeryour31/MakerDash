'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Loader2, RotateCcw, Save } from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nProvider';

type Props = {
  open: boolean;
  saving?: boolean;
  message?: string;
  saveLabel?: string;
  discardLabel?: string;
  onSave: () => void | Promise<void>;
  onDiscard: () => void;
};

export default function UnsavedChangesBar({
  open,
  saving = false,
  message,
  saveLabel,
  discardLabel,
  onSave,
  onDiscard,
}: Props) {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  const msg = message ?? t.common.unsavedMessage;
  const save = saveLabel ?? t.common.saveChanges;
  const discard = discardLabel ?? t.common.discard;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [open]);

  useEffect(() => {
    document.body.classList.toggle('unsaved-bar-visible', open);
    return () => {
      document.body.classList.remove('unsaved-bar-visible');
    };
  }, [open]);

  const bar = (
    <div
      className={`unsaved-bar ${open ? 'unsaved-bar-open' : ''}`}
      role="status"
      aria-live="polite"
      aria-hidden={!open}
    >
      <div className="unsaved-bar-inner">
        <p className="unsaved-bar-message">
          <span className="unsaved-bar-icon">
            <AlertTriangle size={16} aria-hidden />
          </span>
          <span>{msg}</span>
        </p>
        <div className="unsaved-bar-actions">
          <button
            type="button"
            disabled={saving || !open}
            onClick={onDiscard}
            className="unsaved-bar-discard"
          >
            <RotateCcw size={15} />
            {discard}
          </button>
          <button
            type="button"
            disabled={saving || !open}
            onClick={() => void onSave()}
            className="unsaved-bar-save"
          >
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}
            {saving ? t.common.saving : save}
          </button>
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(bar, document.body);
}
