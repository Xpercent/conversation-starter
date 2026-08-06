import { phaseReducer } from '../src/state/phase.ts';
import { clampSpeech, clampResearch, formatClock, progressFraction, durationParts } from '../src/lib/time.ts';
import { readFileSync } from 'node:fs';

let fails = 0;
const check = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { fails++; console.log(`FAIL ${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); }
  else console.log(`ok   ${name}`);
};

// --- Phase machine ---
check('off-the-cuff start -> speech', phaseReducer('idle', { type: 'start', mode: 'off-the-cuff' }), 'speech');
check('deep-research start -> research', phaseReducer('idle', { type: 'start', mode: 'deep-research' }), 'research');
check('research -> ready', phaseReducer('research', { type: 'researchComplete' }), 'ready');
check('ready -> speech', phaseReducer('ready', { type: 'startSpeech' }), 'speech');
check('speech -> done', phaseReducer('speech', { type: 'speechComplete' }), 'done');
check('reset from anywhere', phaseReducer('done', { type: 'reset' }), 'idle');
// Illegal transitions must be no-ops, not wedges
check('double start ignored', phaseReducer('speech', { type: 'start', mode: 'off-the-cuff' }), 'speech');
check('stray researchComplete ignored', phaseReducer('speech', { type: 'researchComplete' }), 'speech');
check('stray speechComplete ignored', phaseReducer('research', { type: 'speechComplete' }), 'research');

// --- Time ---
check('speech clamps low', clampSpeech(5), 60);
check('speech clamps high', clampSpeech(99999), 600);
check('speech rejects NaN', clampSpeech(NaN), 60);
check('research clamps high', clampResearch(99999), 3600);
check('clock 0', formatClock(0), '0:00');
check('clock 65', formatClock(65), '1:05');
check('clock 600', formatClock(600), '10:00');
check('clock negative floors at 0', formatClock(-5), '0:00');
check('progress half', progressFraction(30, 60), 0.5);
check('progress clamps', progressFraction(-10, 60), 1);
check('duration parts', durationParts(200), { minutes: 3, seconds: 20 });

// --- Topic bank integrity (mirrors the module-load assertions) ---
const cats = JSON.parse(readFileSync('src/data/topics.json', 'utf8'));
check('11 categories', cats.length, 11);
const badPairs = cats.flatMap((c: any) => c.base.filter((p: any) => !p.en || !p.zh));
check('every base pair bilingual', badPairs.length, 0);
const ids = new Set(cats.map((c: any) => c.id));
check('category ids unique', ids.size, cats.length);
const hasDeep = cats.some((c: any) => c.id === 'deep-research');
check('deep-research category present', hasDeep, true);

// Pool sizes per region
for (const c of cats) {
  const en = c.base.length;
  const sg = en + c.extra.singapore.length;
  const cn = en + c.extra.china.length;
  console.log(`     ${c.id.padEnd(18)} en=${String(en).padStart(2)} sg=${String(sg).padStart(2)} cn=${String(cn).padStart(2)}`);
}

console.log(fails === 0 ? '\nALL CHECKS PASSED' : `\n${fails} CHECK(S) FAILED`);
process.exit(fails === 0 ? 0 : 1);
