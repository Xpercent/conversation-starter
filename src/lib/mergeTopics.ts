import type { Category } from '../data/topics';
import type { Bucket, ImportedRow } from './importTopics';

/**
 * Folding parsed rows into a bank.
 *
 * Produces the whole resulting bank plus a count of what happened, so the UI
 * can show the outcome *before* anything is committed. Nothing here mutates
 * the bank it is given.
 */
export interface ImportPlan {
  categories: Category[];
  /** Topics that will actually be added. */
  added: number;
  /** Rows skipped because that topic is already in that bucket. */
  duplicates: number;
  /** Categories created by this import that did not exist before. */
  newCategories: string[];
  /**
   * Rows that had only one language. The text is reused for the other so the
   * topic stays visible in every region — worth telling people about, since it
   * means English will show up in the Chinese pool.
   */
  mirrored: number;
  touchedCategories: number;
}

export interface ImportOptions {
  mode: 'merge' | 'replace';
  /** Where rows with no category column land. */
  fallbackCategoryId: string;
  /** Where rows with no region column land. */
  fallbackBucket: Bucket;
}

const REGION_ALIASES: Record<string, Bucket> = {
  shared: 'base',
  base: 'base',
  both: 'base',
  all: 'base',
  english: 'base',
  en: 'base',
  通用: 'base',
  共享: 'base',
  英文: 'base',
  singapore: 'singapore',
  sg: 'singapore',
  singlish: 'singapore',
  新加坡: 'singapore',
  china: 'china',
  cn: 'china',
  zh: 'china',
  chinese: 'china',
  mainland: 'china',
  中国: 'china',
  中文: 'china',
};

const resolveBucket = (region: string | undefined, fallback: Bucket): Bucket => {
  if (!region) return fallback;
  return REGION_ALIASES[region.trim().toLowerCase()] ?? fallback;
};

/** Case- and space-insensitive, so "Comfort Zone" and "comfort  zone" collide. */
const fingerprint = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * A stable id from a category name. Latin text slugs normally; Chinese or
 * emoji names have nothing to slug, so they fall back to a hash — an id only
 * has to be unique and stable, never readable.
 */
function categoryId(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug) return slug.slice(0, 64);

  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return `c${(hash >>> 0).toString(36)}`;
}

const emptyCategory = (id: string, name: string): Category => ({
  id,
  emoji: '•',
  label: { en: name, zh: name },
  base: [],
  extra: { singapore: [], china: [] },
});

const cloneCategory = (c: Category): Category => ({
  ...c,
  label: { ...c.label },
  base: c.base.map((p) => ({ ...p })),
  extra: { singapore: [...c.extra.singapore], china: [...c.extra.china] },
});

export function planImport(
  current: Category[],
  rows: ImportedRow[],
  options: ImportOptions,
): ImportPlan {
  const base = options.mode === 'replace' ? [] : current.map(cloneCategory);
  const byId = new Map(base.map((c) => [c.id, c]));

  // Categories are also addressable by their display name, so "Fitness" in a
  // spreadsheet lands in the existing fitness category instead of creating a
  // near-duplicate beside it.
  const byName = new Map<string, Category>();
  for (const c of base) {
    byName.set(fingerprint(c.label.en), c);
    byName.set(fingerprint(c.label.zh), c);
  }

  // Seen-sets are built once per category and updated as we go, so duplicates
  // inside the uploaded file are caught as well as duplicates against the bank.
  const seen = new Map<string, Set<string>>();
  const seenFor = (category: Category, bucket: Bucket): Set<string> => {
    const key = `${category.id}:${bucket}`;
    let set = seen.get(key);
    if (!set) {
      const existing =
        bucket === 'base'
          ? category.base.flatMap((p) => [p.en, p.zh])
          : category.extra[bucket];
      set = new Set(existing.map(fingerprint));
      seen.set(key, set);
    }
    return set;
  };

  const plan: ImportPlan = {
    categories: base,
    added: 0,
    duplicates: 0,
    newCategories: [],
    mirrored: 0,
    touchedCategories: 0,
  };
  const touched = new Set<string>();

  for (const row of rows) {
    const name = row.category?.trim();
    let category: Category | undefined;

    if (name) {
      const id = categoryId(name);
      category = byId.get(id) ?? byName.get(fingerprint(name));
      if (!category) {
        category = emptyCategory(id, name);
        base.push(category);
        byId.set(id, category);
        byName.set(fingerprint(name), category);
        plan.newCategories.push(name);
      }
    } else {
      category = byId.get(options.fallbackCategoryId);
      if (!category) {
        // Replace mode wipes the bank, so even the fallback category may be
        // gone. Recreate it rather than dropping every uncategorised row.
        category = emptyCategory(options.fallbackCategoryId, options.fallbackCategoryId);
        base.push(category);
        byId.set(category.id, category);
        plan.newCategories.push(category.id);
      }
    }

    const bucket = resolveBucket(row.region, options.fallbackBucket);
    const set = seenFor(category, bucket);

    if (bucket === 'base') {
      // Shared topics are index-aligned {en, zh} pairs. A row with only one
      // language reuses that text for the other side: mirroring keeps the
      // topic reachable in every region, where dropping it would lose it and
      // filing it under a region would hide it from the others.
      const en = row.en ?? row.zh!;
      const zh = row.zh ?? row.en!;
      if (!row.en || !row.zh) plan.mirrored++;
      if (set.has(fingerprint(en)) || set.has(fingerprint(zh))) {
        plan.duplicates++;
        continue;
      }
      category.base.push({ en, zh });
      set.add(fingerprint(en));
      set.add(fingerprint(zh));
    } else {
      // Region-only buckets are plain strings: Singapore is English, China is
      // 中文. Take the matching language, or whichever one the row has.
      const value = bucket === 'singapore' ? (row.en ?? row.zh!) : (row.zh ?? row.en!);
      if (set.has(fingerprint(value))) {
        plan.duplicates++;
        continue;
      }
      category.extra[bucket].push(value);
      set.add(fingerprint(value));
    }

    plan.added++;
    touched.add(category.id);
  }

  plan.touchedCategories = touched.size;
  return plan;
}

/** The bank as a CSV that this same importer reads back unchanged. */
export function toCsv(categories: Category[]): string {
  const escape = (value: string): string =>
    /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

  const lines = ['category,en,zh,region'];
  for (const c of categories) {
    for (const pair of c.base) {
      lines.push([c.label.en, pair.en, pair.zh, 'shared'].map(escape).join(','));
    }
    for (const value of c.extra.singapore) {
      lines.push([c.label.en, value, '', 'singapore'].map(escape).join(','));
    }
    for (const value of c.extra.china) {
      lines.push([c.label.en, '', value, 'china'].map(escape).join(','));
    }
  }
  return lines.join('\n') + '\n';
}
