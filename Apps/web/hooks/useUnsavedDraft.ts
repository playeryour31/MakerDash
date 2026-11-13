'use client';

import { useCallback, useMemo, useState } from 'react';

function stableStringify(value: unknown): string {
  return JSON.stringify(value);
}

/**
 * Draft vs baseline tracking — buttons appear only while draft !== saved snapshot.
 * Reverting fields manually clears dirty state automatically.
 */
export function useUnsavedDraft<T>(initial: T) {
  const [baseline, setBaseline] = useState<T>(initial);
  const [draft, setDraft] = useState<T>(initial);

  const isDirty = useMemo(
    () => stableStringify(draft) !== stableStringify(baseline),
    [draft, baseline],
  );

  const discard = useCallback(() => {
    setDraft(baseline);
  }, [baseline]);

  /** Mark current (or provided) draft as the new saved baseline. */
  const commit = useCallback((next?: T) => {
    const value = next !== undefined ? next : draft;
    setBaseline(value);
    setDraft(value);
  }, [draft]);

  /** Replace both draft and baseline (e.g. after loading from API). */
  const hydrate = useCallback((value: T) => {
    setBaseline(value);
    setDraft(value);
  }, []);

  const patch = useCallback((partial: Partial<T>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
  }, []);

  return {
    draft,
    setDraft,
    patch,
    baseline,
    isDirty,
    discard,
    commit,
    hydrate,
  };
}
