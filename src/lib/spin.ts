/** Total spin duration. The original's value — do not tune. */
export const SPIN_MS = 4800;

/** Fallback in case rAF is throttled (backgrounded tab) and never completes. */
export const SAFETY_MS = 5100;

/**
 * How many topics the wheel actually cycles through in one spin.
 *
 * Step count is `revolutions * reelLength`, so a longer reel means a denser,
 * blurrier spin. The original's categories are 18-28 long, which is what its
 * feel is tuned around; regional pools reach ~45. Rather than alter the spin
 * formula, we sample a reel of this size fresh on every spin and run the
 * untouched formula over it — so every region spins with the original's cadence
 * while every topic stays reachable and equally likely.
 */
export const REEL_SIZE = 30;

export const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

/** Inclusive on both ends. */
const randInt = (min: number, max: number): number =>
  min + Math.floor(Math.random() * (max - min + 1));

/**
 * Number of steps the reel advances during one spin.
 *
 * Draws `revolutions ∈ [3,5]` and `offset ∈ [1, len-1]`, giving
 * `steps ∈ [3L+1, 6L-1]` and guaranteeing the reel never lands where it started.
 */
export function planSteps(len: number): number {
  if (len <= 1) return randInt(3, 5);
  return randInt(3, 5) * len + randInt(1, len - 1);
}

/** Uniform sample of `count` distinct items, via a partial Fisher-Yates. */
function sample<T>(items: readonly T[], count: number): T[] {
  const pool = [...items];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(Math.random() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

export interface Reel {
  topics: string[];
  /** Index the spin starts from — always the topic already on screen. */
  startIndex: number;
}

/**
 * Build the strip of topics for one spin.
 *
 * The current topic is pinned at index 0 so the reel starts from whatever is
 * already displayed (no jump at spin start). The rest is sampled uniformly, so
 * each topic's overall chance is `REEL_SIZE/n * 1/REEL_SIZE = 1/n` — sampling
 * costs nothing statistically.
 */
export function buildReel(pool: readonly string[], current: string | null): Reel {
  if (pool.length === 0) return { topics: [], startIndex: 0 };

  const head = current && pool.includes(current) ? current : pool[0];

  if (pool.length <= REEL_SIZE) {
    return { topics: [...pool], startIndex: Math.max(0, pool.indexOf(head)) };
  }

  const rest = sample(
    pool.filter((t) => t !== head),
    REEL_SIZE - 1,
  );
  return { topics: [head, ...rest], startIndex: 0 };
}
