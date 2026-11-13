'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  ImagePlus,
  Loader2,
  Smile,
  Upload,
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { api, ApiError } from '@/lib/api';
import { useI18n } from '@/lib/i18n/I18nProvider';

export type BotProfileData = {
  id: string;
  username: string;
  globalName?: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string;
  activityType: 'PLAYING' | 'STREAMING' | 'LISTENING' | 'WATCHING' | 'COMPETING';
  activityName: string;
  activityUrl: string;
  status: 'online' | 'idle' | 'dnd' | 'invisible';
  running: boolean;
};

type Draft = {
  username: string;
  bio: string;
  activityType: BotProfileData['activityType'];
  activityName: string;
  activityUrl: string;
  status: BotProfileData['status'];
  avatarPreview: string | null;
  bannerPreview: string | null;
  avatarDataUrl: string | null | undefined;
  bannerDataUrl: string | null | undefined;
};

const ACTIVITY_TYPES: BotProfileData['activityType'][] = [
  'PLAYING',
  'STREAMING',
  'LISTENING',
  'WATCHING',
  'COMPETING',
];

const STATUS_TYPES: BotProfileData['status'][] = [
  'online',
  'idle',
  'dnd',
  'invisible',
];

function statusDotClass(
  status: BotProfileData['status'],
  activityType: BotProfileData['activityType'],
) {
  if (activityType === 'STREAMING') return 'is-streaming';
  switch (status) {
    case 'idle':
      return 'is-idle';
    case 'dnd':
      return 'is-dnd';
    case 'invisible':
      return 'is-invisible';
    default:
      return 'is-online';
  }
}

const MAX_PICK_BYTES = 15 * 1024 * 1024;

async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('READ_FAIL'));
      img.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Resize + re-encode so base64 JSON stays under the API body limit. */
async function fileToDataUrl(
  file: File,
  kind: 'avatar' | 'banner',
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('NOT_IMAGE');
  }
  if (file.size > MAX_PICK_BYTES) {
    throw new Error('TOO_LARGE');
  }

  // Keep small GIFs as-is (animation); large ones get flattened below.
  if (file.type === 'image/gif' && file.size <= 2 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('READ_FAIL'));
      reader.readAsDataURL(file);
    });
  }

  const img = await loadImageFromFile(file);
  const maxW = kind === 'avatar' ? 512 : 1280;
  const maxH = kind === 'avatar' ? 512 : 720;
  const scale = Math.min(1, maxW / img.width, maxH / img.height);
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('READ_FAIL');
  // JPEG has no alpha — fill dark so transparent edges don't become black noise oddly
  ctx.fillStyle = '#0b0b0f';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  let best = '';
  for (const q of [0.86, 0.74, 0.62, 0.5]) {
    best = canvas.toDataURL('image/jpeg', q);
    if (best.length <= 2.8 * 1024 * 1024) break;
  }
  if (!best || best.length > 5 * 1024 * 1024) {
    throw new Error('TOO_LARGE');
  }
  return best;
}

function draftFromProfile(p: BotProfileData): Draft {
  return {
    username: p.username || '',
    bio: p.bio || '',
    activityType: p.activityType || 'PLAYING',
    activityName: p.activityName || '',
    activityUrl: p.activityUrl || '',
    status: p.status || 'online',
    avatarPreview: p.avatarUrl,
    bannerPreview: p.bannerUrl,
    avatarDataUrl: undefined,
    bannerDataUrl: undefined,
  };
}

export default function BotDiscordProfileEditor({ botId }: { botId: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<BotProfileData | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<BotProfileData>(`/apply/${botId}/profile`);
      setProfile(data);
      setDraft(draftFromProfile(data));
    } catch {
      toast.error(t.settings.profileLoadFailed);
      setProfile(null);
      setDraft(null);
    } finally {
      setLoading(false);
    }
  }, [botId, t.settings.profileLoadFailed, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onPickAvatar(file: File | null) {
    if (!file || !draft) return;
    try {
      const dataUrl = await fileToDataUrl(file, 'avatar');
      setDraft({
        ...draft,
        avatarPreview: dataUrl,
        avatarDataUrl: dataUrl,
      });
    } catch (e: any) {
      if (e?.message === 'TOO_LARGE') toast.error(t.settings.profileImageTooLarge);
      else toast.error(t.settings.profileImageInvalid);
    }
  }

  async function onPickBanner(file: File | null) {
    if (!file || !draft) return;
    try {
      const dataUrl = await fileToDataUrl(file, 'banner');
      setDraft({
        ...draft,
        bannerPreview: dataUrl,
        bannerDataUrl: dataUrl,
      });
    } catch (e: any) {
      if (e?.message === 'TOO_LARGE') toast.error(t.settings.profileImageTooLarge);
      else toast.error(t.settings.profileImageInvalid);
    }
  }

  async function save() {
    if (!draft || !profile) return;
    setSaving(true);
    try {
      const nextUsername = draft.username.trim().toLowerCase();
      if (!/^[a-z0-9._]{2,32}$/.test(nextUsername) || nextUsername.includes('..') || nextUsername.startsWith('.') || nextUsername.endsWith('.')) {
        toast.error(
          t.settings.profileUsernameInvalid ||
            'Username: a–z, 0–9, _ and . only (2–32, no spaces)',
        );
        return;
      }
      const body: Record<string, unknown> = {
        bio: draft.bio,
        activityType: draft.activityType,
        activityName: draft.activityName,
        activityUrl: draft.activityUrl,
        status: draft.status,
      };
      if (nextUsername !== String(profile.username || '').toLowerCase()) {
        body.username = nextUsername;
      }
      if (draft.avatarDataUrl !== undefined) {
        body.avatarDataUrl = draft.avatarDataUrl;
      }
      if (draft.bannerDataUrl !== undefined) {
        body.bannerDataUrl = draft.bannerDataUrl;
      }
      const updated = await api<BotProfileData>(`/apply/${botId}/profile`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setProfile(updated);
      setDraft(draftFromProfile(updated));
      toast.success(t.settings.profileSaved);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : t.settings.profileSaveFailed;
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="bot-profile-card bot-profile-card-loading">
        <Loader2 className="animate-spin text-primary" size={22} />
        <span>{t.settings.profileLoading}</span>
      </section>
    );
  }

  if (!draft || !profile) {
    return (
      <section className="bot-profile-card bot-profile-card-empty">
        <p>{t.settings.profileLoadFailed}</p>
        <button type="button" className="ui-press bot-profile-retry" onClick={() => void load()}>
          {t.common.retry}
        </button>
      </section>
    );
  }

  const activityLabels: Record<BotProfileData['activityType'], string> = {
    PLAYING: t.settings.activityPlaying,
    STREAMING: t.settings.activityStreaming,
    LISTENING: t.settings.activityListening,
    WATCHING: t.settings.activityWatching,
    COMPETING: t.settings.activityCompeting,
  };

  const statusLabels: Record<BotProfileData['status'], string> = {
    online: t.settings.statusOnline,
    idle: t.settings.statusIdle,
    dnd: t.settings.statusDnd,
    invisible: t.settings.statusInvisible,
  };

  return (
    <section className="bot-profile-card">
      <header className="bot-profile-card-head">
        <div>
          <h2 className="bot-profile-card-title">{t.settings.sectionProfile}</h2>
          <p className="bot-profile-card-sub">{t.settings.sectionProfileHint}</p>
        </div>
        {!profile.running ? (
          <span className="bot-profile-offline-hint">{t.settings.profileNeedsOnline}</span>
        ) : null}
      </header>

      <div className="bot-profile-grid">
        <div className="bot-profile-visual">
          <button
            type="button"
            className="bot-profile-banner"
            onClick={() => bannerInputRef.current?.click()}
            aria-label={t.settings.changeBanner}
            style={
              draft.bannerPreview
                ? { backgroundImage: `url(${draft.bannerPreview})` }
                : undefined
            }
          >
            <span className="bot-profile-media-hint">
              <ImagePlus size={16} />
              {t.settings.changeBanner}
            </span>
          </button>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="sr-only"
            onChange={(e) => void onPickBanner(e.target.files?.[0] || null)}
          />

          <div className="bot-profile-avatar-wrap">
            <button
              type="button"
              className="bot-profile-avatar"
              onClick={() => avatarInputRef.current?.click()}
              aria-label={t.settings.changeAvatar}
            >
              {draft.avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.avatarPreview} alt="" />
              ) : (
                <span className="bot-profile-avatar-fallback">
                  {(draft.username || '?').slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="bot-profile-avatar-edit">
                <Camera size={14} />
              </span>
            </button>
            <span
              className={`bot-profile-status-dot ${statusDotClass(draft.status, draft.activityType)}`}
              aria-hidden
            />
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              className="sr-only"
              onChange={(e) => void onPickAvatar(e.target.files?.[0] || null)}
            />
          </div>

          <label className="bot-profile-field">
            <span>{t.settings.profileName}</span>
            <input
              value={draft.username}
              maxLength={32}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="bot_username"
              onChange={(e) =>
                setDraft({ ...draft, username: e.target.value.toLowerCase() })
              }
            />
            {profile.globalName ? (
              <span className="bot-profile-field-hint">
                Display: {profile.globalName}
              </span>
            ) : null}
          </label>
        </div>

        <div className="bot-profile-fields">
          <label className="bot-profile-field">
            <span>{t.settings.profileActivity}</span>
            <select
              value={draft.activityType}
              onChange={(e) => {
                const activityType = e.target
                  .value as BotProfileData['activityType'];
                setDraft({
                  ...draft,
                  activityType,
                  // Streaming replaces online/idle/dnd with purple — force online
                  ...(activityType === 'STREAMING' ? { status: 'online' } : {}),
                });
              }}
            >
              {ACTIVITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {activityLabels[type]}
                </option>
              ))}
            </select>
            <input
              className="mt-2"
              value={draft.activityName}
              maxLength={128}
              placeholder={t.settings.activityPlaceholder}
              onChange={(e) =>
                setDraft({ ...draft, activityName: e.target.value })
              }
            />
          </label>

          {draft.activityType === 'STREAMING' ? (
            <label className="bot-profile-field">
              <span>{t.settings.profileUrl}</span>
              <input
                value={draft.activityUrl}
                placeholder="https://www.youtube.com/watch?v=…"
                onChange={(e) =>
                  setDraft({ ...draft, activityUrl: e.target.value })
                }
              />
              <em>{t.settings.profileUrlHint}</em>
            </label>
          ) : null}

          {draft.activityType === 'STREAMING' ? (
            <p className="bot-profile-streaming-note">{t.settings.streamingStatusNote}</p>
          ) : (
            <label className="bot-profile-field">
              <span>{t.settings.profileStatus}</span>
              <select
                value={draft.status}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    status: e.target.value as BotProfileData['status'],
                  })
                }
              >
                {STATUS_TYPES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabels[s]}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="bot-profile-field bot-profile-about">
            <span>{t.settings.profileAbout}</span>
            <div className="bot-profile-about-box">
              <textarea
                value={draft.bio}
                maxLength={400}
                rows={4}
                placeholder={t.settings.profileAbout}
                onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
              />
              <Smile size={15} className="bot-profile-about-icon" aria-hidden />
            </div>
            <em>
              {draft.bio.length}/400
            </em>
          </label>

          <div className="bot-profile-actions">
            <button
              type="button"
              className="ui-press bot-profile-update"
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Upload size={15} />
              )}
              {saving ? t.common.saving : t.settings.profileUpdate}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
