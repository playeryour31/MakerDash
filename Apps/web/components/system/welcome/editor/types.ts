import type {
  TextLayer,
  WelcomeAvatarLayout,
  WelcomeBackgroundLayout,
  WelcomeImageDraft,
  WelcomeOverlay,
} from '../types';

export const AVATAR_ID = 'avatar';
export const SAMPLE_AVATAR = 'https://cdn.discordapp.com/embed/avatars/0.png';
export const DEFAULT_LOGICAL_W = 960;
export const DEFAULT_LOGICAL_H = 480;
export const PREVIEW_MAX_W = 1100;
export const PREVIEW_MAX_H = 560;

export type EditorSelection =
  | { kind: 'avatar'; id: typeof AVATAR_ID }
  | { kind: 'text'; id: string }
  | null;

export type EditorTab =
  | 'background'
  | 'avatar'
  | 'text'
  | 'effects'
  | 'layers'
  | 'advanced';

export type FabricKind = 'avatar' | 'text';

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function roundPct(n: number) {
  return Math.round(n * 10) / 10;
}

export function capLogicalSize(nativeW: number, nativeH: number) {
  let width = nativeW || DEFAULT_LOGICAL_W;
  let height = nativeH || DEFAULT_LOGICAL_H;
  if (width > PREVIEW_MAX_W || height > PREVIEW_MAX_H) {
    const scale = Math.min(PREVIEW_MAX_W / width, PREVIEW_MAX_H / height);
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
  }
  return {
    width,
    height,
    scaleX: width / (nativeW || width),
    scaleY: height / (nativeH || height),
  };
}

export function snapshotDraft(d: WelcomeImageDraft): WelcomeImageDraft {
  return JSON.parse(JSON.stringify(d)) as WelcomeImageDraft;
}

export function draftsEqual(a: WelcomeImageDraft, b: WelcomeImageDraft) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export type LayerListItem = {
  id: string;
  kind: 'background' | 'avatar' | 'text';
  name: string;
  visible: boolean;
  locked: boolean;
};

export function buildLayerList(d: WelcomeImageDraft): LayerListItem[] {
  const items: LayerListItem[] = [];
  for (let i = d.texts.length - 1; i >= 0; i -= 1) {
    const t = d.texts[i];
    items.push({
      id: t.id,
      kind: 'text',
      name: t.name || `Text ${i + 1}`,
      visible: t.visible !== false,
      locked: t.locked === true,
    });
  }
  items.push({
    id: AVATAR_ID,
    kind: 'avatar',
    name: 'Avatar',
    visible: d.avatar.visible !== false,
    locked: d.avatar.locked === true,
  });
  items.push({
    id: 'background',
    kind: 'background',
    name: 'Background',
    visible: true,
    locked: true,
  });
  return items;
}

export function getTextLayer(
  texts: TextLayer[],
  id: string | null | undefined,
): TextLayer | undefined {
  if (!id) return undefined;
  return texts.find((t) => t.id === id);
}

export function patchTextLayer(
  texts: TextLayer[],
  id: string,
  patch: Partial<TextLayer>,
): TextLayer[] {
  return texts.map((t) => (t.id === id ? { ...t, ...patch } : t));
}

export function reorderTexts(
  texts: TextLayer[],
  fromId: string,
  toId: string,
): TextLayer[] {
  const from = texts.findIndex((t) => t.id === fromId);
  const to = texts.findIndex((t) => t.id === toId);
  if (from < 0 || to < 0 || from === to) return texts;
  const next = [...texts];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export type { TextLayer, WelcomeAvatarLayout, WelcomeBackgroundLayout, WelcomeOverlay };
