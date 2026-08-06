import { buildReel, planSteps, REEL_SIZE } from '../src/lib/spin.ts';

const pool = Array.from({ length: 45 }, (_, i) => `t${i}`);
const counts = new Map<string, number>(pool.map((t) => [t, 0]));
const N = 300000;
let current: string | null = null;

for (let i = 0; i < N; i++) {
  const reel = buildReel(pool, current);
  const steps = planSteps(reel.topics.length);
  const land = reel.topics[(reel.startIndex + steps) % reel.topics.length];
  counts.set(land, counts.get(land)! + 1);
  current = land;
}

const expected = N / pool.length;
const freqs = [...counts.values()];
let maxDev = 0;
for (const c of freqs) maxDev = Math.max(maxDev, Math.abs(c - expected) / expected);
console.log('pool:', pool.length, '| REEL_SIZE:', REEL_SIZE, '| draws:', N);
console.log('expected per topic:', expected.toFixed(0), '| observed min/max:', Math.min(...freqs), '/', Math.max(...freqs));
console.log('max deviation:', (maxDev * 100).toFixed(2) + '%', '| never landed:', freqs.filter((f) => f === 0).length);
const chi2 = freqs.reduce((s, o) => s + (o - expected) ** 2 / expected, 0);
console.log(`chi-square: ${chi2.toFixed(1)} (df=${pool.length - 1}, critical ~60.5 @ p=.05)`);


// Every spin must travel at least three full revolutions, so the reel always
// reads as a spin rather than a nudge.
let minSteps = Infinity;
for (let i = 0; i < 100000; i++) {
  const reel = buildReel(pool, current);
  minSteps = Math.min(minSteps, planSteps(reel.topics.length));
}
const reelLen = Math.min(pool.length, REEL_SIZE);
console.log('minimum steps:', minSteps, '| >= 3 revolutions:', minSteps >= 3 * reelLen);
