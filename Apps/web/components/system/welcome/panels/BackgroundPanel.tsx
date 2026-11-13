'use client';

import BackgroundUploader from '../BackgroundUploader';
import StyledSlider from '../StyledSlider';
import type { WelcomeBackgroundLayout } from '../types';

type Props = {
  botId: string;
  hasBackground: boolean;
  background: WelcomeBackgroundLayout;
  disabled?: boolean;
  labels: Record<string, string>;
  onChangeBackground: (patch: Partial<WelcomeBackgroundLayout>) => void;
  onUploaded: (settings: Record<string, unknown>) => void;
  onRemoved: (settings: Record<string, unknown>) => void;
  onLocalPreview?: (dataUrl: string | null) => void;
  onError: (code: string) => void;
  onResetBackground: () => void;
};

export default function BackgroundPanel({
  botId,
  hasBackground,
  background,
  disabled,
  labels,
  onChangeBackground,
  onUploaded,
  onRemoved,
  onLocalPreview,
  onError,
  onResetBackground,
}: Props) {
  const fits: Array<WelcomeBackgroundLayout['fit']> = ['fill', 'cover', 'contain'];

  return (
    <div className="welcome-panel space-y-4">
      <BackgroundUploader
        botId={botId}
        hasBackground={hasBackground}
        disabled={disabled}
        labels={{
          uploadBg: labels.uploadBg,
          changeBg: labels.changeBg,
          removeBg: labels.removeBg,
          uploadHint: labels.uploadHint,
          uploading: labels.uploading,
          dropHint: labels.dropHint,
        }}
        onLocalPreview={onLocalPreview}
        onUploaded={onUploaded}
        onRemoved={onRemoved}
        onError={onError}
      />

      {hasBackground ? (
        <>
          <div>
            <p className="welcome-field-label">{labels.bgFit}</p>
            <div className="welcome-align-btns">
              {fits.map((fit) => (
                <button
                  key={fit}
                  type="button"
                  disabled={disabled}
                  className={`welcome-align-btn ${background.fit === fit ? 'is-active' : ''}`}
                  onClick={() => onChangeBackground({ fit })}
                >
                  {labels[`bgFit_${fit}`] || fit}
                </button>
              ))}
            </div>
          </div>
          <StyledSlider
            label={labels.bgScale}
            value={background.scale}
            min={50}
            max={200}
            unit="%"
            disabled={disabled}
            onChange={(scale) => onChangeBackground({ scale })}
          />
          <StyledSlider
            label={labels.bgOffsetX}
            value={background.offsetX}
            min={-50}
            max={50}
            unit="%"
            disabled={disabled}
            onChange={(offsetX) => onChangeBackground({ offsetX })}
          />
          <StyledSlider
            label={labels.bgOffsetY}
            value={background.offsetY}
            min={-50}
            max={50}
            unit="%"
            disabled={disabled}
            onChange={(offsetY) => onChangeBackground({ offsetY })}
          />
          <button
            type="button"
            className="welcome-btn-secondary"
            disabled={disabled}
            onClick={onResetBackground}
          >
            {labels.resetBackground}
          </button>
        </>
      ) : null}
    </div>
  );
}
