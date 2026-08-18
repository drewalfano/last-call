import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A countdown that can't be cheated.
 *
 * Deadline-based rather than decrementing a counter: a backgrounded tab, a
 * dropped frame or a slow render can't hand a player extra time, because the
 * remaining time is always recomputed from the clock rather than accumulated.
 *
 * Extracted from Last Word, which had this inline and is the reason the pattern
 * exists — it's now shared with The Number Game's challenge timer.
 */
export interface Countdown {
  /** Milliseconds left. */
  remaining: number;
  /** Whole seconds left, rounded up — what you put on screen. */
  seconds: number;
  /** 1 → 0 across the run, for a sweep or a bar. */
  progress: number;
  running: boolean;
  /** True once it has run down. Cleared by the next start(). */
  expired: boolean;
  start: (seconds?: number) => void;
  stop: () => void;
}

export function useCountdown(defaultSeconds: number, onExpire?: () => void): Countdown {
  const [running, setRunning] = useState(false);
  const [expired, setExpired] = useState(false);
  const [remaining, setRemaining] = useState(defaultSeconds * 1000);
  const total = useRef(defaultSeconds * 1000);
  const deadline = useRef(0);
  // Held in a ref so an inline arrow from the caller doesn't restart the loop.
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const start = useCallback(
    (seconds?: number) => {
      const ms = (seconds ?? defaultSeconds) * 1000;
      total.current = ms;
      deadline.current = performance.now() + ms;
      setRemaining(ms);
      setExpired(false);
      setRunning(true);
    },
    [defaultSeconds],
  );

  const stop = useCallback(() => setRunning(false), []);

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const tick = () => {
      const left = deadline.current - performance.now();
      if (left <= 0) {
        setRemaining(0);
        setRunning(false);
        setExpired(true);
        onExpireRef.current?.();
        return;
      }
      setRemaining(left);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  return {
    remaining,
    seconds: Math.ceil(remaining / 1000),
    progress: total.current === 0 ? 0 : remaining / total.current,
    running,
    expired,
    start,
    stop,
  };
}

/**
 * Haptics where the device has them, silence where it doesn't.
 *
 * iOS Safari has no Vibration API at all, so this is a no-op there rather than
 * an error — the optional call is the whole guard.
 */
export function buzz(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* some browsers throw on odd patterns; a missing buzz is never fatal */
  }
}
