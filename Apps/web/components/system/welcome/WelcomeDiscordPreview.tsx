'use client';

import { fillWelcomePreview } from '@/lib/welcomeVariables';

type Props = {
  botName?: string;
  message: string;
  type: 'embed' | 'message' | 'image';
  showImage?: boolean;
  caption?: boolean;
  imageAlt?: string;
  labels: {
    appBadge: string;
    previewNote: string;
  };
};

export default function WelcomeDiscordPreview({
  botName = 'Volyx Bot',
  message,
  type,
  showImage = false,
  caption = true,
  imageAlt = 'Welcome card',
  labels,
}: Props) {
  const filled = fillWelcomePreview(message);

  return (
    <div className="welcome-discord-preview">
      <p className="welcome-discord-preview-note">{labels.previewNote}</p>
      <div className="welcome-discord-message">
        <div className="welcome-discord-avatar" aria-hidden>
          <span>V</span>
        </div>
        <div className="welcome-discord-body">
          <div className="welcome-discord-meta">
            <span className="welcome-discord-bot">{botName}</span>
            <span className="welcome-discord-app">{labels.appBadge}</span>
          </div>

          {type === 'embed' ? (
            <div className="welcome-discord-embed">
              <div className="welcome-discord-embed-bar" />
              <div className="welcome-discord-embed-inner">
                <p>{filled}</p>
              </div>
            </div>
          ) : null}

          {type === 'image' && showImage ? (
            <div className="welcome-discord-image-wrap">
              <div className="welcome-discord-image-placeholder">
                {imageAlt}
              </div>
            </div>
          ) : null}

          {(type === 'message' || (type === 'image' && caption !== false)) ? (
            <p className="welcome-discord-content">{filled}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
