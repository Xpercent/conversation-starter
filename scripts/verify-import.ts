/**
 * Checks the upload path end to end: text in, bank out.
 *
 * The browser-only parts (File, xlsx) are not covered here — this exercises the
 * delimiter parser and the merge fold, which is where the decisions live.
 */
import { parseDelimited, tableToRows } from '../src/lib/importTopics.ts';
import { planImport, toCsv } from '../src/lib/mergeTopics.ts';
import { en } from '../src/i18n/en.ts';
import { zh } from '../src/i18n/zh.ts';
import { loadShippedBank } from './topicBank.ts';

const defaults = loadShippedBank();
let failures = 0;

function check(label: string, condition: boolean, detail = ''): void {
  if (!condition) {
    failures++;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  } else {
    console.log(`  ok    ${label}`);
  }
}

/*
 * The CSV grammar. Quoted commas, doubled quotes and CRLF are the three things
 * a spreadsheet export actually produces that a naive split would mangle.
 */
console.log('\nDelimited parsing');
{
  const rows = parseDelimited('a,b\r\n"x,y",z\r\n"he said ""hi""",w\r\n', ',');
  check('splits on CRLF', rows.length === 4, `got ${rows.length} rows`);
  check('keeps commas inside quotes', rows[1][0] === 'x,y', JSON.stringify(rows[1][0]));
  check('unescapes doubled quotes', rows[2][0] === 'he said "hi"', JSON.stringify(rows[2][0]));
  const tabs = parseDelimited('a\tb\nc\td\n', '\t');
  check('handles tabs', tabs[1][1] === 'd');
}

/* Header detection. The most guess-prone part of the parser: get this wrong and
   a column is silently dropped, which is exactly what must never happen. */
console.log('\nHeader detection');
{
  const named = tableToRows([
    ['category', 'en', 'zh', 'region'],
    ['Food', 'Laksa', '叻沙', 'singapore'],
  ]);
  check('reads the documented header', named.rows[0].category === 'Food' && named.rows[0].zh === '叻沙');

  const loose = tableToRows([
    ['word', 'meaning'],
    ['resilience', '韧性'],
  ]);
  check('accepts a vocabulary-style header', loose.rows[0].en === 'resilience' && loose.rows[0].zh === '韧性',
    JSON.stringify(loose.rows[0]));

  const chinese = tableToRows([
    ['分类', '英文', '中文'],
    ['日常', 'Nostalgia', '怀旧'],
  ]);
  check('accepts Chinese header names', chinese.rows[0].category === '日常' && chinese.rows[0].zh === '怀旧',
    JSON.stringify(chinese.rows[0]));

  // No header at all: the first line is data and must not be eaten.
  const headerless = tableToRows([
    ['Serendipity', '机缘巧合'],
    ['Ephemeral', '短暂'],
  ]);
  check('keeps the first row when there is no header', headerless.rows.length === 2, `${headerless.rows.length} rows`);
  check('reads a headerless file positionally', headerless.rows[0].en === 'Serendipity' && headerless.rows[0].zh === '机缘巧合');

  const single = tableToRows([['Nostalgia'], ['Regret']]);
  check('reads a one-column word list', single.rows.length === 2 && single.rows[0].en === 'Nostalgia');

  const blank = tableToRows([['', ''], ['', '']]);
  check('reports an empty file instead of importing nothing silently', blank.errors.length > 0);
}

/* Header handling — the whole point is that partial files still work. */
console.log('\nMerging rows into the bank');
{
  const plan = planImport(
    defaults,
    [
      { category: 'Fitness', en: 'Cold plunges', zh: '冷水浴', region: 'shared' },
      { category: 'Fitness', en: 'Reformer pilates', region: 'singapore' },
      { category: 'Brand New', en: 'Something else', zh: '别的事', region: 'shared' },
    ],
    { mode: 'merge', fallbackCategoryId: 'general', fallbackBucket: 'base' },
  );
  check('adds every row', plan.added === 3, `added ${plan.added}`);
  check('creates the unknown category', plan.newCategories.length === 1);
  check(
    'matches an existing category by its display name',
    plan.categories.find((c) => c.id === 'fitness')!.base.some((p) => p.en === 'Cold plunges'),
  );
  check(
    'routes a region column to the right bucket',
    plan.categories
      .find((c) => c.id === 'fitness')!
      .extra.singapore.includes('Reformer pilates'),
  );
  check('leaves the original bank untouched', defaults.find((c) => c.id === 'fitness')!.base.every((p) => p.en !== 'Cold plunges'));
}

/* One-language rows must stay reachable rather than being dropped. */
{
  const plan = planImport(
    defaults,
    [{ category: 'Fitness', en: 'Rucking', region: 'shared' }],
    { mode: 'merge', fallbackCategoryId: 'general', fallbackBucket: 'base' },
  );
  const pair = plan.categories.find((c) => c.id === 'fitness')!.base.find((p) => p.en === 'Rucking');
  check('mirrors a missing translation', pair?.zh === 'Rucking');
  check('reports the mirroring', plan.mirrored === 1);
}

/* Duplicates, both against the bank and inside the uploaded file itself. */
{
  const existing = defaults.find((c) => c.id === 'general')!.base[0].en;
  const plan = planImport(
    defaults,
    [
      { category: 'General', en: existing, zh: 'x', region: 'shared' },
      { category: 'General', en: 'Brand new topic', zh: '全新话题', region: 'shared' },
      { category: 'General', en: 'BRAND NEW TOPIC', zh: '全新话题', region: 'shared' },
    ],
    { mode: 'merge', fallbackCategoryId: 'general', fallbackBucket: 'base' },
  );
  check('skips a topic already in the bank', plan.duplicates >= 1);
  check('skips a repeat within the same file, ignoring case', plan.added === 1, `added ${plan.added}`);
}

/* Replace must not leave any of the shipped bank behind. */
{
  const plan = planImport(
    defaults,
    [{ category: 'Only This', en: 'Alone', zh: '独自', region: 'shared' }],
    { mode: 'replace', fallbackCategoryId: 'general', fallbackBucket: 'base' },
  );
  check('replace drops everything else', plan.categories.length === 1, `${plan.categories.length} categories`);
  check('replace keeps the uploaded row', plan.categories[0].base.length === 1);
}

/* A row with no category and no region lands where the UI says it should. */
{
  const plan = planImport(defaults, [{ en: 'Loose word' }], {
    mode: 'merge',
    fallbackCategoryId: 'general',
    fallbackBucket: 'singapore',
  });
  check(
    'uncategorised rows honour the selected bucket',
    plan.categories.find((c) => c.id === 'general')!.extra.singapore.includes('Loose word'),
  );
}

/* Export must be re-importable — otherwise it is a dead end, not a backup. */
console.log('\nCSV round trip');
{
  const csv = toCsv(defaults);
  const table = parseDelimited(csv, ',');
  const header = table[0];
  check('exports the documented header', header.join(',') === 'category,en,zh,region');

  const body = table.slice(1).filter((r) => r.some((c) => c !== ''));
  const expected = defaults.reduce(
    (n, c) => n + c.base.length + c.extra.singapore.length + c.extra.china.length,
    0,
  );
  check('exports every topic', body.length === expected, `${body.length} vs ${expected}`);

  const reimported = planImport(
    [],
    body.map((r) => ({ category: r[0], en: r[1] || undefined, zh: r[2] || undefined, region: r[3] })),
    { mode: 'replace', fallbackCategoryId: 'general', fallbackBucket: 'base' },
  );
  check(
    'a re-imported export has the same topic count',
    reimported.added === expected,
    `${reimported.added} vs ${expected}`,
  );
  check(
    'a re-imported export has the same categories',
    reimported.categories.length === defaults.length,
    `${reimported.categories.length} vs ${defaults.length}`,
  );
}

/*
 * The template is the main thing a new user will open, and it teaches by
 * example — so it has to actually import. Its `notes` column must be ignored,
 * its trailing instruction rows must not become topics, and the same has to
 * hold for the Chinese translation of it.
 */
console.log('\nThe downloadable template');
for (const [locale, dict] of [['en', en], ['zh', zh]] as const) {
  const parsed = tableToRows(parseDelimited(dict.importTemplateCsv, ','));
  check(`${locale}: template parses with no complaints`, parsed.errors.length === 0, parsed.errors.join('; '));
  check(`${locale}: the notes column is not treated as a topic`, parsed.rows.every((r) => !(r.en ?? '').startsWith('"') && !(r.zh ?? '').startsWith('"')));
  check(`${locale}: instruction-only rows are skipped`, parsed.rows.length === 5, `${parsed.rows.length} rows`);

  const plan = planImport(defaults, parsed.rows, {
    mode: 'merge',
    fallbackCategoryId: 'general',
    fallbackBucket: 'base',
  });
  // Importing the template as-is must be a clean run: an example that collides
  // with the shipped bank would report a skip and read as the template's fault.
  check(`${locale}: every example row imports`, plan.added === 5, `added ${plan.added}`);
  check(`${locale}: no example collides with the shipped bank`, plan.duplicates === 0, `${plan.duplicates} duplicates`);
  check(`${locale}: the example creates exactly one new category`, plan.newCategories.length === 1, plan.newCategories.join(', '));

  const singapore = plan.categories.find((c) => c.id === 'general')!.extra.singapore;
  const china = plan.categories.find((c) => c.id === 'general')!.extra.china;
  check(`${locale}: the singapore example lands in the singapore bucket`, singapore.includes('The best kopi order'));
  check(`${locale}: the china example lands in the china bucket`, china.includes('躺平'));
}

console.log(failures === 0 ? '\nALL CHECKS PASSED\n' : `\n${failures} CHECK(S) FAILED\n`);
if (failures > 0) process.exit(1);
