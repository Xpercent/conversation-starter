/**
 * ONE-TIME migration: build the canonical topic bank.
 *
 * Inputs
 *   docs/topic_bank_prompt.md   English base (11 categories) inside the last ```json fence
 *   docs/topics.raw.json        zh translations + China/Singapore additions
 *
 * Output
 *   src/data/topics.json        canonical bank — the app reads it, the editor writes it
 *
 * After this runs, the inputs are provenance only. Re-running is safe but will
 * overwrite any edits made through the in-app editor, so it is not part of `npm run dev`.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

type EnglishCategory = { id: string; label: string; emoji: string; topics: string[] };
type RawCategory = {
  id: string;
  label_zh: string;
  china: { topics_zh_translation: string[]; topics_zh_original: string[] };
  singapore: { topics_sg_original: string[] };
};

/** Pull the English topic bank out of the fenced JSON blocks in the prompt doc. */
function readEnglishBase(md: string): EnglishCategory[] {
  const fences = [...md.matchAll(/```json\s*([\s\S]*?)```/g)].map((m) => m[1].trim());
  for (const block of fences.reverse()) {
    if (!block.startsWith('[')) continue;
    const parsed = JSON.parse(block);
    if (Array.isArray(parsed) && parsed[0]?.topics) return parsed as EnglishCategory[];
  }
  throw new Error('No English topic array found in topic_bank_prompt.md');
}

const promptPath = resolve(root, 'docs/topic_bank_prompt.md');
const rawPath = existsSync(resolve(root, 'docs/topics.raw.json'))
  ? resolve(root, 'docs/topics.raw.json')
  : resolve(root, 'src/data/topics.raw.json');

const english = readEnglishBase(readFileSync(promptPath, 'utf8'));
const raw = JSON.parse(readFileSync(rawPath, 'utf8')) as RawCategory[];
const rawById = new Map(raw.map((c) => [c.id, c]));

const categories = english.map((en) => {
  const zh = rawById.get(en.id);
  if (!zh) throw new Error(`No Chinese data for category "${en.id}"`);

  const translations = zh.china.topics_zh_translation;
  if (translations.length !== en.topics.length) {
    throw new Error(
      `Translation misalignment in "${en.id}": ${en.topics.length} English vs ${translations.length} Chinese`,
    );
  }

  return {
    id: en.id,
    emoji: en.emoji,
    label: { en: en.label, zh: zh.label_zh },
    base: en.topics.map((topic, i) => ({ en: topic, zh: translations[i] })),
    extra: {
      singapore: zh.singapore.topics_sg_original,
      china: zh.china.topics_zh_original,
    },
  };
});

const outPath = resolve(root, 'src/data/topics.json');
writeFileSync(outPath, JSON.stringify(categories, null, 2) + '\n', 'utf8');

const total = categories.reduce(
  (n, c) => n + c.base.length + c.extra.singapore.length + c.extra.china.length,
  0,
);
console.log(`Wrote ${categories.length} categories to src/data/topics.json`);
console.log(`  base pairs: ${categories.reduce((n, c) => n + c.base.length, 0)}`);
console.log(`  singapore:  ${categories.reduce((n, c) => n + c.extra.singapore.length, 0)}`);
console.log(`  china:      ${categories.reduce((n, c) => n + c.extra.china.length, 0)}`);
console.log(`  total entries: ${total}`);
