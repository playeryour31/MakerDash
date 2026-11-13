'use client';

import { useCallback, useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2, Upload } from 'lucide-react';
import { api } from '@/lib/api';

const MAX_BYTES = 10 * 1024 * 1024;

async function fileToDataUrl(file: File): Promise<string> {
  if (file.size > MAX_BYTES) throw new Error('MAX_SIZE');
  if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) throw new Error('BAD_TYPE');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('READ'));
    reader.readAsDataURL(file);
  });
}

type Labels = {
  uploadBg: string;
  changeBg: string;
  removeBg: string;
  uploadHint: string;
  uploading: string;
  dropHint: string;
};

type Props = {
  botId: string;
  hasBackground: boolean;
  disabled?: boolean;
  labels: Labels;
  onUploaded: (settings: Record<string, unknown>) => void;
  onRemoved: (settings: Record<string, unknown>) => void;
  onLocalPreview?: (dataUrl: string | null) => void;
  onError: (code: string) => void;
};

export default function BackgroundUploader({
  botId,
  hasBackground,
  disabled = false,
  labels,
  onUploaded,
  onRemoved,
  onLocalPreview,
  onError,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = useCallback(
    async (file: File | null) => {
      if (!file || disabled) return;
      setUploading(true);
      setProgress(12);
      try {
        const dataUrl = await fileToDataUrl(file);
        setProgress(40);
        onLocalPreview?.(dataUrl);
        const res = await api<{ settings: Record<string, unknown> }>(
          `/system/${botId}/features/welcome/background`,
          {
            method: 'POST',
            body: JSON.stringify({ dataUrl }),
          },
        );
        setProgress(100);
        onLocalPreview?.(null);
        onUploaded(res.settings || {});
      } catch (err: unknown) {
        onLocalPreview?.(null);
        const msg = String((err as Error)?.message || '');
        if (msg.includes('MAX_SIZE')) onError('MAX_SIZE');
        else if (msg.includes('BAD_TYPE')) onError('BAD_TYPE');
        else onError(msg || 'UPLOAD');
      } finally {
        setUploading(false);
        setProgress(0);
        if (fileRef.current) fileRef.current.value = '';
      }
    },
    [botId, disabled, onError, onLocalPreview, onUploaded],
  );

  async function removeBackground() {
    if (disabled) return;
    setUploading(true);
    try {
      const res = await api<{ settings: Record<string, unknown> }>(
        `/system/${botId}/features/welcome/background`,
        { method: 'DELETE' },
      );
      onLocalPreview?.(null);
      onRemoved(res.settings || {});
    } catch (err: unknown) {
      onError(String((err as Error)?.message || 'DELETE'));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="welcome-upload">
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => void uploadFile(e.target.files?.[0] || null)}
      />

      {!hasBackground ? (
        <button
          type="button"
          disabled={disabled || uploading}
          className={`welcome-upload-drop ${dragOver ? 'is-dragover' : ''}`}
          onClick={() => fileRef.current?.click()}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragOver(false);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void uploadFile(e.dataTransfer.files?.[0] || null);
          }}
        >
          {uploading ? (
            <Loader2 size={28} className="animate-spin text-primary" />
          ) : (
            <ImagePlus size={28} className="text-primary" />
          )}
          <span className="welcome-upload-title">{labels.uploadBg}</span>
          <span className="welcome-upload-hint">{labels.uploadHint}</span>
          <span className="welcome-upload-sub">{labels.dropHint}</span>
          {uploading && progress > 0 ? (
            <div className="welcome-upload-progress">
              <div style={{ width: `${progress}%` }} />
            </div>
          ) : null}
        </button>
      ) : (
        <div className="welcome-upload-actions">
          <button
            type="button"
            disabled={disabled || uploading}
            className="welcome-btn-secondary"
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Upload size={15} />
            )}
            {uploading ? labels.uploading : labels.changeBg}
          </button>
          <button
            type="button"
            disabled={disabled || uploading}
            className="welcome-btn-destructive"
            onClick={() => void removeBackground()}
          >
            <Trash2 size={15} />
            {labels.removeBg}
          </button>
        </div>
      )}
    </div>
  );
}
