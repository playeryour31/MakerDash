'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Eye, Plus, Trash2 } from 'lucide-react';
import DiscordEmbedPreview, {
  EMPTY_EMBED,
  type EmbedDraft,
  type EmbedField,
} from './DiscordEmbedPreview';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n/I18nProvider';

export type QuestionDraft = {
  id: string;
  label: string;
  style: 'short' | 'paragraph';
  required: boolean;
  placeholder: string;
  minLength: string;
  maxLength: string;
};

export type ButtonColor = 'Primary' | 'Secondary' | 'Success' | 'Danger';

export type PanelFormState = {
  applicationChannel: string;
  requestsChannel: string;
  applicationRole: string;
  messageType: 'embed' | 'message';
  buttonLabel: string;
  buttonEmoji: string;
  buttonColor: ButtonColor;
  questions: QuestionDraft[];
  embed: EmbedDraft;
};

const MAX_QUESTIONS = 15;

export function emptyQuestion(partial?: Partial<QuestionDraft>): QuestionDraft {
  return {
    id: `q_${Math.random().toString(36).slice(2, 9)}`,
    label: '',
    style: 'short',
    required: true,
    placeholder: '',
    minLength: '',
    maxLength: '',
    ...partial,
  };
}

export const EMPTY_PANEL_FORM: PanelFormState = {
  applicationChannel: '',
  requestsChannel: '',
  applicationRole: '',
  messageType: 'embed',
  buttonLabel: 'تقديم',
  buttonEmoji: '',
  buttonColor: 'Primary',
  questions: [emptyQuestion()],
  embed: { ...EMPTY_EMBED },
};

type GuildOptions = {
  guildId: string;
  guildName: string | null;
  guildIcon: string | null;
  channels: Array<{ id: string; name: string; type: number }>;
  roles: Array<{ id: string; name: string; color: number }>;
};

type Props = {
  mode: 'create' | 'edit';
  botId: string;
  initial?: Partial<PanelFormState>;
  guildId: string;
  serverName?: string;
  submitting?: boolean;
  onSubmit: (form: PanelFormState) => Promise<void> | void;
  onCancel?: () => void;
};

export default function ApplyPanelEditor({
  mode,
  botId,
  initial,
  guildId,
  serverName,
  submitting,
  onSubmit,
  onCancel,
}: Props) {
  const { t } = useI18n();
  const [form, setForm] = useState<PanelFormState>(() => ({
    ...EMPTY_PANEL_FORM,
    ...initial,
    buttonLabel: initial?.buttonLabel ?? t.panelEditor.defaultButtonLabel,
    embed: { ...EMPTY_EMBED, ...(initial?.embed || {}) },
    questions:
      initial?.questions?.length
        ? initial.questions.map((q) => emptyQuestion(q))
        : [emptyQuestion()],
  }));
  const [guildOpts, setGuildOpts] = useState<GuildOptions | null>(null);
  const [optsError, setOptsError] = useState('');
  const [optsLoading, setOptsLoading] = useState(false);

  useEffect(() => {
    if (!botId || !guildId) {
      setGuildOpts(null);
      return;
    }
    let cancelled = false;
    setOptsLoading(true);
    setOptsError('');
    api<GuildOptions>(
      `/apply/${botId}/guild-options?guildId=${encodeURIComponent(guildId)}`,
    )
      .then((data) => {
        if (!cancelled) setGuildOpts(data);
      })
      .catch(() => {
        if (!cancelled) {
          setGuildOpts(null);
          setOptsError(t.panelEditor.optsError);
        }
      })
      .finally(() => {
        if (!cancelled) setOptsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [botId, guildId, t.panelEditor.optsError]);

  const patch = (partial: Partial<PanelFormState>) =>
    setForm((prev) => ({ ...prev, ...partial }));

  const patchEmbed = (partial: Partial<EmbedDraft>) =>
    setForm((prev) => ({
      ...prev,
      embed: { ...prev.embed, ...partial },
    }));

  const patchQuestion = (index: number, partial: Partial<QuestionDraft>) => {
    setForm((prev) => {
      const next = [...prev.questions];
      next[index] = { ...next[index], ...partial };
      return { ...prev, questions: next };
    });
  };

  const setField = (index: number, partial: Partial<EmbedField>) => {
    setForm((prev) => {
      const fields = [...prev.embed.fields];
      fields[index] = { ...fields[index], ...partial };
      return { ...prev, embed: { ...prev.embed, fields } };
    });
  };

  const previewEmbed = useMemo(() => form.embed, [form.embed]);
  const displayServerName =
    guildOpts?.guildName || serverName || t.panelEditor.defaultServerName;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!guildId) return;
    if (!form.questions.some((q) => q.label.trim())) return;
    await onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          {optsLoading ? (
            <p className="text-xs text-muted-foreground">
              {t.panelEditor.loadingOpts}
            </p>
          ) : null}
          {optsError ? (
            <p className="text-xs text-amber-400">{optsError}</p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <DiscordIdSelect
              label={t.panelEditor.panelChannel}
              value={form.applicationChannel}
              onChange={(v) => patch({ applicationChannel: v })}
              options={(guildOpts?.channels || []).map((c) => ({
                id: c.id,
                label: `#${c.name}`,
              }))}
              required={mode === 'create'}
              disabled={mode === 'edit'}
              placeholder={t.panelEditor.pickChannel}
            />
            <DiscordIdSelect
              label={t.panelEditor.requestsChannel}
              value={form.requestsChannel}
              onChange={(v) => patch({ requestsChannel: v })}
              options={(guildOpts?.channels || []).map((c) => ({
                id: c.id,
                label: `#${c.name}`,
              }))}
              required
              placeholder={t.panelEditor.pickChannel}
            />
            <DiscordIdSelect
              label={t.panelEditor.acceptRole}
              value={form.applicationRole}
              onChange={(v) => patch({ applicationRole: v })}
              options={(guildOpts?.roles || []).map((r) => ({
                id: r.id,
                label: `@${r.name}`,
              }))}
              required
              placeholder={t.panelEditor.pickRole}
            />
            <label className="block text-sm">
              <span className="text-muted-foreground">{t.panelEditor.messageType}</span>
              <select
                className="field-input mt-1.5"
                value={form.messageType}
                onChange={(e) =>
                  patch({
                    messageType: e.target.value as 'embed' | 'message',
                  })
                }
              >
                <option value="embed">{t.panelEditor.typeEmbed}</option>
                <option value="message">{t.panelEditor.typeMessage}</option>
              </select>
            </label>
            <Field
              label={t.panelEditor.buttonLabel}
              value={form.buttonLabel}
              onChange={(v) => patch({ buttonLabel: v })}
            />
            <label className="block text-sm">
              <span className="text-muted-foreground">{t.panelEditor.buttonColor}</span>
              <select
                className="field-input mt-1.5"
                value={form.buttonColor}
                onChange={(e) =>
                  patch({ buttonColor: e.target.value as ButtonColor })
                }
              >
                <option value="Primary">{t.panelEditor.colorPrimary}</option>
                <option value="Secondary">{t.panelEditor.colorSecondary}</option>
                <option value="Success">{t.panelEditor.colorSuccess}</option>
                <option value="Danger">{t.panelEditor.colorDanger}</option>
              </select>
            </label>
            <Field
              label={t.panelEditor.buttonEmoji}
              value={form.buttonEmoji}
              onChange={(v) => patch({ buttonEmoji: v })}
              placeholder={t.panelEditor.buttonEmojiHint}
            />
          </div>

          {form.messageType === 'embed' ? (
            <div className="space-y-3 rounded-xl border border-border/80 bg-secondary/40 p-4">
              <p className="text-sm font-semibold text-foreground">
                {t.panelEditor.embedSettings}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label={t.panelEditor.embedTitle}
                  value={form.embed.title}
                  onChange={(v) => patchEmbed({ title: v })}
                />
                <label className="block text-sm">
                  <span className="text-muted-foreground">{t.panelEditor.color}</span>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      type="color"
                      className="h-10 w-12 cursor-pointer rounded-lg border border-border bg-transparent"
                      value={
                        /^#[0-9a-fA-F]{6}$/.test(form.embed.color)
                          ? form.embed.color
                          : '#5865F2'
                      }
                      onChange={(e) => patchEmbed({ color: e.target.value })}
                    />
                    <input
                      className="field-input flex-1 font-mono"
                      value={form.embed.color}
                      onChange={(e) => patchEmbed({ color: e.target.value })}
                      placeholder="#5865F2"
                    />
                  </div>
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="text-muted-foreground">{t.panelEditor.description}</span>
                  <textarea
                    className="field-input mt-1.5 min-h-[110px]"
                    value={form.embed.description}
                    onChange={(e) =>
                      patchEmbed({ description: e.target.value })
                    }
                    placeholder={t.panelEditor.messageBody}
                  />
                </label>
                <Field
                  label={t.panelEditor.authorName}
                  value={form.embed.authorName}
                  onChange={(v) => patchEmbed({ authorName: v })}
                  placeholder={t.panelEditor.authorHint}
                />
                <Field
                  label={t.panelEditor.authorIcon}
                  value={form.embed.authorIconUrl}
                  onChange={(v) => patchEmbed({ authorIconUrl: v })}
                />
                <Field
                  label={t.panelEditor.footerText}
                  value={form.embed.footerText}
                  onChange={(v) => patchEmbed({ footerText: v })}
                />
                <Field
                  label={t.panelEditor.footerIcon}
                  value={form.embed.footerIconUrl}
                  onChange={(v) => patchEmbed({ footerIconUrl: v })}
                />
                <Field
                  label={t.panelEditor.thumbnail}
                  value={form.embed.thumbnailUrl}
                  onChange={(v) => patchEmbed({ thumbnailUrl: v })}
                />
                <Field
                  label={t.panelEditor.image}
                  value={form.embed.imageUrl}
                  onChange={(v) => patchEmbed({ imageUrl: v })}
                />
              </div>

              <div className="flex flex-wrap gap-4 pt-1 text-sm">
                <label className="inline-flex items-center gap-2 text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={form.embed.useServerBranding}
                    onChange={(e) =>
                      patchEmbed({ useServerBranding: e.target.checked })
                    }
                    className="rounded border-border"
                  />
                  {t.panelEditor.useServerBranding}
                </label>
                <label className="inline-flex items-center gap-2 text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={form.embed.timestamp}
                    onChange={(e) =>
                      patchEmbed({ timestamp: e.target.checked })
                    }
                    className="rounded border-border"
                  />
                  {t.panelEditor.showTimestamp}
                </label>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{t.panelEditor.extraFields}</p>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted"
                    onClick={() =>
                      patchEmbed({
                        fields: [
                          ...form.embed.fields,
                          { name: '', value: '', inline: true },
                        ],
                      })
                    }
                    disabled={form.embed.fields.length >= 6}
                  >
                    <Plus size={13} />
                    {t.panelEditor.add}
                  </button>
                </div>
                {form.embed.fields.map((field, i) => (
                  <div
                    key={i}
                    className="grid gap-2 rounded-lg border border-border/70 p-3 sm:grid-cols-[1fr_1fr_auto_auto]"
                  >
                    <input
                      className="field-input"
                      placeholder={t.panelEditor.fieldName}
                      value={field.name}
                      onChange={(e) => setField(i, { name: e.target.value })}
                    />
                    <input
                      className="field-input"
                      placeholder={t.panelEditor.fieldValue}
                      value={field.value}
                      onChange={(e) => setField(i, { value: e.target.value })}
                    />
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={Boolean(field.inline)}
                        onChange={(e) =>
                          setField(i, { inline: e.target.checked })
                        }
                      />
                      {t.panelEditor.inline}
                    </label>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
                      onClick={() =>
                        patchEmbed({
                          fields: form.embed.fields.filter((_, idx) => idx !== i),
                        })
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <label className="block text-sm">
              <span className="text-muted-foreground">{t.panelEditor.plainMessage}</span>
              <textarea
                className="field-input mt-1.5 min-h-[110px]"
                value={form.embed.description}
                onChange={(e) => patchEmbed({ description: e.target.value })}
              />
            </label>
          )}

          <div className="space-y-3 rounded-xl border border-border/80 bg-secondary/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {t.panelEditor.modalQuestions}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {t.panelEditor.modalQuestionsHint.replace(
                    '{MAX_QUESTIONS}',
                    String(MAX_QUESTIONS),
                  )}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
                disabled={form.questions.length >= MAX_QUESTIONS}
                onClick={() =>
                  patch({ questions: [...form.questions, emptyQuestion()] })
                }
              >
                <Plus size={13} />
                {t.panelEditor.addQuestion}
              </button>
            </div>

            <div className="space-y-3">
              {form.questions.map((q, i) => {
                const hardMax = q.style === 'paragraph' ? 4000 : 400;
                return (
                  <div
                    key={q.id}
                    className="space-y-2 rounded-xl border border-border/70 bg-card/60 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-primary">
                        {t.panelEditor.questionN.replace('{n}', String(i + 1))}
                        {i >= 5 ? (
                          <span className="ms-2 text-[10px] font-normal text-muted-foreground">
                            {t.panelEditor.pageN.replace(
                              '{n}',
                              String(Math.floor(i / 5) + 1),
                            )}
                          </span>
                        ) : null}
                      </p>
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-40"
                        disabled={form.questions.length <= 1}
                        onClick={() =>
                          patch({
                            questions: form.questions.filter((_, idx) => idx !== i),
                          })
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <Field
                      label={t.panelEditor.questionLabel}
                      value={q.label}
                      onChange={(v) =>
                        patchQuestion(i, { label: v.slice(0, 45) })
                      }
                      required={i === 0}
                      placeholder={t.panelEditor.questionPlaceholder}
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="block text-sm">
                        <span className="text-muted-foreground">
                          {t.panelEditor.answerLength}
                        </span>
                        <select
                          className="field-input mt-1.5"
                          value={q.style}
                          onChange={(e) =>
                            patchQuestion(i, {
                              style: e.target.value as 'short' | 'paragraph',
                            })
                          }
                        >
                          <option value="short">{t.panelEditor.styleShortFull}</option>
                          <option value="paragraph">
                            {t.panelEditor.styleParagraphFull}
                          </option>
                        </select>
                      </label>
                      <Field
                        label={t.panelEditor.placeholderOptional}
                        value={q.placeholder}
                        onChange={(v) =>
                          patchQuestion(i, {
                            placeholder: v.slice(0, 100),
                          })
                        }
                        placeholder={t.panelEditor.placeholderHint}
                      />
                      <Field
                        label={t.panelEditor.minCharsLabel.replace(
                          '{max}',
                          String(hardMax),
                        )}
                        value={q.minLength}
                        onChange={(v) =>
                          patchQuestion(i, {
                            minLength: v.replace(/\D/g, ''),
                          })
                        }
                        placeholder={t.panelEditor.optionalPlaceholder}
                      />
                      <Field
                        label={t.panelEditor.maxCharsLabel.replace(
                          '{max}',
                          String(hardMax),
                        )}
                        value={q.maxLength}
                        onChange={(v) =>
                          patchQuestion(i, {
                            maxLength: v.replace(/\D/g, ''),
                          })
                        }
                        placeholder={String(hardMax)}
                      />
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={q.required}
                        onChange={(e) =>
                          patchQuestion(i, { required: e.target.checked })
                        }
                      />
                      {t.panelEditor.questionRequired}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <div className="mb-2.5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
            <Eye size={15} />
            {t.panelEditor.livePreview}
          </div>
          <DiscordEmbedPreview
            embed={previewEmbed}
            messageType={form.messageType}
            buttonLabel={form.buttonLabel}
            buttonEmoji={form.buttonEmoji}
            buttonColor={form.buttonColor}
            serverName={displayServerName}
            serverIconUrl={guildOpts?.guildIcon || null}
          />
          <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground">
            {t.panelEditor.previewHint}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={submitting || !guildId}
          className="rounded-xl bg-gradient-to-r from-primary to-brand-soft px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition enabled:active:translate-y-px disabled:opacity-50"
        >
          {submitting
            ? t.panelEditor.submitting
            : mode === 'create'
              ? t.panelEditor.createSubmit
              : t.panelEditor.editSubmit}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-border bg-muted px-4 py-2.5 text-sm font-semibold"
          >
            {t.panelEditor.cancel}
          </button>
        ) : null}
        {!guildId ? (
          <p className="self-center text-xs text-destructive">
            {t.panelEditor.needGuildId}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function DiscordIdSelect({
  label,
  value,
  onChange,
  options,
  required,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ id: string; label: string }>;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  const { t } = useI18n();
  const known = options.some((o) => o.id === value);
  return (
    <label className="block text-sm">
      <span className="text-muted-foreground">{label}</span>
      <select
        className="field-input mt-1.5"
        value={known ? value : value ? `__custom__` : ''}
        onChange={(e) => {
          if (e.target.value === '__custom__') return;
          onChange(e.target.value);
        }}
        required={required}
        disabled={disabled}
      >
        <option value="">{placeholder || t.panelEditor.pickOption}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
        {value && !known ? (
          <option value="__custom__">
            {t.panelEditor.currentId.replace('{id}', value)}
          </option>
        ) : null}
      </select>
      {!options.length ? (
        <input
          className="field-input mt-1.5 font-mono text-xs"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t.panelEditor.pasteId}
          disabled={disabled}
        />
      ) : null}
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input
        className="field-input mt-1.5"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
      />
    </label>
  );
}
