'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import CardPreview from './CardPreview';
import BackgroundPanel from './panels/BackgroundPanel';
import AvatarPanel from './panels/AvatarPanel';
import TextPanel from './panels/TextPanel';
import EffectsPanel from './panels/EffectsPanel';
import LayersPanel from './panels/LayersPanel';
import AdvancedPanel from './panels/AdvancedPanel';
import {
  canRedo,
  canUndo,
  createHistory,
  historyCommit,
  historyRedo,
  historyReplacePresent,
  historyUndo,
  type HistoryState,
} from './editor/history';
import { useWelcomeCanvas } from './editor/useWelcomeCanvas';
import {
  AVATAR_ID,
  buildLayerList,
  patchTextLayer,
  type EditorTab,
} from './editor/types';
import {
  createTextLayer,
  DEFAULT_AVATAR,
  DEFAULT_BACKGROUND,
  DEFAULT_OVERLAY,
  legacyTextToLayer,
  textLayerToLegacy,
  type TextLayer,
  type WelcomeImageDraft,
} from './types';

type Labels = Record<string, string>;

const TABS: EditorTab[] = [
  'background',
  'avatar',
  'text',
  'effects',
  'layers',
  'advanced',
];

function normalizeIncoming(value: WelcomeImageDraft): WelcomeImageDraft {
  const texts =
    Array.isArray(value.texts) && value.texts.length > 0
      ? value.texts
      : [legacyTextToLayer(value.text)];
  return {
    ...value,
    background: value.background || DEFAULT_BACKGROUND,
    overlay: value.overlay || DEFAULT_OVERLAY,
    avatar: { ...DEFAULT_AVATAR, ...value.avatar },
    texts,
    text: textLayerToLegacy(texts[0]),
  };
}

export default function WelcomeCardBuilder({
  botId,
  value,
  labels,
  disabled = false,
  onChange,
  onUploaded,
  onRemoved,
  onError,
}: {
  botId: string;
  value: WelcomeImageDraft;
  labels: Labels;
  disabled?: boolean;
  onChange: (patch: Partial<WelcomeImageDraft>) => void;
  onUploaded: (settings: Record<string, unknown>) => void;
  onRemoved: (settings: Record<string, unknown>) => void;
  onError: (message: string) => void;
}) {
  const showImageTools = value.type === 'image';
  const [tab, setTab] = useState<EditorTab>('background');
  const [history, setHistory] = useState<HistoryState>(() =>
    createHistory(normalizeIncoming(value)),
  );

  // Keep external draft as source for save; history for undo within builder session
  const draft = useMemo(() => normalizeIncoming(value), [value]);

  useEffect(() => {
    setHistory((h) => historyReplacePresent(h, draft));
  }, [draft]);

  const pushChange = useCallback(
    (patch: Partial<WelcomeImageDraft>, commit = false) => {
      const nextTexts = patch.texts ?? draft.texts;
      const merged: WelcomeImageDraft = {
        ...draft,
        ...patch,
        texts: nextTexts,
        text: textLayerToLegacy(nextTexts[0]),
      };
      onChange({
        ...patch,
        texts: nextTexts,
        text: textLayerToLegacy(nextTexts[0]),
      });
      if (commit) {
        setHistory((h) => historyCommit(h, merged));
      } else {
        setHistory((h) => historyReplacePresent(h, merged));
      }
    },
    [draft, onChange],
  );

  const commitSnapshot = useCallback(() => {
    setHistory((h) => historyCommit(h, draft));
  }, [draft]);

  const canvas = useWelcomeCanvas({
    enabled: showImageTools,
    hasBackground: draft.hasBackground,
    value: draft,
    interactive: !disabled,
    onLayoutChange: (patch) => pushChange(patch, false),
    onCommit: commitSnapshot,
  });

  const selectedTextId =
    canvas.selection?.kind === 'text' ? canvas.selection.id : null;

  const selectionLocked =
    canvas.selection?.kind === 'avatar'
      ? draft.avatar.locked
      : canvas.selection?.kind === 'text'
        ? draft.texts.find((t) => t.id === canvas.selection?.id)?.locked
        : false;

  const selectionVisible =
    canvas.selection?.kind === 'avatar'
      ? draft.avatar.visible
      : canvas.selection?.kind === 'text'
        ? draft.texts.find((t) => t.id === canvas.selection?.id)?.visible
        : true;

  const applyHistoryPresent = useCallback(
    (present: WelcomeImageDraft) => {
      onChange({
        avatar: present.avatar,
        texts: present.texts,
        text: textLayerToLegacy(present.texts[0]),
        background: present.background,
        overlay: present.overlay,
        caption: present.caption,
      });
    },
    [onChange],
  );

  const undo = useCallback(() => {
    setHistory((h) => {
      const next = historyUndo(h);
      applyHistoryPresent(next.present);
      return next;
    });
  }, [applyHistoryPresent]);

  const redo = useCallback(() => {
    setHistory((h) => {
      const next = historyRedo(h);
      applyHistoryPresent(next.present);
      return next;
    });
  }, [applyHistoryPresent]);

  const resetEditor = useCallback(() => {
    if (!window.confirm(labels.confirmReset || 'Reset card layout?')) return;
    const texts = [createTextLayer({ id: 'txt_default', name: 'Welcome text' })];
    pushChange(
      {
        avatar: { ...DEFAULT_AVATAR },
        background: { ...DEFAULT_BACKGROUND },
        overlay: { ...DEFAULT_OVERLAY },
        texts,
        text: textLayerToLegacy(texts[0]),
      },
      true,
    );
  }, [labels.confirmReset, pushChange]);

  const deleteSelection = useCallback(() => {
    const sel = canvas.selection;
    if (!sel) return;
    if (sel.kind === 'avatar') {
      pushChange({ avatar: { ...draft.avatar, visible: false } }, true);
    } else {
      pushChange(
        { texts: draft.texts.filter((t) => t.id !== sel.id) },
        true,
      );
    }
    canvas.setSelection(null);
  }, [canvas, draft.avatar, draft.texts, pushChange]);

  const duplicateSelection = useCallback(() => {
    if (canvas.selection?.kind !== 'text') return;
    const src = draft.texts.find((t) => t.id === canvas.selection?.id);
    if (!src) return;
    const layer = createTextLayer({
      ...src,
      id: undefined,
      name: `${src.name} copy`,
      x: Math.min(95, src.x + 4),
      y: Math.min(95, src.y + 4),
    });
    pushChange({ texts: [...draft.texts, layer] }, true);
    requestAnimationFrame(() => canvas.selectById(layer.id));
  }, [canvas, draft.texts, pushChange]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!showImageTools) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const typing =
        tag === 'input' ||
        tag === 'textarea' ||
        target?.isContentEditable;

      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if (typing) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (canvas.selection) {
          e.preventDefault();
          deleteSelection();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showImageTools, undo, redo, canvas.selection, deleteSelection]);

  if (!showImageTools) return null;

  const tabLabel = (key: EditorTab) =>
    labels[`tab_${key}`] || key.charAt(0).toUpperCase() + key.slice(1);

  const layers = buildLayerList(draft);

  const emptyState = (
    <div className="welcome-empty-state">
      <ImagePlus size={32} className="text-primary" />
      <h3>{labels.emptyTitle || labels.uploadBg}</h3>
      <p>{labels.emptyBody || labels.uploadHint}</p>
      <BackgroundPanel
        botId={botId}
        hasBackground={false}
        background={draft.background}
        disabled={disabled}
        labels={labels}
        onChangeBackground={(patch) =>
          pushChange({ background: { ...draft.background, ...patch } }, true)
        }
        onUploaded={(settings) => {
          canvas.setLocalPreview(null);
          onUploaded(settings);
        }}
        onRemoved={(settings) => {
          canvas.setLocalPreview(null);
          onRemoved(settings);
        }}
        onLocalPreview={canvas.setLocalPreview}
        onError={onError}
        onResetBackground={() =>
          pushChange({ background: { ...DEFAULT_BACKGROUND } }, true)
        }
      />
    </div>
  );

  return (
    <div className="welcome-card-builder welcome-card-builder-v2">
      <CardPreview
        labels={labels}
        stageRef={canvas.stageRef}
        hostRef={canvas.hostRef}
        showCanvas={draft.hasBackground}
        emptyState={emptyState}
        ready={canvas.ready}
        bgLoading={canvas.bgLoading}
        selection={canvas.selection}
        zoom={canvas.zoom}
        canUndo={canUndo(history)}
        canRedo={canRedo(history)}
        onUndo={undo}
        onRedo={redo}
        onZoomIn={() => canvas.setZoom((z) => Math.min(2, Math.round((z + 0.1) * 10) / 10))}
        onZoomOut={() => canvas.setZoom((z) => Math.max(0.4, Math.round((z - 0.1) * 10) / 10))}
        onFit={() => {
          canvas.setZoom(1);
          requestAnimationFrame(() => canvas.fit());
        }}
        onCenter={canvas.centerSelection}
        onDelete={deleteSelection}
        onDuplicate={duplicateSelection}
        onBringForward={() => canvas.layerOrder('forward')}
        onSendBackward={() => canvas.layerOrder('backward')}
        onToggleLock={canvas.toggleLockSelection}
        onToggleVisible={canvas.toggleVisibleSelection}
        onReset={resetEditor}
        selectionLocked={selectionLocked}
        selectionVisible={selectionVisible}
      />

      <div className="welcome-editor-tabs-wrap">
        <div className="welcome-editor-tabs" role="tablist">
          {TABS.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={`welcome-editor-tab ${tab === key ? 'is-active' : ''}`}
              onClick={() => setTab(key)}
            >
              {tabLabel(key)}
            </button>
          ))}
        </div>

        <div className="welcome-editor-tab-panel" role="tabpanel">
          {tab === 'background' ? (
            <BackgroundPanel
              botId={botId}
              hasBackground={draft.hasBackground}
              background={draft.background}
              disabled={disabled}
              labels={labels}
              onChangeBackground={(patch) =>
                pushChange(
                  { background: { ...draft.background, ...patch } },
                  true,
                )
              }
              onUploaded={(settings) => {
                canvas.setLocalPreview(null);
                onUploaded(settings);
              }}
              onRemoved={(settings) => {
                canvas.setLocalPreview(null);
                onRemoved(settings);
              }}
              onLocalPreview={canvas.setLocalPreview}
              onError={onError}
              onResetBackground={() =>
                pushChange({ background: { ...DEFAULT_BACKGROUND } }, true)
              }
            />
          ) : null}

          {tab === 'avatar' ? (
            <AvatarPanel
              avatar={draft.avatar}
              disabled={disabled}
              labels={labels}
              onChange={(patch) =>
                pushChange({ avatar: { ...draft.avatar, ...patch } }, true)
              }
            />
          ) : null}

          {tab === 'text' ? (
            <TextPanel
              texts={draft.texts}
              selectedTextId={selectedTextId}
              disabled={disabled}
              labels={labels}
              onSelect={(id) => {
                canvas.selectById(id);
                canvas.setSelection({ kind: 'text', id });
              }}
              onAdd={() => {
                const layer = createTextLayer({
                  name: `Text ${draft.texts.length + 1}`,
                  y: Math.min(90, 70 + draft.texts.length * 6),
                });
                pushChange({ texts: [...draft.texts, layer] }, true);
                requestAnimationFrame(() => canvas.selectById(layer.id));
              }}
              onChange={(id, patch) =>
                pushChange(
                  { texts: patchTextLayer(draft.texts, id, patch) },
                  true,
                )
              }
              onDelete={(id) => {
                pushChange(
                  { texts: draft.texts.filter((t) => t.id !== id) },
                  true,
                );
                if (selectedTextId === id) canvas.setSelection(null);
              }}
            />
          ) : null}

          {tab === 'effects' ? (
            <EffectsPanel
              avatar={draft.avatar}
              texts={draft.texts}
              selectedTextId={selectedTextId}
              overlay={draft.overlay}
              disabled={disabled}
              labels={labels}
              onAvatarChange={(patch) =>
                pushChange({ avatar: { ...draft.avatar, ...patch } }, true)
              }
              onTextChange={(id, patch) =>
                pushChange(
                  { texts: patchTextLayer(draft.texts, id, patch) },
                  true,
                )
              }
              onOverlayChange={(patch) =>
                pushChange({ overlay: { ...draft.overlay, ...patch } }, true)
              }
            />
          ) : null}

          {tab === 'layers' ? (
            <LayersPanel
              layers={layers}
              selectedId={canvas.selection?.id || null}
              disabled={disabled}
              labels={labels}
              onSelect={(id, kind) => {
                if (kind === 'background') return;
                canvas.selectById(id);
                if (kind === 'avatar')
                  canvas.setSelection({ kind: 'avatar', id: AVATAR_ID });
                else canvas.setSelection({ kind: 'text', id });
                if (kind === 'text') setTab('text');
                if (kind === 'avatar') setTab('avatar');
              }}
              onToggleVisible={(id, kind) => {
                if (kind === 'avatar') {
                  pushChange(
                    {
                      avatar: {
                        ...draft.avatar,
                        visible: draft.avatar.visible === false,
                      },
                    },
                    true,
                  );
                } else if (kind === 'text') {
                  const layer = draft.texts.find((t) => t.id === id);
                  if (!layer) return;
                  pushChange(
                    {
                      texts: patchTextLayer(draft.texts, id, {
                        visible: layer.visible === false,
                      }),
                    },
                    true,
                  );
                }
              }}
              onToggleLock={(id, kind) => {
                if (kind === 'avatar') {
                  pushChange(
                    { avatar: { ...draft.avatar, locked: !draft.avatar.locked } },
                    true,
                  );
                } else if (kind === 'text') {
                  const layer = draft.texts.find((t) => t.id === id);
                  if (!layer) return;
                  pushChange(
                    {
                      texts: patchTextLayer(draft.texts, id, {
                        locked: !layer.locked,
                      }),
                    },
                    true,
                  );
                }
              }}
              onMove={(id, dir) => {
                const idx = draft.texts.findIndex((t) => t.id === id);
                if (idx < 0) return;
                // layers list is reverse visual order for texts at top
                const texts = [...draft.texts];
                const visualIndexFromTop = texts.length - 1 - idx;
                const nextVisual =
                  dir === 'up' ? visualIndexFromTop - 1 : visualIndexFromTop + 1;
                if (nextVisual < 0 || nextVisual >= texts.length) return;
                const targetIdx = texts.length - 1 - nextVisual;
                [texts[idx], texts[targetIdx]] = [texts[targetIdx], texts[idx]];
                pushChange({ texts }, true);
              }}
            />
          ) : null}

          {tab === 'advanced' ? (
            <AdvancedPanel
              caption={draft.caption}
              disabled={disabled}
              labels={labels}
              onCaptionChange={(caption) => pushChange({ caption }, true)}
              onResetAll={resetEditor}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
