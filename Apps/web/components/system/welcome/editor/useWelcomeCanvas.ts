'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TextLayer, WelcomeImageDraft } from '../types';
import {
  AVATAR_ID,
  type EditorSelection,
  patchTextLayer,
} from './types';
import {
  bringObject,
  centerObjectOnCanvas,
  ensureAvatarObject,
  ensureTextObject,
  fitCanvasToStage,
  getObjectById,
  getObjectKind,
  loadAuthBackgroundUrl,
  readObjectLayout,
  removeObjectById,
  setCanvasBackground,
  syncAllObjects,
  syncOverlayRect,
} from './fabricBridge';

type Args = {
  enabled: boolean;
  hasBackground: boolean;
  value: WelcomeImageDraft;
  interactive: boolean;
  onLayoutChange: (patch: Partial<WelcomeImageDraft>) => void;
  onCommit: () => void;
};

function safeDisposeFabric(canvas: any, host: HTMLElement | null) {
  try {
    canvas?.dispose?.();
  } catch {
    /* ignore */
  }
  // Fabric reparents the <canvas>; clear host so React never removeChild-mismatches
  if (host) {
    host.replaceChildren();
  }
}

export function useWelcomeCanvas({
  enabled,
  hasBackground,
  value,
  interactive,
  onLayoutChange,
  onCommit,
}: Args) {
  /** React-owned host only — Fabric inserts its own canvas node inside. */
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<any>(null);
  const canvasRef = useRef<any>(null);
  const valueRef = useRef(value);
  const onLayoutChangeRef = useRef(onLayoutChange);
  const onCommitRef = useRef(onCommit);
  const applyingRef = useRef(false);
  const objectUrlRef = useRef<string | null>(null);
  const buildGenRef = useRef(0);
  const draggingIdsRef = useRef<Set<string>>(new Set());
  const localPreviewRef = useRef<string | null>(null);

  const [ready, setReady] = useState(false);
  const [selection, setSelection] = useState<EditorSelection>(null);
  const [zoom, setZoom] = useState(1);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [bgLoading, setBgLoading] = useState(false);

  valueRef.current = value;
  onLayoutChangeRef.current = onLayoutChange;
  onCommitRef.current = onCommit;
  localPreviewRef.current = localPreview;

  const fit = useCallback(() => {
    fitCanvasToStage(canvasRef.current, stageRef.current, zoom);
  }, [zoom]);

  const emitFromActive = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || applyingRef.current) return;
    const active = canvas.getActiveObject();
    if (!active) return;
    const layout = readObjectLayout(canvas, active);
    if (!layout) return;
    const v = valueRef.current;
    if (layout.kind === 'avatar') {
      onLayoutChangeRef.current({
        avatar: {
          ...v.avatar,
          x: layout.x,
          y: layout.y,
          size: layout.size,
          rotation: layout.rotation,
        },
      });
    } else {
      onLayoutChangeRef.current({
        texts: patchTextLayer(v.texts, layout.id, {
          x: layout.x,
          y: layout.y,
          size: layout.size,
          rotation: layout.rotation,
        }),
      });
    }
  }, []);

  const rebuildScene = useCallback(async () => {
    const fabric = fabricRef.current;
    const canvas = canvasRef.current;
    if (!fabric || !canvas || !enabled || !hasBackground) return;

    const gen = ++buildGenRef.current;
    applyingRef.current = true;
    setBgLoading(true);

    try {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      let bgUrl = localPreviewRef.current;
      const v = valueRef.current;
      if (!bgUrl && v.hasBackground && v.backgroundUrl) {
        bgUrl = await loadAuthBackgroundUrl(v.backgroundUrl);
        if (gen !== buildGenRef.current) {
          if (bgUrl) URL.revokeObjectURL(bgUrl);
          return;
        }
        if (bgUrl) objectUrlRef.current = bgUrl;
      }

      await setCanvasBackground(canvas, fabric, bgUrl, v.background);
      if (gen !== buildGenRef.current) return;

      const keep = new Set([AVATAR_ID, 'overlay', ...(v.texts || []).map((t) => t.id)]);
      for (const obj of canvas.getObjects().slice()) {
        const id = obj?.data?.id;
        if (!id || !keep.has(id)) canvas.remove(obj);
      }

      syncOverlayRect(canvas, fabric, v.overlay);

      if (v.avatar.visible !== false) {
        await ensureAvatarObject(canvas, fabric, v.avatar, interactive);
      } else {
        removeObjectById(canvas, AVATAR_ID);
      }
      if (gen !== buildGenRef.current) return;

      for (const layer of v.texts || []) {
        if (layer.visible === false) {
          removeObjectById(canvas, layer.id);
          continue;
        }
        ensureTextObject(canvas, fabric, layer, interactive);
      }
      if (gen !== buildGenRef.current) return;

      canvas.requestRenderAll();
      setReady(true);
      requestAnimationFrame(() =>
        fitCanvasToStage(canvas, stageRef.current, zoom),
      );
    } catch (err) {
      console.warn('[welcome-canvas] rebuild failed', err);
    } finally {
      if (gen === buildGenRef.current) {
        applyingRef.current = false;
        setBgLoading(false);
      }
    }
  }, [enabled, hasBackground, interactive, zoom]);

  // Init Fabric once — create canvas element outside React's ownership
  useEffect(() => {
    if (!enabled) {
      setReady(false);
      return;
    }

    let disposed = false;
    let canvas: any = null;

    // Wait a frame so the host is painted (even if currently display:none)
    const raf = requestAnimationFrame(() => {
      if (disposed || !hostRef.current) return;

      (async () => {
        try {
          const mod = await import('fabric');
          const fabric = (mod as any).fabric || mod;
          if (disposed || !hostRef.current) return;

          hostRef.current.replaceChildren();
          const el = document.createElement('canvas');
          hostRef.current.appendChild(el);

          fabricRef.current = fabric;
          canvas = new fabric.Canvas(el, {
            selection: true,
            preserveObjectStacking: true,
            stopContextMenu: true,
          });
          canvasRef.current = canvas;
          if (canvas.wrapperEl) {
            canvas.wrapperEl.style.margin = '0 auto';
            canvas.wrapperEl.style.maxWidth = '100%';
          }

          const onMoving = (e: any) => {
            const obj = e?.target;
            if (!obj) return;
            const w = canvas.getWidth();
            const h = canvas.getHeight();
            obj.set({
              left: Math.min(w, Math.max(0, obj.left ?? 0)),
              top: Math.min(h, Math.max(0, obj.top ?? 0)),
            });
            const id = obj?.data?.id;
            if (id) draggingIdsRef.current.add(id);
            emitFromActive();
          };

          const onScaling = (e: any) => {
            const obj = e?.target;
            if (!obj) return;
            const id = obj?.data?.id;
            if (id) draggingIdsRef.current.add(id);
            if (getObjectKind(obj) === 'avatar') {
              const minSide = Math.min(canvas.getWidth(), canvas.getHeight());
              const sizePx = Math.max(
                obj.getScaledWidth(),
                obj.getScaledHeight(),
              );
              const minPx = (minSide * 8) / 100;
              const maxPx = (minSide * 60) / 100;
              if (sizePx < minPx || sizePx > maxPx) {
                const base = Math.max(obj.width || 1, obj.height || 1);
                const target = Math.min(maxPx, Math.max(minPx, sizePx));
                const scale = target / base;
                obj.set({ scaleX: scale, scaleY: scale });
              }
            }
            emitFromActive();
          };

          const onModified = () => {
            emitFromActive();
            draggingIdsRef.current.clear();
            onCommitRef.current();
          };

          const onSel = (e: any) => {
            const obj = e?.selected?.[0] || e?.target;
            const kind = getObjectKind(obj);
            if (kind === 'avatar')
              setSelection({ kind: 'avatar', id: AVATAR_ID });
            else if (kind === 'text')
              setSelection({ kind: 'text', id: String(obj.data.id) });
            else setSelection(null);
          };

          canvas.on('object:moving', onMoving);
          canvas.on('object:scaling', onScaling);
          canvas.on('object:rotating', () => {
            const obj = canvas.getActiveObject();
            if (obj?.data?.id) draggingIdsRef.current.add(obj.data.id);
            emitFromActive();
          });
          canvas.on('object:modified', onModified);
          canvas.on('selection:created', onSel);
          canvas.on('selection:updated', onSel);
          canvas.on('selection:cleared', () => setSelection(null));

          if (!disposed && hasBackground) await rebuildScene();
        } catch (err) {
          console.warn('[welcome-canvas] init failed', err);
        }
      })();
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      buildGenRef.current += 1;
      setReady(false);
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      safeDisposeFabric(canvasRef.current || canvas, hostRef.current);
      canvasRef.current = null;
      fabricRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const bgKey = `${localPreview || ''}|${value.backgroundUrl || ''}|${value.hasBackground}|${value.background?.fit}|${value.background?.scale}|${value.background?.offsetX}|${value.background?.offsetY}`;

  useEffect(() => {
    if (!enabled || !hasBackground || !canvasRef.current || !fabricRef.current)
      return;
    void rebuildScene();
  }, [bgKey, enabled, hasBackground, rebuildScene]);

  useEffect(() => {
    if (!ready || !canvasRef.current || !fabricRef.current || !hasBackground)
      return;
    if (applyingRef.current) return;
    applyingRef.current = true;
    try {
      syncAllObjects({
        canvas: canvasRef.current,
        fabric: fabricRef.current,
        avatar: value.avatar,
        texts: value.texts || [],
        interactive,
        skipPositionIds: draggingIdsRef.current,
      });
      syncOverlayRect(canvasRef.current, fabricRef.current, value.overlay);
      if (
        value.avatar.visible !== false &&
        !getObjectById(canvasRef.current, AVATAR_ID)
      ) {
        void ensureAvatarObject(
          canvasRef.current,
          fabricRef.current,
          value.avatar,
          interactive,
        );
      }
    } catch (err) {
      console.warn('[welcome-canvas] sync failed', err);
    } finally {
      applyingRef.current = false;
    }
  }, [
    ready,
    hasBackground,
    interactive,
    value.avatar,
    value.texts,
    value.overlay,
  ]);

  useEffect(() => {
    if (!ready || !hasBackground) return;
    const stage = stageRef.current;
    if (!stage) return;
    fit();
    const ro = new ResizeObserver(() => fit());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [ready, hasBackground, fit]);

  const selectById = useCallback((id: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const obj = getObjectById(canvas, id);
    if (!obj) {
      setSelection(null);
      return;
    }
    canvas.setActiveObject(obj);
    canvas.requestRenderAll();
    const kind = getObjectKind(obj);
    if (kind === 'avatar') setSelection({ kind: 'avatar', id: AVATAR_ID });
    else if (kind === 'text') setSelection({ kind: 'text', id });
  }, []);

  const deleteSelection = useCallback(() => {
    const sel = selection;
    if (!sel) return;
    const v = valueRef.current;
    if (sel.kind === 'avatar') {
      onLayoutChangeRef.current({
        avatar: { ...v.avatar, visible: false },
      });
      removeObjectById(canvasRef.current, AVATAR_ID);
    } else {
      onLayoutChangeRef.current({
        texts: (v.texts || []).filter((t) => t.id !== sel.id),
      });
      removeObjectById(canvasRef.current, sel.id);
    }
    setSelection(null);
    onCommitRef.current();
  }, [selection]);

  const duplicateSelection = useCallback(() => {
    if (selection?.kind !== 'text') return;
    const v = valueRef.current;
    const src = (v.texts || []).find((t) => t.id === selection.id);
    if (!src) return;
    const id = `txt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const copy: TextLayer = {
      ...src,
      id,
      name: `${src.name} copy`,
      x: Math.min(95, src.x + 4),
      y: Math.min(95, src.y + 4),
    };
    onLayoutChangeRef.current({ texts: [...(v.texts || []), copy] });
    onCommitRef.current();
    requestAnimationFrame(() => selectById(id));
  }, [selection, selectById]);

  const centerSelection = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selection) return;
    const obj = getObjectById(canvas, selection.id);
    if (!obj) return;
    centerObjectOnCanvas(canvas, obj);
    emitFromActive();
    onCommitRef.current();
  }, [selection, emitFromActive]);

  const layerOrder = useCallback(
    (dir: 'forward' | 'backward') => {
      const canvas = canvasRef.current;
      if (!canvas || !selection) return;
      const obj = getObjectById(canvas, selection.id);
      bringObject(canvas, obj, dir);
      if (selection.kind === 'text') {
        const v = valueRef.current;
        const texts = v.texts || [];
        const idx = texts.findIndex((t) => t.id === selection.id);
        if (idx < 0) return;
        const next = [...texts];
        const swapWith = dir === 'forward' ? idx + 1 : idx - 1;
        if (swapWith < 0 || swapWith >= next.length) return;
        [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
        onLayoutChangeRef.current({ texts: next });
        onCommitRef.current();
      }
    },
    [selection],
  );

  const toggleLockSelection = useCallback(() => {
    if (!selection) return;
    const v = valueRef.current;
    if (selection.kind === 'avatar') {
      onLayoutChangeRef.current({
        avatar: { ...v.avatar, locked: !v.avatar.locked },
      });
    } else {
      const layer = (v.texts || []).find((t) => t.id === selection.id);
      if (!layer) return;
      onLayoutChangeRef.current({
        texts: patchTextLayer(v.texts, selection.id, {
          locked: !layer.locked,
        }),
      });
    }
    onCommitRef.current();
  }, [selection]);

  const toggleVisibleSelection = useCallback(() => {
    if (!selection) return;
    const v = valueRef.current;
    if (selection.kind === 'avatar') {
      onLayoutChangeRef.current({
        avatar: { ...v.avatar, visible: v.avatar.visible === false },
      });
    } else {
      const layer = (v.texts || []).find((t) => t.id === selection.id);
      if (!layer) return;
      onLayoutChangeRef.current({
        texts: patchTextLayer(v.texts, selection.id, {
          visible: layer.visible === false,
        }),
      });
    }
    onCommitRef.current();
  }, [selection]);

  return {
    hostRef,
    stageRef,
    ready,
    selection,
    setSelection,
    selectById,
    zoom,
    setZoom,
    fit,
    bgLoading,
    localPreview,
    setLocalPreview,
    deleteSelection,
    duplicateSelection,
    centerSelection,
    layerOrder,
    toggleLockSelection,
    toggleVisibleSelection,
    rebuildScene,
  };
}
