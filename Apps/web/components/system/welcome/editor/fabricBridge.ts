import { getToken } from '@/lib/api';
import { fillWelcomePreview } from '@/lib/welcomeVariables';
import type { TextLayer, WelcomeAvatarLayout, WelcomeBackgroundLayout } from '../types';
import {
  AVATAR_ID,
  SAMPLE_AVATAR,
  DEFAULT_LOGICAL_H,
  DEFAULT_LOGICAL_W,
  PREVIEW_MAX_H,
  capLogicalSize,
  clamp,
  roundPct,
  type FabricKind,
} from './types';

/** Fabric namespace, typed from the package itself (v6+ exposes named exports). */
export type FabricModule = typeof import('fabric');

export async function loadAuthBackgroundUrl(
  apiPath: string | null,
): Promise<string | null> {
  if (!apiPath) return null;
  const token = getToken();
  const url = apiPath.startsWith('/api')
    ? apiPath
    : `/api${apiPath.startsWith('/') ? '' : '/'}${apiPath}`;
  const res = await fetch(url, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'ngrok-skip-browser-warning': '1',
    },
  });
  if (!res.ok) return null;
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/** fabric 6+ replaced the callback API with a promise. */
export function loadFabricImage(fabric: FabricModule, url: string): Promise<any> {
  return fabric.FabricImage.fromURL(url, { crossOrigin: 'anonymous' });
}

/** Rotation/scale locks plus the matching control handles (v6 dropped hasRotatingPoint). */
function applyLock(obj: any, locked: boolean) {
  obj.set({
    lockRotation: locked,
    lockMovementX: locked,
    lockMovementY: locked,
    lockScalingX: locked,
    lockScalingY: locked,
  });
  obj.setControlsVisibility({ mtr: !locked });
}

export function getObjectById(canvas: any, id: string): any | null {
  if (!canvas) return null;
  return (
    canvas.getObjects().find((obj: any) => obj?.data?.id === id) || null
  );
}

export function getObjectKind(obj: any): FabricKind | null {
  const kind = obj?.data?.kind;
  return kind === 'avatar' || kind === 'text' ? kind : null;
}

export function applyCircleClip(img: any, fabric: FabricModule, enabled: boolean) {
  if (!img) return;
  if (enabled) {
    const r = Math.min(img.width || 1, img.height || 1) / 2;
    img.clipPath = new fabric.Circle({
      radius: r,
      originX: 'center',
      originY: 'center',
    });
  } else {
    img.clipPath = undefined;
  }
  img.setCoords();
}

function bgDrawMetrics(
  canvasW: number,
  canvasH: number,
  imgW: number,
  imgH: number,
  bg: WelcomeBackgroundLayout,
) {
  const fit = bg.fit === 'cover' || bg.fit === 'contain' ? bg.fit : 'fill';
  const scalePct = clamp(bg.scale ?? 100, 50, 200) / 100;
  const offsetX = ((bg.offsetX ?? 0) / 100) * canvasW;
  const offsetY = ((bg.offsetY ?? 0) / 100) * canvasH;

  if (fit === 'fill') {
    const scaleX = (canvasW / imgW) * scalePct;
    const scaleY = (canvasH / imgH) * scalePct;
    return {
      scaleX,
      scaleY,
      left: (canvasW - imgW * scaleX) / 2 + offsetX,
      top: (canvasH - imgH * scaleY) / 2 + offsetY,
    };
  }

  const base =
    fit === 'cover'
      ? Math.max(canvasW / imgW, canvasH / imgH)
      : Math.min(canvasW / imgW, canvasH / imgH);
  const scale = base * scalePct;
  return {
    scaleX: scale,
    scaleY: scale,
    left: (canvasW - imgW * scale) / 2 + offsetX,
    top: (canvasH - imgH * scale) / 2 + offsetY,
  };
}

export async function setCanvasBackground(
  canvas: any,
  fabric: FabricModule,
  bgUrl: string | null,
  bgLayout: WelcomeBackgroundLayout,
): Promise<{ width: number; height: number }> {
  // v6 removed setBackgroundImage/setBackgroundColor/setWidth/setHeight.
  canvas.backgroundImage = undefined;
  if (!bgUrl) {
    canvas.setDimensions({ width: DEFAULT_LOGICAL_W, height: DEFAULT_LOGICAL_H });
    canvas.backgroundColor = '#0f172a';
    canvas.requestRenderAll();
    return { width: DEFAULT_LOGICAL_W, height: DEFAULT_LOGICAL_H };
  }

  const bg = await loadFabricImage(fabric, bgUrl);
  const nativeW = bg.width || DEFAULT_LOGICAL_W;
  const nativeH = bg.height || DEFAULT_LOGICAL_H;
  const capped = capLogicalSize(nativeW, nativeH);
  canvas.setDimensions({ width: capped.width, height: capped.height });
  canvas.backgroundColor = '#0a0a10';

  const metrics = bgDrawMetrics(
    capped.width,
    capped.height,
    nativeW,
    nativeH,
    bgLayout,
  );
  bg.set({
    originX: 'left',
    originY: 'top',
    left: metrics.left,
    top: metrics.top,
    scaleX: metrics.scaleX,
    scaleY: metrics.scaleY,
  });
  bg.setCoords();
  canvas.backgroundImage = bg;
  canvas.requestRenderAll();
  return { width: capped.width, height: capped.height };
}

export function syncOverlayRect(
  canvas: any,
  fabric: FabricModule,
  overlay: { color: string; opacity: number } | null | undefined,
) {
  const existing = canvas
    .getObjects()
    .find((o: any) => o?.data?.kind === 'overlay');
  const opacity = clamp(Number(overlay?.opacity ?? 0), 0, 80) / 100;
  if (opacity <= 0) {
    if (existing) canvas.remove(existing);
    return;
  }
  const w = canvas.getWidth() || DEFAULT_LOGICAL_W;
  const h = canvas.getHeight() || DEFAULT_LOGICAL_H;
  if (existing) {
    existing.set({
      width: w,
      height: h,
      fill: overlay?.color || '#000000',
      opacity,
    });
    existing.setCoords();
    return;
  }
  const rect = new fabric.Rect({
    left: 0,
    top: 0,
    // v7 defaults objects to center origin; the overlay must stay anchored.
    originX: 'left',
    originY: 'top',
    width: w,
    height: h,
    fill: overlay?.color || '#000000',
    opacity,
    selectable: false,
    evented: false,
    data: { id: 'overlay', kind: 'overlay' },
  });
  canvas.add(rect);
  canvas.sendObjectToBack(rect);
}

export function syncAvatarObject(
  canvas: any,
  fabric: FabricModule,
  avatarImg: any,
  avatar: WelcomeAvatarLayout,
  interactive: boolean,
) {
  const w = canvas.getWidth() || DEFAULT_LOGICAL_W;
  const h = canvas.getHeight() || DEFAULT_LOGICAL_H;
  const minSide = Math.min(w, h);
  const sizePx = (minSide * Number(avatar.size || 22)) / 100;
  const base = Math.max(avatarImg.width || 1, avatarImg.height || 1);
  const scale = sizePx / base;
  const locked = avatar.locked === true || !interactive;

  applyCircleClip(avatarImg, fabric, avatar.circle !== false);
  avatarImg.set({
    left: (w * Number(avatar.x || 50)) / 100,
    top: (h * Number(avatar.y || 38)) / 100,
    originX: 'center',
    originY: 'center',
    scaleX: scale,
    scaleY: scale,
    angle: avatar.rotation || 0,
    opacity: clamp(Number(avatar.opacity ?? 100), 0, 100) / 100,
    visible: avatar.visible !== false,
    selectable: !locked,
    evented: !locked,
    cornerStyle: 'circle',
    cornerColor: '#ffffff',
    borderColor: '#7c3aed',
    transparentCorners: false,
    padding: 6,
    data: { id: AVATAR_ID, kind: 'avatar' as FabricKind },
    name: 'welcome-avatar',
  });
  applyLock(avatarImg, locked);
  avatarImg.setCoords();
}

export async function ensureAvatarObject(
  canvas: any,
  fabric: FabricModule,
  avatar: WelcomeAvatarLayout,
  interactive: boolean,
): Promise<any> {
  let obj = getObjectById(canvas, AVATAR_ID);
  if (!obj) {
    obj = await loadFabricImage(fabric, SAMPLE_AVATAR);
    canvas.add(obj);
  }
  syncAvatarObject(canvas, fabric, obj, avatar, interactive);
  return obj;
}

export function syncTextObject(
  canvas: any,
  textObj: any,
  layer: TextLayer,
  interactive: boolean,
) {
  const w = canvas.getWidth() || DEFAULT_LOGICAL_W;
  const h = canvas.getHeight() || DEFAULT_LOGICAL_H;
  const fontPx = Math.max(
    12,
    Math.round((h * Number(layer.size || 4.5)) / 100),
  );
  const locked = layer.locked === true || !interactive;
  const display = fillWelcomePreview(layer.content || 'Welcome {username}!');

  textObj.set({
    text: display,
    left: (w * Number(layer.x || 50)) / 100,
    top: (h * Number(layer.y || 78)) / 100,
    originX: 'center',
    originY: 'center',
    fill: layer.color || '#ffffff',
    fontSize: fontPx,
    scaleX: 1,
    scaleY: 1,
    fontFamily: layer.fontFamily || 'Segoe UI, system-ui, sans-serif',
    fontWeight: layer.fontWeight === 'normal' ? 'normal' : 'bold',
    textAlign: layer.align || 'center',
    angle: layer.rotation || 0,
    opacity: clamp(Number(layer.opacity ?? 100), 0, 100) / 100,
    visible: layer.visible !== false,
    selectable: !locked,
    evented: !locked,
    editable: false,
    cornerStyle: 'circle',
    cornerColor: '#ffffff',
    borderColor: '#7c3aed',
    transparentCorners: false,
    shadow:
      layer.shadow !== false ? 'rgba(0,0,0,0.45) 2px 2px 0px' : undefined,
    data: { id: layer.id, kind: 'text' as FabricKind },
    name: `welcome-text-${layer.id}`,
  });
  applyLock(textObj, locked);
  textObj.setCoords();
}

export function ensureTextObject(
  canvas: any,
  fabric: FabricModule,
  layer: TextLayer,
  interactive: boolean,
): any {
  let obj = getObjectById(canvas, layer.id);
  if (!obj) {
    obj = new fabric.IText(fillWelcomePreview(layer.content), {
      originX: 'center',
      originY: 'center',
    });
    canvas.add(obj);
  }
  syncTextObject(canvas, obj, layer, interactive);
  return obj;
}

export function removeObjectById(canvas: any, id: string) {
  const obj = getObjectById(canvas, id);
  if (obj) {
    canvas.remove(obj);
    canvas.discardActiveObject();
    canvas.requestRenderAll();
  }
}

export function syncAllObjects(opts: {
  canvas: any;
  fabric: FabricModule;
  avatar: WelcomeAvatarLayout;
  texts: TextLayer[];
  interactive: boolean;
  skipPositionIds?: Set<string>;
}) {
  const { canvas, fabric, avatar, texts, interactive, skipPositionIds } = opts;
  const existing = new Map<string, any>();
  for (const obj of canvas.getObjects()) {
    const id = obj?.data?.id;
    if (id) existing.set(id, obj);
  }

  // Avatar
  const avatarObj = existing.get(AVATAR_ID);
  if (avatar.visible === false) {
    if (avatarObj) canvas.remove(avatarObj);
  } else if (avatarObj) {
    const skip = skipPositionIds?.has(AVATAR_ID);
    if (skip) {
      const next = { ...avatar };
      // keep fabric left/top; still sync style
      syncAvatarObject(canvas, fabric, avatarObj, next, interactive);
    } else {
      syncAvatarObject(canvas, fabric, avatarObj, avatar, interactive);
    }
  }

  const textIds = new Set(texts.map((t) => t.id));
  for (const [id, obj] of existing) {
    if (id === AVATAR_ID) continue;
    if (obj?.data?.kind === 'text' && !textIds.has(id)) {
      canvas.remove(obj);
    }
  }

  for (const layer of texts) {
    if (layer.visible === false) {
      const obj = getObjectById(canvas, layer.id);
      if (obj) canvas.remove(obj);
      continue;
    }
    const obj = getObjectById(canvas, layer.id);
    if (obj && skipPositionIds?.has(layer.id)) {
      // update styles but preserve drag position until emit
      const fontPx = Math.max(
        12,
        Math.round(
          ((canvas.getHeight() || DEFAULT_LOGICAL_H) * Number(layer.size || 4.5)) /
            100,
        ),
      );
      obj.set({
        text: fillWelcomePreview(layer.content || ''),
        fill: layer.color,
        fontSize: fontPx,
        fontWeight: layer.fontWeight === 'normal' ? 'normal' : 'bold',
        fontFamily: layer.fontFamily || 'Segoe UI, system-ui, sans-serif',
        textAlign: layer.align,
        angle: layer.rotation || 0,
        opacity: clamp(Number(layer.opacity ?? 100), 0, 100) / 100,
        shadow:
          layer.shadow !== false ? 'rgba(0,0,0,0.45) 2px 2px 0px' : undefined,
        selectable: !(layer.locked || !interactive),
        evented: !(layer.locked || !interactive),
      });
      obj.setCoords();
    } else {
      ensureTextObject(canvas, fabric, layer, interactive);
    }
  }

  canvas.requestRenderAll();
}

export function readObjectLayout(canvas: any, obj: any) {
  const w = canvas.getWidth() || DEFAULT_LOGICAL_W;
  const h = canvas.getHeight() || DEFAULT_LOGICAL_H;
  const minSide = Math.min(w, h);
  const kind = getObjectKind(obj);
  if (kind === 'avatar') {
    const sizePx = Math.max(obj.getScaledWidth(), obj.getScaledHeight());
    return {
      kind,
      id: AVATAR_ID,
      x: roundPct(clamp(((obj.left ?? 0) / w) * 100, 0, 100)),
      y: roundPct(clamp(((obj.top ?? 0) / h) * 100, 0, 100)),
      size: roundPct(clamp((sizePx / minSide) * 100, 8, 60)),
      rotation: roundPct(obj.angle || 0),
    };
  }
  if (kind === 'text') {
    const fontPx = (obj.fontSize || 24) * (obj.scaleY || 1);
    return {
      kind,
      id: String(obj.data.id),
      x: roundPct(clamp(((obj.left ?? 0) / w) * 100, 0, 100)),
      y: roundPct(clamp(((obj.top ?? 0) / h) * 100, 0, 100)),
      size: roundPct(clamp((fontPx / h) * 100, 1.5, 12)),
      rotation: roundPct(obj.angle || 0),
    };
  }
  return null;
}

export function fitCanvasToStage(
  canvas: any,
  stage: HTMLElement | null,
  zoom = 1,
) {
  if (!canvas || !stage) return;
  const logicalW = canvas.getWidth();
  const logicalH = canvas.getHeight();
  if (!logicalW || !logicalH) return;

  canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  canvas.setZoom(1);

  const pad = 24;
  const availW = Math.max(180, stage.clientWidth - pad);
  const availH = Math.max(
    160,
    Math.min(stage.clientHeight || PREVIEW_MAX_H, PREVIEW_MAX_H) - pad,
  );
  const fit = Math.min(availW / logicalW, availH / logicalH, 1);
  const scale = fit * clamp(zoom, 0.4, 2);

  canvas.setDimensions(
    { width: logicalW * scale, height: logicalH * scale },
    { cssOnly: true },
  );
  canvas.calcOffset();
  canvas.requestRenderAll();
}

export function centerObjectOnCanvas(canvas: any, obj: any) {
  if (!canvas || !obj) return;
  obj.set({
    left: canvas.getWidth() / 2,
    top: canvas.getHeight() / 2,
  });
  obj.setCoords();
  canvas.requestRenderAll();
}

export function bringObject(canvas: any, obj: any, dir: 'forward' | 'backward') {
  if (!canvas || !obj) return;
  // v6 renamed sendToBack/bringForward/sendBackwards to *Object* variants.
  if (dir === 'forward') canvas.bringObjectForward(obj);
  else canvas.sendObjectBackwards(obj);
  canvas.requestRenderAll();
}
