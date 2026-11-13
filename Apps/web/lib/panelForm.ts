import type { PanelFormState } from '@/components/apply/ApplyPanelEditor';
import { EMPTY_PANEL_FORM, emptyQuestion } from '@/components/apply/ApplyPanelEditor';
import { EMPTY_EMBED } from '@/components/apply/DiscordEmbedPreview';
import type { BotPanel, PanelQuestion } from '@/lib/botTypes';

export function questionsToApi(form: PanelFormState): PanelQuestion[] {
  return form.questions
    .filter((q) => q.label.trim())
    .map((q) => ({
      id: q.id,
      label: q.label.trim(),
      style: q.style,
      required: q.required,
      placeholder: q.placeholder.trim() || undefined,
      minLength: q.minLength ? Number(q.minLength) : null,
      maxLength: q.maxLength ? Number(q.maxLength) : null,
    }));
}

export function panelToForm(panel: BotPanel): PanelFormState {
  const fromList =
    Array.isArray(panel.questions) && panel.questions.length
      ? panel.questions
      : [panel.ask1, panel.ask2, panel.ask3, panel.ask4, panel.ask5]
          .filter(Boolean)
          .map((label) => ({ label: String(label) }));

  return {
    ...EMPTY_PANEL_FORM,
    applicationChannel: panel.channel || '',
    requestsChannel: panel.requestsChannel || '',
    applicationRole: panel.applicationRole || '',
    messageType: (panel.messageType as 'embed' | 'message') || 'embed',
    buttonLabel: panel.buttonLabel || 'تقديم',
    buttonEmoji: panel.buttonEmoji || '',
    buttonColor: (panel.buttonColor as PanelFormState['buttonColor']) || 'Primary',
    questions: fromList.length
      ? fromList.map((q: { id?: string; label?: string; style?: string; required?: boolean; placeholder?: string; minLength?: number | string | null; maxLength?: number | string | null }) =>
          emptyQuestion({
            id: q.id,
            label: q.label || '',
            style: q.style === 'paragraph' ? 'paragraph' : 'short',
            required: q.required !== false,
            placeholder: q.placeholder || '',
            minLength:
              q.minLength != null && q.minLength !== ''
                ? String(q.minLength)
                : '',
            maxLength:
              q.maxLength != null && q.maxLength !== ''
                ? String(q.maxLength)
                : '',
          }),
        )
      : [emptyQuestion()],
    embed: {
      ...EMPTY_EMBED,
      ...(panel.embed || {}),
      description: panel.embed?.description || panel.message || '',
      color: panel.embed?.color || '#5865F2',
      useServerBranding: panel.embed?.useServerBranding !== false,
      fields: panel.embed?.fields || [],
    },
  };
}
