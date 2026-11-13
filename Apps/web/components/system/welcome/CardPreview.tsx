'use client';

import type { ReactNode, RefObject } from 'react';
import {
  BringToFront,
  Copy,
  Crosshair,
  Eye,
  EyeOff,
  Lock,
  Maximize2,
  Redo2,
  RotateCcw,
  SendToBack,
  Trash2,
  Undo2,
  Unlock,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { EditorSelection } from './editor/types';

type Props = {
  labels: Record<string, string>;
  stageRef: RefObject<HTMLDivElement | null>;
  hostRef: RefObject<HTMLDivElement | null>;
  showCanvas: boolean;
  emptyState: ReactNode;
  ready: boolean;
  bgLoading?: boolean;
  selection: EditorSelection;
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onCenter: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onToggleLock: () => void;
  onToggleVisible: () => void;
  onReset: () => void;
  selectionLocked?: boolean;
  selectionVisible?: boolean;
};

export default function CardPreview({
  labels,
  stageRef,
  hostRef,
  showCanvas,
  emptyState,
  ready,
  bgLoading,
  selection,
  zoom,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onFit,
  onCenter,
  onDelete,
  onDuplicate,
  onBringForward,
  onSendBackward,
  onToggleLock,
  onToggleVisible,
  onReset,
  selectionLocked,
  selectionVisible,
}: Props) {
  const hasSelection = Boolean(selection);
  const zoomPct = Math.round(zoom * 100);

  return (
    <div className="welcome-preview-shell">
      <div className="welcome-preview-toolbar">
        <div className="welcome-preview-toolbar-group">
          <button
            type="button"
            className="welcome-toolbar-btn"
            disabled={!canUndo}
            title={labels.undo}
            onClick={onUndo}
          >
            <Undo2 size={14} />
            <span>{labels.undo}</span>
          </button>
          <button
            type="button"
            className="welcome-toolbar-btn"
            disabled={!canRedo}
            title={labels.redo}
            onClick={onRedo}
          >
            <Redo2 size={14} />
            <span>{labels.redo}</span>
          </button>
          <button
            type="button"
            className="welcome-toolbar-btn"
            title={labels.resetAll}
            onClick={onReset}
          >
            <RotateCcw size={14} />
            <span>{labels.reset}</span>
          </button>
        </div>

        <div className="welcome-preview-toolbar-group">
          <button
            type="button"
            className="welcome-toolbar-btn"
            title={labels.zoomOut}
            onClick={onZoomOut}
          >
            <ZoomOut size={14} />
          </button>
          <span className="welcome-zoom-label">{zoomPct}%</span>
          <button
            type="button"
            className="welcome-toolbar-btn"
            title={labels.zoomIn}
            onClick={onZoomIn}
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            className="welcome-toolbar-btn"
            title={labels.fitPreview}
            onClick={onFit}
          >
            <Maximize2 size={14} />
            <span>{labels.fit}</span>
          </button>
          <button
            type="button"
            className="welcome-toolbar-btn"
            disabled={!hasSelection}
            title={labels.centerObject}
            onClick={onCenter}
          >
            <Crosshair size={14} />
            <span>{labels.center}</span>
          </button>
        </div>

        <div className="welcome-preview-toolbar-group">
          <button
            type="button"
            className="welcome-toolbar-btn"
            disabled={!hasSelection || selection?.kind !== 'text'}
            title={labels.duplicate}
            onClick={onDuplicate}
          >
            <Copy size={14} />
          </button>
          <button
            type="button"
            className="welcome-toolbar-btn"
            disabled={!hasSelection}
            title={labels.bringForward}
            onClick={onBringForward}
          >
            <BringToFront size={14} />
          </button>
          <button
            type="button"
            className="welcome-toolbar-btn"
            disabled={!hasSelection}
            title={labels.sendBackward}
            onClick={onSendBackward}
          >
            <SendToBack size={14} />
          </button>
          <button
            type="button"
            className="welcome-toolbar-btn"
            disabled={!hasSelection}
            title={labels.lock}
            onClick={onToggleLock}
          >
            {selectionLocked ? <Lock size={14} /> : <Unlock size={14} />}
          </button>
          <button
            type="button"
            className="welcome-toolbar-btn"
            disabled={!hasSelection}
            title={labels.visibility}
            onClick={onToggleVisible}
          >
            {selectionVisible === false ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button
            type="button"
            className="welcome-toolbar-btn is-danger"
            disabled={!hasSelection}
            title={labels.delete}
            onClick={onDelete}
          >
            <Trash2 size={14} />
            <span>{labels.delete}</span>
          </button>
        </div>
      </div>

      <div className="welcome-preview-stage-wrap">
        <div
          ref={stageRef}
          className="welcome-fabric-stage welcome-canvas-workspace welcome-canvas-workspace-lg"
          style={{ display: showCanvas ? undefined : 'none' }}
          aria-hidden={!showCanvas}
        >
          {/* Fabric owns the canvas node inside this host — do not put <canvas> under React */}
          <div ref={hostRef} className="welcome-fabric-host" />
          {showCanvas && (bgLoading || !ready) ? (
            <div className="welcome-canvas-loading">{labels.loadingPreview}</div>
          ) : null}
        </div>
        {!showCanvas ? (
          <div className="welcome-preview-empty">{emptyState}</div>
        ) : null}
      </div>

      {showCanvas ? (
        <p className="welcome-canvas-hint">{labels.dragHint}</p>
      ) : null}
      <p className="welcome-canvas-hint-sub">{labels.previewHint}</p>
    </div>
  );
}
