'use client';

import UiSwitch from '@/components/UiSwitch';

type Props = {
  caption: boolean;
  disabled?: boolean;
  labels: Record<string, string>;
  onCaptionChange: (caption: boolean) => void;
  onResetAll: () => void;
};

export default function AdvancedPanel({
  caption,
  disabled,
  labels,
  onCaptionChange,
  onResetAll,
}: Props) {
  return (
    <div className="welcome-panel space-y-4">
      <div className="welcome-toggle-row">
        <UiSwitch
          checked={caption !== false}
          onCheckedChange={onCaptionChange}
          disabled={disabled}
          size="sm"
        />
        <span>{labels.captionWithImage}</span>
      </div>
      <p className="welcome-panel-note">{labels.advancedNote}</p>
      <button
        type="button"
        className="welcome-btn-destructive"
        disabled={disabled}
        onClick={onResetAll}
      >
        {labels.resetAllConfirm}
      </button>
    </div>
  );
}
