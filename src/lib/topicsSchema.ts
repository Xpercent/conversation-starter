import type { Category } from '../data/topics';

/**
 * The structural rules for a topic bank, in one place.
 *
 * Two callers need the same rules but want opposite behaviour on failure:
 * `topics.ts` asserts them at module load and throws, because a corrupt bundled
 * bank is a build mistake that should be loud. A user-supplied import must
 * never throw — a stranger's malformed spreadsheet has to come back as a list
 * of complaints with the app still running. So the rules live here and return
 * errors; throwing is the caller's choice.
 */
export type ValidationResult =
  | { ok: true; categories: Category[] }
  | { ok: false; errors: string[] };

/** Beyond this a category id stops being an id and starts being a topic. */
const MAX_ID_LENGTH = 64;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === 'string');

export function validateBank(value: unknown): ValidationResult {
  const errors: string[] = [];

  if (!Array.isArray(value)) {
    return { ok: false, errors: ['The topic bank must be an array of categories.'] };
  }
  if (value.length === 0) {
    return { ok: false, errors: ['The topic bank has no categories.'] };
  }

  const seenIds = new Set<string>();

  for (const [index, raw] of value.entries()) {
    const where = `Category ${index + 1}`;

    if (typeof raw !== 'object' || raw === null) {
      errors.push(`${where} is not an object.`);
      continue;
    }
    const category = raw as Partial<Category>;
    const label = typeof category.id === 'string' && category.id ? category.id : where;

    if (typeof category.id !== 'string' || !category.id.trim()) {
      errors.push(`${where} is missing an id.`);
    } else if (category.id.length > MAX_ID_LENGTH) {
      errors.push(`${where} has an id longer than ${MAX_ID_LENGTH} characters.`);
    } else if (seenIds.has(category.id)) {
      errors.push(`Duplicate category id: ${category.id}`);
    } else {
      seenIds.add(category.id);
    }

    if (!category.label?.en || !category.label?.zh) {
      errors.push(`"${label}" needs both an English and a 中文 name.`);
    }

    if (!Array.isArray(category.base)) {
      errors.push(`"${label}" is missing its shared topic list.`);
    } else {
      for (const [i, pair] of category.base.entries()) {
        if (!pair?.en || !pair?.zh) {
          errors.push(`"${label}" shared topic ${i + 1} needs both English and 中文.`);
        }
      }
    }

    if (!isStringArray(category.extra?.singapore) || !isStringArray(category.extra?.china)) {
      errors.push(`"${label}" has a malformed region-only topic list.`);
    }

    // Not fatal — a missing emoji renders as a blank square, not a crash — so
    // it is repaired on the way through rather than rejected.
    if (typeof category.emoji !== 'string' || !category.emoji) {
      (category as Category).emoji = '•';
    }
  }

  // Cap the list: a thousand identical complaints helps nobody find the typo.
  if (errors.length > 0) {
    const shown = errors.slice(0, 10);
    if (errors.length > shown.length) {
      shown.push(`…and ${errors.length - shown.length} more problems.`);
    }
    return { ok: false, errors: shown };
  }

  return { ok: true, categories: value as Category[] };
}
