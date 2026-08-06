import type { Category } from '../data/topics';
import { readStored, removeStored, writeStoredOrThrow } from './storage';
import { validateBank } from './topicsSchema';

const KEY = 'topics';

/**
 * The visitor's own topic bank, if they have one.
 *
 * Anything unreadable, unparseable or structurally wrong is discarded rather
 * than repaired: the bundled bank is always a valid fallback, so there is no
 * situation where limping along with half a bank beats starting clean. The
 * stored copy is removed on the way out so the same bad value is not re-parsed
 * on every load.
 */
export function loadStoredBank(): Category[] | null {
  const raw = readStored(KEY);
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    removeStored(KEY);
    return null;
  }

  const result = validateBank(parsed);
  if (!result.ok) {
    removeStored(KEY);
    return null;
  }
  return result.categories;
}

/** Throws on quota failure so the editor can surface "Save failed". */
export function saveStoredBank(categories: Category[]): void {
  writeStoredOrThrow(KEY, JSON.stringify(categories));
}

export function clearStoredBank(): void {
  removeStored(KEY);
}

export const hasStoredBank = (): boolean => readStored(KEY) !== null;
