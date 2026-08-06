import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Countdown driven by a wall-clock deadline polled every 100ms.
 *
 * Deliberately not a decrementing counter: intervals are throttled in
 * background tabs, so a counter drifts badly while a deadline stays exact.
 */
export function useTimer(onDone: () => void) {
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  });

  const clear = useCallback(() => {
    if (intervalRef.current !== null) clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  const stop = useCallback(() => {
    clear();
    setRunning(false);
  }, [clear]);

  const start = useCallback(
    (seconds: number) => {
      clear();
      setRemaining(seconds);
      setRunning(true);
      const deadline = Date.now() + seconds * 1000;
      intervalRef.current = window.setInterval(() => {
        const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        setRemaining(left);
        if (left <= 0) {
          clear();
          setRunning(false);
          onDoneRef.current();
        }
      }, 100);
    },
    [clear],
  );

  useEffect(() => clear, [clear]);

  return { remaining, running, start, stop, setRemaining };
}
