import { useCallback, useEffect, useRef, useState } from 'react';
import { SPIN_MS, SAFETY_MS, buildReel, easeOutCubic, planSteps } from '../lib/spin';

interface Options {
  pool: readonly string[];
  poolKey: string;
  onTick: (volume: number) => void;
  onLand: () => void;
}

export interface Spinner {
  topic: string | null;
  landed: string | null;
  spinning: boolean;
  /** Bumped on every visual step so the phrase can replay its CSS animation. */
  tickKey: number;
  spin: () => void;
}

export function useSpinner({ pool, poolKey, onTick, onLand }: Options): Spinner {
  const [topic, setTopic] = useState<string | null>(null);
  const [landed, setLanded] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [tickKey, setTickKey] = useState(0);

  const frameRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const topicRef = useRef<string | null>(null);

  // Keep callbacks fresh without making `spin` depend on them — a changing
  // identity mid-flight must not restart or duplicate the animation.
  const onTickRef = useRef(onTick);
  const onLandRef = useRef(onLand);
  useEffect(() => {
    onTickRef.current = onTick;
    onLandRef.current = onLand;
  });

  const cancel = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    frameRef.current = null;
    timeoutRef.current = null;
  }, []);

  // A new pool invalidates any in-flight spin and the displayed topic.
  useEffect(() => {
    cancel();
    setSpinning(false);
    setLanded(null);
    const first = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
    topicRef.current = first;
    setTopic(first);
  }, [poolKey, cancel]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => cancel, [cancel]);

  const spin = useCallback(
    () => {
      if (spinning || pool.length === 0) return;

      cancel();
      setSpinning(true);
      setLanded(null);

      const reel = buildReel(pool, topicRef.current);
      const { topics, startIndex } = reel;
      const len = topics.length;

      const totalSteps = planSteps(len);
      const landIndex = (startIndex + totalSteps) % len;

      const startedAt = performance.now();
      let lastStep = 0;
      let finished = false;

      const finish = () => {
        if (finished) return;
        finished = true;
        cancel();
        // Commit the index decided up front. Float error in the eased step
        // calculation can otherwise leave the reel one short of the target.
        const final = topics[landIndex];
        topicRef.current = final;
        setTopic(final);
        setLanded(final);
        setSpinning(false);
        onLandRef.current();
      };

      const frame = (now: number) => {
        // Derived from wall-clock deltas, so a backgrounded tab self-corrects.
        const progress = Math.min(1, (now - startedAt) / SPIN_MS);
        const step = Math.min(totalSteps, Math.floor(easeOutCubic(progress) * totalSteps));

        // Exactly one tick per changed step — never one per skipped index.
        // Early in the spin several indices pass per frame; that blur is the
        // effect, and ticking per index turns the spin into a buzz.
        if (step !== lastStep) {
          const next = topics[(startIndex + step) % len];
          topicRef.current = next;
          setTopic(next);
          setTickKey((k) => k + 1);
          onTickRef.current(1 - progress * 0.6);
          lastStep = step;
        }

        if (progress < 1) {
          frameRef.current = requestAnimationFrame(frame);
        } else {
          finish();
        }
      };

      frameRef.current = requestAnimationFrame(frame);
      timeoutRef.current = window.setTimeout(finish, SAFETY_MS);
    },
    [pool, spinning, cancel],
  );

  return { topic, landed, spinning, tickKey, spin };
}
