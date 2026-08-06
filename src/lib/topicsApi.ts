import type { Category } from '../data/topics';
import { saveStoredBank } from './topicsStore';

/**
 * The bank lives in the visitor's own browser, so editing works everywhere the
 * app does — a built page on a static host included. Nothing is uploaded and
 * nothing is shared; one person's bank never reaches another's.
 */
export const canEditTopics = true;

export async function saveTopics(categories: Category[]): Promise<void> {
  // Synchronous underneath, but kept async so the editor's existing
  // debounce-then-settle save flow needs no restructuring. A quota failure
  // propagates and surfaces as "Save failed".
  saveStoredBank(categories);
}
