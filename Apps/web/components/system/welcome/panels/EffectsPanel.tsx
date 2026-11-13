'use client';

import StyledSlider from '../StyledSlider';
import type { WelcomeAvatarLayout, WelcomeOverlay, TextLayer } from '../types';

type Props = {
  avatar: WelcomeAvatarLayout;
  texts: TextLayer[];
  selectedTextId: string | null;
  overlay: WelcomeOverlay;
  disabled?: boolean;
  labels: Record<string, string>;
  onAvatarChange: (patch: Partial<WelcomeAvatarLayout>) => void;
  onTextChange: (id: string, patch: Partial<TextLayer>) => void;
  onOverlayChange: (patch: Partial<WelcomeOverlay>) => void;
};

export default function EffectsPanel({
  avatar,
  texts,
  selectedTextId,
  overlay,
  disabled,
  labels,
  onAvatarChange,
  onTextChange,
  onOverlayChange,
}: Props) {
  const selected = texts.find((t) => t.id === selectedTextId) || null;

  return (
    <div className="welcome-panel space-y-4">
      <div>
        <p className="welcome-field-label">{labels.avatarSection}</p>
        <StyledSlider
          label={labels.opacity}
          value={Math.round(avatar.opacity ?? 100)}
          min={0}
          max={100}
          unit="%"
          disabled={disabled}
          onChange={(opacity) => onAvatarChange({ opacity })}
        />
      </div>

      {selected ? (
        <div>
          <p className="welcome-field-label">
            {labels.textSection}: {selected.name}
          </p>
          <StyledSlider
            label={labels.opacity}
            value={Math.round(selected.opacity ?? 100)}
            min={0}
            max={100}
            unit="%"
            disabled={disabled}
            onChange={(opacity) => onTextChange(selected.id, { opacity })}
          />
        </div>
      ) : (
        <p className="welcome-panel-note">{labels.selectTextForEffects}</p>
      )}

      <div>
        <p className="welcome-field-label">{labels.overlay}</p>
        <label className="welcome-color-field">
          <span>{labels.overlayColor}</span>
          <input
            type="color"
            disabled={disabled}
            value={overlay.color || '#000000'}
            onChange={(e) => onOverlayChange({ color: e.target.value })}
          />
        </label>
        <StyledSlider
          label={labels.overlayOpacity}
          value={Math.round(overlay.opacity ?? 0)}
          min={0}
          max={80}
          unit="%"
          disabled={disabled}
          onChange={(opacity) => onOverlayChange({ opacity })}
        />
      </div>
    </div>
  );
}
