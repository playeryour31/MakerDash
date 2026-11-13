'use client';

import { Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import type { LayerListItem } from '../editor/types';

type Props = {
  layers: LayerListItem[];
  selectedId: string | null;
  disabled?: boolean;
  labels: Record<string, string>;
  onSelect: (id: string, kind: LayerListItem['kind']) => void;
  onToggleVisible: (id: string, kind: LayerListItem['kind']) => void;
  onToggleLock: (id: string, kind: LayerListItem['kind']) => void;
  onMove: (id: string, dir: 'up' | 'down') => void;
};

export default function LayersPanel({
  layers,
  selectedId,
  disabled,
  labels,
  onSelect,
  onToggleVisible,
  onToggleLock,
  onMove,
}: Props) {
  return (
    <div className="welcome-panel">
      <p className="welcome-field-label mb-2">{labels.layersTitle}</p>
      <ul className="welcome-layers-list">
        {layers.map((layer, index) => (
          <li
            key={layer.id}
            className={`welcome-layer-row ${selectedId === layer.id ? 'is-active' : ''}`}
          >
            <button
              type="button"
              className="welcome-layer-select"
              disabled={disabled || layer.kind === 'background'}
              onClick={() => onSelect(layer.id, layer.kind)}
            >
              <span className="welcome-layer-kind">{layer.kind}</span>
              <span className="welcome-layer-name">{layer.name}</span>
            </button>
            <div className="welcome-layer-actions">
              {layer.kind === 'text' ? (
                <>
                  <button
                    type="button"
                    className="welcome-toolbar-btn"
                    disabled={disabled || index === 0}
                    title={labels.bringForward}
                    onClick={() => onMove(layer.id, 'up')}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="welcome-toolbar-btn"
                    disabled={disabled || index >= layers.length - 3}
                    title={labels.sendBackward}
                    onClick={() => onMove(layer.id, 'down')}
                  >
                    ↓
                  </button>
                </>
              ) : null}
              {layer.kind !== 'background' ? (
                <>
                  <button
                    type="button"
                    className="welcome-toolbar-btn"
                    disabled={disabled}
                    title={labels.visibility}
                    onClick={() => onToggleVisible(layer.id, layer.kind)}
                  >
                    {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button
                    type="button"
                    className="welcome-toolbar-btn"
                    disabled={disabled}
                    title={labels.lock}
                    onClick={() => onToggleLock(layer.id, layer.kind)}
                  >
                    {layer.locked ? <Lock size={14} /> : <Unlock size={14} />}
                  </button>
                </>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
