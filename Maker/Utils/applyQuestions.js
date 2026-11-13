/**
 * Normalize Apply questions for Discord modals.
 * Discord allows max 5 TextInputs per modal — extra questions use multi-page flow.
 */

const DISCORD_MODAL_MAX = 5;
const LABEL_MAX = 45;
const PLACEHOLDER_MAX = 100;

function emptyQuestion(overrides = {}) {
  return {
    id: overrides.id || `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    label: '',
    style: 'short', // short | paragraph
    required: true,
    placeholder: '',
    minLength: null,
    maxLength: null,
    ...overrides,
  };
}

/** Accept string[] (legacy) or object[] and return clean Question[]. */
function normalizeQuestions(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (item == null || item === '') continue;
    if (typeof item === 'string') {
      const label = String(item).trim();
      if (!label) continue;
      out.push(
        emptyQuestion({
          id: `ask${out.length + 1}`,
          label: label.slice(0, LABEL_MAX),
          style: 'short',
          required: true,
        }),
      );
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
      if (Number.isNaN(minLength)) minLength = null;
      if (Number.isNaN(maxLength)) maxLength = null;
      // Discord bounds
      const hardMax = style === 'paragraph' ? 4000 : 400;
      if (minLength != null) minLength = Math.max(0, Math.min(minLength, hardMax));
      if (maxLength != null) maxLength = Math.max(1, Math.min(maxLength, hardMax));
      if (minLength != null && maxLength != null && minLength > maxLength) {
        minLength = maxLength;
      }
      out.push(
        emptyQuestion({
          id: item.id || `ask${out.length + 1}`,
          label: label.slice(0, LABEL_MAX),
          style,
          required: item.required !== false,
          placeholder: String(item.placeholder || '').slice(0, PLACEHOLDER_MAX),
          minLength,
          maxLength,
        }),
      );
    }
  }
  return out;
}

/** Legacy ask1..ask5 mirror for older readers. */
function legacyAskFields(questions) {
  const q = normalizeQuestions(questions);
  return {
    ask1: q[0]?.label || null,
    ask2: q[1]?.label || null,
    ask3: q[2]?.label || null,
    ask4: q[3]?.label || null,
    ask5: q[4]?.label || null,
  };
}

function pageCount(questions) {
  const n = normalizeQuestions(questions).length;
  return Math.max(1, Math.ceil(n / DISCORD_MODAL_MAX));
}

function questionsForPage(questions, page) {
  const q = normalizeQuestions(questions);
  const start = page * DISCORD_MODAL_MAX;
  return q.slice(start, start + DISCORD_MODAL_MAX);
}

function resolveLabel(question) {
  if (typeof question === 'string') {
    return question.trim().slice(0, LABEL_MAX);
  }
  if (!question || typeof question !== 'object') return '';
  const raw = question.label || question.qes || question.text || '';
  if (typeof raw === 'string') return raw.trim().slice(0, LABEL_MAX);
  if (raw && typeof raw === 'object') {
    return String(raw.label || raw.qes || raw.text || '')
      .trim()
      .slice(0, LABEL_MAX);
  }
  return '';
}

function buildTextInput(TextInputBuilder, TextInputStyle, question, indexInPage) {
  const customId = `ask${indexInPage + 1}`;
  const style =
    question && question.style === 'paragraph'
      ? TextInputStyle.Paragraph
      : TextInputStyle.Short;
  const hardMax =
    question && question.style === 'paragraph' ? 4000 : 400;
  const label = resolveLabel(question) || `سؤال ${indexInPage + 1}`;
  const input = new TextInputBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setRequired(!question || question.required !== false)
    .setStyle(style);

  const placeholder =
    question && typeof question.placeholder === 'string'
      ? question.placeholder
      : '';
  if (placeholder) {
    input.setPlaceholder(String(placeholder).slice(0, PLACEHOLDER_MAX));
  }
  if (question && question.minLength != null && question.minLength > 0) {
    input.setMinLength(Math.min(Number(question.minLength), hardMax));
  }
  const maxLen =
    question && question.maxLength != null ? Number(question.maxLength) : hardMax;
  input.setMaxLength(Math.min(Math.max(1, maxLen || hardMax), hardMax));
  return input;
}

module.exports = {
  DISCORD_MODAL_MAX,
  emptyQuestion,
  normalizeQuestions,
  legacyAskFields,
  pageCount,
  questionsForPage,
  buildTextInput,
  resolveLabel,
};
