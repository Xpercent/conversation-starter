import raw from './topics.json';
import { loadStoredBank } from '../lib/topicsStore';
import { validateBank } from '../lib/topicsSchema';

export type Locale = 'en' | 'zh';
export type Region = 'english' | 'singapore' | 'china';
export type ModeId = 'off-the-cuff' | 'deep-research';

export interface TopicPair {
  en: string;
  zh: string;
}

export interface Category {
  id: string;
  emoji: string;
  label: Record<Locale, string>;
  /** The original bank, index-aligned bilingual pairs. */
  base: TopicPair[];
  /** Region-only additions, appended after the base — never interleaved. */
  extra: { singapore: string[]; china: string[] };
}

/** The bank as shipped — the fallback, and what "Reset to defaults" restores. */
export const DEFAULT_CATEGORIES = raw as Category[];

/**
 * The bank is mutable at runtime — the editor and the file import both write
 * it — so it lives behind accessors rather than a frozen export. Everything
 * derived from it (the id index, the selectable list, the pool cache) is
 * rebuilt together in `replaceCategories`; rebuilding only some of them is how
 * stale data creeps back in, since a stale index silently hands out the
 * pre-edit objects.
 *
 * A visitor's own bank wins over the shipped one. `loadStoredBank` validates
 * and returns null for anything it does not like, so a corrupt or outdated
 * stored value degrades to the defaults instead of a blank screen.
 */
let categories = loadStoredBank() ?? DEFAULT_CATEGORIES;

const listeners = new Set<() => void>();
let version = 0;

export const getCategories = (): Category[] => categories;
export const getSelectableCategories = (): Category[] => selectable;
export const getCategoryById = (id: string): Category | undefined => byId.get(id);

/** Version token for useSyncExternalStore — changes whenever the bank does. */
export const getTopicsVersion = (): number => version;

export function subscribeTopics(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function replaceCategories(next: Category[]): void {
  categories = next;
  byId = new Map(next.map((c) => [c.id, c]));
  selectable = next.filter((c) => c.id !== DEEP_RESEARCH_ID);
  poolCache.clear();
  version += 1;
  for (const listener of listeners) listener();
}

/**
 * Structural invariants, asserted at module load rather than in a test:
 * a test can be skipped, module initialisation cannot.
 *
 * This checks the SHIPPED bank only. A malformed topics.json is our mistake and
 * should fail loudly; a malformed bank in someone's browser is their import and
 * has already been rejected by `loadStoredBank`, quietly, before reaching here.
 */
if (import.meta.env.DEV) {
  const result = validateBank(DEFAULT_CATEGORIES);
  if (!result.ok) throw new Error(`Bundled topics.json is invalid:\n${result.errors.join('\n')}`);
}

/** The `deep-research` category is reachable only via the mode of the same name. */
export const DEEP_RESEARCH_ID = 'deep-research';
export const DEFAULT_CATEGORY_ID = 'general';

let byId = new Map(categories.map((c) => [c.id, c]));
let selectable = categories.filter((c) => c.id !== DEEP_RESEARCH_ID);

export const localeForRegion = (region: Region): Locale => (region === 'china' ? 'zh' : 'en');

/**
 * `deep-research` is both a mode id and a category id. This is the ONLY place
 * that resolves which category is actually in play — nothing else should
 * re-derive it, and the mode must never be inferred from the category.
 */
export function resolveCategoryId(mode: ModeId, selected: string): string {
  return mode === 'deep-research' ? DEEP_RESEARCH_ID : selected;
}

export interface Pool {
  /** Identity token — changing it invalidates the memo cache. */
  key: string;
  categoryId: string;
  topics: readonly string[];
}

const poolCache = new Map<string, Pool>();

export function getPool(region: Region, mode: ModeId, selected: string): Pool {
  const categoryId = resolveCategoryId(mode, selected);
  const key = `${region}:${categoryId}`;
  const cached = poolCache.get(key);
  if (cached) return cached;

  const category = byId.get(categoryId) ?? categories[0];
  const topics =
    region === 'english'
      ? category.base.map((t) => t.en)
      : region === 'singapore'
        ? [...category.base.map((t) => t.en), ...category.extra.singapore]
        : [...category.base.map((t) => t.zh), ...category.extra.china];

  const pool: Pool = { key, categoryId, topics };
  poolCache.set(key, pool);
  return pool;
}

export function categoryLabel(category: Category, locale: Locale): string {
  return category.label[locale];
}
