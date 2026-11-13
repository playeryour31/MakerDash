'use client';

import { useRef } from 'react';
import { Plus } from 'lucide-react';
import UiSwitch from '@/components/UiSwitch';
import StyledSlider from '../StyledSlider';
import VariablePicker from '../VariablePicker';
import type { TextLayer } from '../types';

type Props = {
  texts: TextLayer[];
  selectedTextId: string | null;
  disabled?: boolean;
  labels: Record<string, string>;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onChange: (id: string, patch: Partial<TextLayer>) => void;
  onDelete: (id: string) => void;
};

export default function TextPanel({
  texts,
  selectedTextId,
  disabled,
  labels,
  onSelect,
  onAdd,
  onChange,
  onDelete,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = texts.find((t) => t.id === selectedTextId) || null;
  const alignOptions = [
    { value: 'left' as const, label: labels.alignLeft },
    { value: 'center' as const, label: labels.alignCenter },
    { value: 'right' as const, label: labels.alignRight },
  ];

  return (
    <div className="welcome-panel space-y-3">
      <div className="welcome-text-list">
        {texts.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`welcome-text-list-item ${selectedTextId === t.id ? 'is-active' : ''}`}
            onClick={() => onSelect(t.id)}
          >
            <span>{t.name}</span>
            <code>{t.content.slice(0, 28)}</code>
          </button>
        ))}
      </div>

      <button
        type="button"
        className="welcome-btn-secondary"
        disabled={disabled || texts.length >= 12}
        onClick={onAdd}
      >
        <Plus size={15} />
        {labels.addText}
      </button>

      {!selected ? (
        <div className="welcome-panel-empty">
          <p>{labels.selectTextOrAdd}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="welcome-field-label">{labels.layerName}</span>
            <input
              className="ui-input"
              value={selected.name}
              maxLength={60}
              disabled={disabled}
              onChange={(e) => onChange(selected.id, { name: e.target.value })}
            />
          </label>

          <VariablePicker
            labels={labels}
            targetRef={inputRef}
            value={selected.content}
            onChange={(content) => onChange(selected.id, { content })}
            compact
            maxVisible={5}
          />

          <input
            ref={inputRef}
            className="ui-input"
            value={selected.content}
            maxLength={200}
            disabled={disabled}
            placeholder="Welcome {username}!"
            onChange={(e) => onChange(selected.id, { content: e.target.value })}
          />

          <StyledSlider
            label={labels.textSize}
            value={Math.round(Number(selected.size || 4.5) * 10)}
            min={15}
            max={120}
            formatValue={(v) => `${(v / 10).toFixed(1)}%`}
            disabled={disabled}
            onChange={(v) => onChange(selected.id, { size: v / 10 })}
          />
          <StyledSlider
            label={labels.opacity}
            value={Math.round(selected.opacity ?? 100)}
            min={0}
            max={100}
            unit="%"
            disabled={disabled}
            onChange={(opacity) => onChange(selected.id, { opacity })}
          />
          <StyledSlider
            label={labels.rotation}
            value={Math.round(selected.rotation ?? 0)}
            min={-180}
            max={180}
            unit="°"
            disabled={disabled}
            onChange={(rotation) => onChange(selected.id, { rotation })}
          />

          <label className="welcome-color-field">
            <span>{labels.textColor}</span>
            <input
              type="color"
              disabled={disabled}
              value={selected.color || '#ffffff'}
              onChange={(e) => onChange(selected.id, { color: e.target.value })}
            />
          </label>

          <div className="welcome-align-row">
            <span className="welcome-align-label">{labels.textAlign}</span>
            <div className="welcome-align-btns">
              {alignOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={disabled}
                  className={`welcome-align-btn ${
                    (selected.align || 'center') === opt.value ? 'is-active' : ''
                  }`}
                  onClick={() => onChange(selected.id, { align: opt.value })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <label className="block text-sm">
            <span className="welcome-field-label">{labels.fontFamily}</span>
            <select
              className="ui-input"
              value={selected.fontFamily || 'Segoe UI'}
              disabled={disabled}
              onChange={(e) =>
                onChange(selected.id, { fontFamily: e.target.value })
              }
            >
              <option value="Segoe UI">Segoe UI</option>
              <option value="Arial">Arial</option>
              <option value="Georgia">Georgia</option>
              <option value="Verdana">Verdana</option>
              <option value="Tahoma">Tahoma</option>
              <option value="Times New Roman">Times New Roman</option>
            </select>
          </label>

          <div className="welcome-toggle-row">
            <UiSwitch
              checked={selected.fontWeight !== 'normal'}
              onCheckedChange={(bold) =>
                onChange(selected.id, {
                  fontWeight: bold ? 'bold' : 'normal',
                })
              }
              disabled={disabled}
              size="sm"
            />
            <span>{labels.textBold}</span>
          </div>
          <div className="welcome-toggle-row">
            <UiSwitch
              checked={selected.shadow !== false}
              onCheckedChange={(shadow) => onChange(selected.id, { shadow })}
              disabled={disabled}
              size="sm"
            />
            <span>{labels.textShadow}</span>
          </div>
          <div className="welcome-toggle-row">
            <UiSwitch
              checked={selected.visible !== false}
              onCheckedChange={(visible) => onChange(selected.id, { visible })}
              disabled={disabled}
              size="sm"
            />
            <span>{labels.visibility}</span>
          </div>
          <div className="welcome-toggle-row">
            <UiSwitch
              checked={selected.locked === true}
              onCheckedChange={(locked) => onChange(selected.id, { locked })}
              disabled={disabled}
              size="sm"
            />
            <span>{labels.lock}</span>
          </div>

          <button
            type="button"
            className="welcome-btn-destructive"
            disabled={disabled}
            onClick={() => onDelete(selected.id)}
          >
            {labels.deleteText}
          </button>
        </div>
      )}
    </div>
  );
}
