import type { WelcomeImageDraft } from '../types';
import { draftsEqual, snapshotDraft } from './types';

const MAX_HISTORY = 40;

export type HistoryState = {
  past: WelcomeImageDraft[];
  present: WelcomeImageDraft;
  future: WelcomeImageDraft[];
};

export function createHistory(initial: WelcomeImageDraft): HistoryState {
  return { past: [], present: snapshotDraft(initial), future: [] };
}

export function historyCommit(
  state: HistoryState,
  next: WelcomeImageDraft,
  options?: { replace?: boolean },
): HistoryState {
  if (draftsEqual(state.present, next)) return state;
  if (options?.replace) {
    return { ...state, present: snapshotDraft(next) };
  }
  return {
    past: [...state.past, snapshotDraft(state.present)].slice(-MAX_HISTORY),
    present: snapshotDraft(next),
    future: [],
  };
}

export function historyReplacePresent(
  state: HistoryState,
  next: WelcomeImageDraft,
): HistoryState {
  return { ...state, present: snapshotDraft(next) };
}

export function historyUndo(state: HistoryState): HistoryState {
  if (!state.past.length) return state;
  const previous = state.past[state.past.length - 1];
  return {
    past: state.past.slice(0, -1),
    present: previous,
    future: [snapshotDraft(state.present), ...state.future].slice(0, MAX_HISTORY),
  };
}

export function historyRedo(state: HistoryState): HistoryState {
  if (!state.future.length) return state;
  const next = state.future[0];
  return {
    past: [...state.past, snapshotDraft(state.present)].slice(-MAX_HISTORY),
    present: next,
    future: state.future.slice(1),
  };
}

export function canUndo(state: HistoryState) {
  return state.past.length > 0;
}

export function canRedo(state: HistoryState) {
  return state.future.length > 0;
}
