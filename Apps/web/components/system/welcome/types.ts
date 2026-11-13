export type WelcomeTextAlign = 'left' | 'center' | 'right';

export type WelcomeBackgroundLayout = {
  fit: 'cover' | 'contain' | 'fill';
  scale: number;
  offsetX: number;
  offsetY: number;
};

export type WelcomeAvatarLayout = {
  x: number;
  y: number;
  size: number;
  circle: boolean;
  border: boolean;
  borderWidth: number;
  borderColor: string;
  shadow: boolean;
  opacity: number;
  rotation: number;
  visible: boolean;
  locked: boolean;
};

/** Legacy single-text shape (mirrored from texts[0] for older clients). */
export type WelcomeTextLayout = {
  enabled: boolean;
  content: string;
  x: number;
  y: number;
  size: number;
  color: string;
  align: WelcomeTextAlign;
  fontWeight: 'normal' | 'bold';
  fontFamily: string;
  shadow: boolean;
  opacity: number;
  rotation: number;
};

export type TextLayer = {
  id: string;
  name: string;
  content: string;
  x: number;
  y: number;
  size: number;
  color: string;
  align: WelcomeTextAlign;
  fontWeight: 'normal' | 'bold';
  fontFamily: string;
  opacity: number;
  rotation: number;
  shadow: boolean;
  visible: boolean;
  locked: boolean;
};

export type WelcomeOverlay = {
  color: string;
  opacity: number;
};

export type WelcomeImageDraft = {
  type: 'embed' | 'message' | 'image';
  message: string;
  caption: boolean;
  hasBackground: boolean;
  backgroundUrl: string | null;
  background: WelcomeBackgroundLayout;
  avatar: WelcomeAvatarLayout;
  /** @deprecated Prefer texts — kept in sync with texts[0] */
  text: WelcomeTextLayout;
  texts: TextLayer[];
  overlay: WelcomeOverlay;
};

export type WelcomeDraft = {
  enabled: boolean;
  channelId: string;
  message: string;
  type: 'embed' | 'message' | 'image';
  caption: boolean;
  hasBackground: boolean;
  backgroundUrl: string | null;
  background: WelcomeBackgroundLayout;
  avatar: WelcomeAvatarLayout;
  text: WelcomeTextLayout;
  texts: TextLayer[];
  overlay: WelcomeOverlay;
};

export const DEFAULT_BACKGROUND: WelcomeBackgroundLayout = {
  fit: 'fill',
  scale: 100,
  offsetX: 0,
  offsetY: 0,
};

export const DEFAULT_AVATAR: WelcomeAvatarLayout = {
  x: 50,
  y: 38,
  size: 22,
  circle: true,
  border: false,
  borderWidth: 4,
  borderColor: '#ffffff',
  shadow: false,
  opacity: 100,
  rotation: 0,
  visible: true,
  locked: false,
};

export const DEFAULT_TEXT: WelcomeTextLayout = {
  enabled: true,
  content: 'Welcome {username}!',
  x: 50,
  y: 78,
  size: 4.5,
  color: '#ffffff',
  align: 'center',
  fontWeight: 'bold',
  fontFamily: 'Segoe UI',
  shadow: true,
  opacity: 100,
  rotation: 0,
};

export const DEFAULT_OVERLAY: WelcomeOverlay = {
  color: '#000000',
  opacity: 0,
};

export function createTextLayer(
  partial?: Partial<TextLayer> & { content?: string },
): TextLayer {
  const id =
    partial?.id ||
    `txt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    name: partial?.name || 'Text',
    content: partial?.content ?? 'Welcome {username}!',
    x: partial?.x ?? 50,
    y: partial?.y ?? 78,
    size: partial?.size ?? 4.5,
    color: partial?.color ?? '#ffffff',
    align: partial?.align ?? 'center',
    fontWeight: partial?.fontWeight ?? 'bold',
    fontFamily: partial?.fontFamily ?? 'Segoe UI',
    opacity: partial?.opacity ?? 100,
    rotation: partial?.rotation ?? 0,
    shadow: partial?.shadow !== false,
    visible: partial?.visible !== false,
    locked: partial?.locked === true,
  };
}

export function textLayerToLegacy(layer: TextLayer | undefined): WelcomeTextLayout {
  if (!layer) {
    return { ...DEFAULT_TEXT, enabled: false };
  }
  return {
    enabled: layer.visible !== false,
    content: layer.content,
    x: layer.x,
    y: layer.y,
    size: layer.size,
    color: layer.color,
    align: layer.align,
    fontWeight: layer.fontWeight,
    fontFamily: layer.fontFamily,
    shadow: layer.shadow,
    opacity: layer.opacity,
    rotation: layer.rotation,
  };
}

export function legacyTextToLayer(
  text: Partial<WelcomeTextLayout> | undefined,
  id = 'txt_legacy',
): TextLayer {
  return createTextLayer({
    id,
    name: 'Welcome text',
    content: text?.content ?? DEFAULT_TEXT.content,
    x: text?.x,
    y: text?.y,
    size: text?.size,
    color: text?.color,
    align: text?.align,
    fontWeight: text?.fontWeight,
    fontFamily: text?.fontFamily,
    opacity: text?.opacity,
    rotation: text?.rotation,
    shadow: text?.shadow,
    visible: text?.enabled !== false,
  });
}

export const EMPTY_WELCOME: WelcomeDraft = {
  enabled: false,
  channelId: '',
  message: 'Welcome {user} to {server}!',
  type: 'embed',
  caption: true,
  hasBackground: false,
  backgroundUrl: null,
  background: DEFAULT_BACKGROUND,
  avatar: DEFAULT_AVATAR,
  text: DEFAULT_TEXT,
  texts: [legacyTextToLayer(DEFAULT_TEXT, 'txt_default')],
  overlay: DEFAULT_OVERLAY,
};
