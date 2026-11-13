'use client';

import { useI18n } from '@/lib/i18n/I18nProvider';

export type EmbedField = {
  name: string;
  value: string;
  inline?: boolean;
};

export type EmbedDraft = {
  title: string;
  description: string;
  color: string;
  authorName: string;
  authorIconUrl: string;
  footerText: string;
  footerIconUrl: string;
  thumbnailUrl: string;
  imageUrl: string;
  useServerBranding: boolean;
  timestamp: boolean;
  fields: EmbedField[];
};

export const EMPTY_EMBED: EmbedDraft = {
  title: '',
  description: '',
  color: '#5865F2',
  authorName: '',
  authorIconUrl: '',
  footerText: '',
  footerIconUrl: '',
  thumbnailUrl: '',
  imageUrl: '',
  useServerBranding: true,
  timestamp: false,
  fields: [],
};

type Props = {
  embed: EmbedDraft;
  messageType?: 'embed' | 'message';
  buttonLabel?: string;
  buttonEmoji?: string;
  buttonColor?: 'Primary' | 'Secondary' | 'Success' | 'Danger';
  serverName?: string;
  serverIconUrl?: string | null;
};

const BUTTON_COLORS: Record<string, string> = {
  Primary: '#5865f2',
  Secondary: '#4e5058',
  Success: '#248046',
  Danger: '#da373c',
};

function sanitizeColor(color: string) {
  const hex = (color || '').trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(hex)) return `#${hex}`;
  return '#5865F2';
}

function nowLabel() {
  return new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Live Discord-style embed / message preview. */
export default function DiscordEmbedPreview({
  embed,
  messageType = 'embed',
  buttonLabel,
  buttonEmoji = '',
  buttonColor = 'Primary',
  serverName,
  serverIconUrl = null,
}: Props) {
  const { t } = useI18n();
  const resolvedLabel = buttonLabel || t.panelEditor.defaultButtonLabel;
  const displayServer = serverName || t.panelEditor.defaultServerName;
  const branding = embed.useServerBranding;
  const authorName = embed.authorName || (branding ? displayServer : '');
  const authorIcon =
    embed.authorIconUrl || (branding ? serverIconUrl : null);
  const footerText = embed.footerText || (branding ? displayServer : '');
  const footerIcon =
    embed.footerIconUrl || (branding ? serverIconUrl : null);
  const thumb =
    embed.thumbnailUrl || (branding ? serverIconUrl : null);
  const color = sanitizeColor(embed.color);
  const fields = (embed.fields || []).filter((f) => f.name && f.value);
  const time = nowLabel();

  return (
    <div className="discord-preview-shell">
      <div className="discord-preview-chrome">
        <span className="discord-preview-chrome-dot" />
        <span className="discord-preview-chrome-dot amber" />
        <span className="discord-preview-chrome-dot green" />
        <span className="discord-preview-chrome-label">معاينة Discord</span>
      </div>

      <div className="discord-preview" key={`${messageType}-${embed.title}-${embed.description}`}>
        <div className="discord-preview-msg">
          <div className="discord-preview-avatar" aria-hidden>
            <span>V</span>
          </div>

          <div className="discord-preview-content">
            <div className="discord-preview-meta">
              <span className="discord-preview-botname">Apply Bot</span>
              <span className="discord-preview-badge">APP</span>
              <span className="discord-preview-time">Today at {time}</span>
            </div>

            {messageType === 'message' ? (
              <p className="discord-preview-plain">
                {embed.description || (
                  <span className="discord-preview-placeholder">
                    نص الرسالة سيظهر هنا…
                  </span>
                )}
              </p>
            ) : (
          <div
            className="discord-embed"
            style={{ borderLeftColor: color }}
          >
                {authorName ? (
                  <div className="discord-embed-author">
                    {authorIcon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={authorIcon} alt="" className="discord-embed-author-icon" />
                    ) : (
                      <span className="discord-embed-author-fallback">
                        {authorName.slice(0, 1)}
                      </span>
                    )}
                    <span className="discord-embed-author-name">{authorName}</span>
                  </div>
                ) : null}

                <div className={`discord-embed-body ${thumb ? 'has-thumb' : ''}`}>
                  <div className="discord-embed-main">
                    {embed.title ? (
                      <p className="discord-embed-title">{embed.title}</p>
                    ) : null}

                    {embed.description ? (
                      <p className="discord-embed-desc">{embed.description}</p>
                    ) : (
                      <p className="discord-embed-desc is-placeholder">
                        وصف الـ Embed سيظهر هنا…
                      </p>
                    )}

                    {fields.length ? (
                      <div className="discord-embed-fields">
                        {fields.map((f, i) => (
                          <div
                            key={i}
                            className={`discord-embed-field ${
                              f.inline ? 'is-inline' : 'is-block'
                            }`}
                          >
                            <p className="discord-embed-field-name">{f.name}</p>
                            <p className="discord-embed-field-value">{f.value}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="discord-embed-thumb" />
                  ) : null}
                </div>

                {embed.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={embed.imageUrl} alt="" className="discord-embed-image" />
                ) : null}

                {footerText || embed.timestamp ? (
                  <div className="discord-embed-footer">
                    {footerIcon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={footerIcon} alt="" className="discord-embed-footer-icon" />
                    ) : null}
                    <span>
                      {footerText}
                      {footerText && embed.timestamp ? ' • ' : ''}
                      {embed.timestamp
                        ? new Date().toLocaleString('ar-EG', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </span>
                  </div>
                ) : null}
              </div>
            )}

            <PreviewButton
              label={resolvedLabel}
              emoji={buttonEmoji}
              color={buttonColor}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewButton({
  label,
  emoji,
  color = 'Primary',
}: {
  label: string;
  emoji?: string;
  color?: string;
}) {
  const bg = BUTTON_COLORS[color] || BUTTON_COLORS.Primary;
  return (
    <div className="discord-preview-actions">
      <button
        type="button"
        tabIndex={-1}
        className="discord-preview-btn"
        style={{ background: bg }}
      >
        {emoji ? <span className="discord-preview-btn-emoji">{emoji}</span> : null}
        <span>{label}</span>
      </button>
    </div>
  );
}
