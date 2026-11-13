/**
 * Normalize Apply questions (shared logic with Maker/Utils/applyQuestions.js).
 */

export type ApplyQuestion = {
  id: string;
  label: string;
  style: 'short' | 'paragraph';
  required: boolean;
  placeholder: string;
  minLength: number | null;
  maxLength: number | null;
};

const LABEL_MAX = 45;
const PLACEHOLDER_MAX = 100;
const MAX_QUESTIONS = 15;

export function normalizeQuestions(raw: any[]): ApplyQuestion[] {
  if (!Array.isArray(raw)) return [];
  const out: ApplyQuestion[] = [];
  for (const item of raw) {
    if (item == null || item === '') continue;
    if (typeof item === 'string') {
      const label = String(item).trim();
      if (!label) continue;
      out.push({
        id: `ask${out.length + 1}`,
        label: label.slice(0, LABEL_MAX),
        style: 'short',
        required: true,
        placeholder: '',
        minLength: null,
        maxLength: null,
      });
      continue;
    }
    if (typeof item === 'object') {
      const label = String(item.label || item.qes || item.text || '').trim();
      if (!label) continue;
      const style =
        String(item.style || '').toLowerCase() === 'paragraph'
          ? 'paragraph'
          : 'short';
      let minLength =
        item.minLength != null && item.minLength !== ''
          ? Number(item.minLength)
          : null;
      let maxLength =
        item.maxLength != null && item.maxLength !== ''
          ? Number(item.maxLength)
          : null;
      if (Number.isNaN(minLength as number)) minLength = null;
      if (Number.isNaN(maxLength as number)) maxLength = null;
      const hardMax = style === 'paragraph' ? 4000 : 400;
      if (minLength != null) minLength = Math.max(0, Math.min(minLength, hardMax));
      if (maxLength != null) maxLength = Math.max(1, Math.min(maxLength, hardMax));
      if (minLength != null && maxLength != null && minLength > maxLength) {
        minLength = maxLength;
      }
      out.push({
        id: String(item.id || `ask${out.length + 1}`),
        label: label.slice(0, LABEL_MAX),
        style,
        required: item.required !== false,
        placeholder: String(item.placeholder || '').slice(0, PLACEHOLDER_MAX),
        minLength,
        maxLength,
      });
    }
    if (out.length >= MAX_QUESTIONS) break;
  }
  return out;
}

export function legacyAskFields(questions: ApplyQuestion[]) {
  return {
    ask1: questions[0]?.label || null,
    ask2: questions[1]?.label || null,
    ask3: questions[2]?.label || null,
    ask4: questions[3]?.label || null,
    ask5: questions[4]?.label || null,
  };
}

export { MAX_QUESTIONS };
