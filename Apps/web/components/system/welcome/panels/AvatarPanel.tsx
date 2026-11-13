'use client';

import UiSwitch from '@/components/UiSwitch';
import StyledSlider from '../StyledSlider';
import type { WelcomeAvatarLayout } from '../types';

type Props = {
  avatar: WelcomeAvatarLayout;
  disabled?: boolean;
  labels: Record<string, string>;
  onChange: (patch: Partial<WelcomeAvatarLayout>) => void;
};

export default function AvatarPanel({
  avatar,
  disabled,
  labels,
  onChange,
}: Props) {
  return (
    <div className="welcome-panel space-y-3">
      <div className="welcome-toggle-row">
        <UiSwitch
          checked={avatar.visible !== false}
          onCheckedChange={(visible) => onChange({ visible })}
          disabled={disabled}
          size="sm"
        />
        <span>{labels.avatarVisible}</span>
      </div>

      <StyledSlider
        label={labels.avatarSize}
        value={Math.round(avatar.size)}
        min={8}
        max={60}
        unit="%"
        disabled={disabled || avatar.visible === false}
        onChange={(size) => onChange({ size })}
      />
      <StyledSlider
        label={labels.opacity}
        value={Math.round(avatar.opacity ?? 100)}
        min={0}
        max={100}
        unit="%"
        disabled={disabled || avatar.visible === false}
        onChange={(opacity) => onChange({ opacity })}
      />
      <StyledSlider
        label={labels.rotation}
        value={Math.round(avatar.rotation ?? 0)}
        min={-180}
        max={180}
        unit="°"
        disabled={disabled || avatar.visible === false}
        onChange={(rotation) => onChange({ rotation })}
      />

      <div className="welcome-toggle-row">
        <UiSwitch
          checked={avatar.circle !== false}
          onCheckedChange={(circle) => onChange({ circle })}
          disabled={disabled}
          size="sm"
        />
        <span>{labels.avatarCircle}</span>
      </div>
      <div className="welcome-toggle-row">
        <UiSwitch
          checked={avatar.border === true}
          onCheckedChange={(border) => onChange({ border })}
          disabled={disabled}
          size="sm"
        />
        <span>{labels.avatarBorder}</span>
      </div>
      {avatar.border ? (
        <>
          <StyledSlider
            label={labels.avatarBorderWidth}
            value={avatar.borderWidth ?? 4}
            min={1}
            max={20}
            unit="px"
            disabled={disabled}
            onChange={(borderWidth) => onChange({ borderWidth })}
          />
          <label className="welcome-color-field">
            <span>{labels.avatarBorderColor}</span>
            <input
              type="color"
              disabled={disabled}
              value={avatar.borderColor || '#ffffff'}
              onChange={(e) => onChange({ borderColor: e.target.value })}
            />
          </label>
        </>
      ) : null}
      <div className="welcome-toggle-row">
        <UiSwitch
          checked={avatar.shadow === true}
          onCheckedChange={(shadow) => onChange({ shadow })}
          disabled={disabled}
          size="sm"
        />
        <span>{labels.avatarShadow}</span>
      </div>
      <div className="welcome-toggle-row">
        <UiSwitch
          checked={avatar.locked === true}
          onCheckedChange={(locked) => onChange({ locked })}
          disabled={disabled}
          size="sm"
        />
        <span>{labels.lock}</span>
      </div>
      <p className="welcome-panel-note">{labels.avatarSampleNote}</p>
    </div>
  );
}
