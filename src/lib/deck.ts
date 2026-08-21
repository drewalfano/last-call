import { useCallback, useEffect, useRef, useState } from "react";
import { audio } from "./audio";

/** Fisher–Yates. Returns a new array; never mutates the source pool. */
export function shuffle<T>(source: readonly T[]): T[] {
  const out = source.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function randomItem<T>(source: readonly T[]): T {
  return source[Math.floor(Math.random() * source.length)];
}

export interface Deck<T> {
  /** The card currently face-up. Undefined only if the pool is empty. */
  current: T | undefined;
  /** Advance to the next card, reshuffling automatically once exhausted. */
  draw: () => void;
  /** Reshuffle from scratch and deal a fresh first card. */
  reset: () => void;
  /**
   * Jump forward to the next card matching `match`, skipping everything
   * between. Forward only, and never past the end of the pass — a caller
   * that wants to know whether a match exists ahead should check the pool
   * rather than call this and hope.
   *
   * Last Call uses it to leave a tier early. The cards jumped over are gone
   * for the pass, which is the point: skipping a level is a decision about
   * the round, not a detour that gets replayed later.
   */
  skipTo: (match: (card: T) => boolean) => void;
  /** True when `current` is the last card of the pass. */
  atEnd: boolean;
  /** 1-based position of `current` within the current pass. */
  position: number;
  /** Size of the pool. */
  total: number;
  /** How many full passes through the pool have been completed. */
  cycle: number;
  /** Increments on every draw — handy as a React key to retrigger deal animations. */
  drawCount: number;
}

interface DeckState<T> {
  queue: T[];
  index: number;
  cycle: number;
  drawCount: number;
}

/**
 * How a pool is laid out into a pass. Defaults to a flat shuffle; Last Call
 * passes its own arranger so a round escalates through intensity tiers
 * instead of dealing chaos out of the gate.
 */
export type Arrange<T> = (pool: readonly T[]) => T[];

function initial<T>(source: readonly T[], arrange: Arrange<T>): DeckState<T> {
  return { queue: arrange(source), index: 0, cycle: 0, drawCount: 0 };
}

/**
 * A shuffled, no-repeat deck.
 *
 * Every prompt in the pool is shown once before any repeats. When the pool
 * runs out it reshuffles and keeps going — with a guard so the reshuffle
 * can't deal the same card twice across the seam, which is the one repeat
 * a player would actually notice.
 *
 * Passing a different `source` (e.g. the global content mode flipped from
 * safe to night) rebuilds the deck from the new pool.
 */
export function useDeck<T>(source: readonly T[], arrange?: Arrange<T>): Deck<T> {
  // Held in refs so callers can pass an inline arranger without the deck
  // rebuilding itself on every render.
  const arrangeRef = useRef<Arrange<T>>(arrange ?? shuffle);
  arrangeRef.current = arrange ?? shuffle;
  const sourceRef = useRef(source);

  const [state, setState] = useState<DeckState<T>>(() => initial(source, arrangeRef.current));

  // Rebuild when the underlying pool changes identity — this is how a
  // Safe → Night switch re-points a mid-session deck at the other pool.
  useEffect(() => {
    if (sourceRef.current === source) return;
    sourceRef.current = source;
    setState(initial(source, arrangeRef.current));
  }, [source]);

  /**
   * A CARD BEING DRAWN IS THE SOUND, not a card being on screen.
   *
   * This lives here rather than at the eleven call sites because this is the
   * event — every mode that deals a prompt comes through this function, and
   * nothing else does. It was briefly hung off the flip animation instead,
   * which catches far more: every phase change flips a card too, so Odd One
   * Out's cover screens and every mode opening made a noise. Those are
   * transitions between screens. Drawing is the game.
   *
   * Outside the updater below, which React may run more than once for one
   * event.
   */
  const draw = useCallback(() => {
    audio.play("card");
    setState((prev) => {
      if (prev.queue.length === 0) return prev;
      if (prev.index + 1 < prev.queue.length) {
        return { ...prev, index: prev.index + 1, drawCount: prev.drawCount + 1 };
      }
      const last = prev.queue[prev.index];
      const next = arrangeRef.current(sourceRef.current);
      // Avoid dealing the same card back-to-back across the reshuffle seam.
      if (next.length > 1 && next[0] === last) {
        [next[0], next[next.length - 1]] = [next[next.length - 1], next[0]];
      }
      return { queue: next, index: 0, cycle: prev.cycle + 1, drawCount: prev.drawCount + 1 };
    });
  }, []);

  /* Also a deal. Last Call's New round is the only caller: the deck has run
     out, and this puts a fresh prompt on screen. The source-change effect
     above rebuilds state directly rather than through here, so opening a mode
     still arrives in silence. */
  const reset = useCallback(() => {
    audio.play("card");
    setState(initial(sourceRef.current, arrangeRef.current));
  }, []);

  /* Last Call's skip-a-level. It deals a card like any other draw — it just
     chooses which one — so it sounds like one. */
  const skipTo = useCallback((match: (card: T) => boolean) => {
    audio.play("card");
    setState((prev) => {
      for (let i = prev.index + 1; i < prev.queue.length; i++) {
        if (match(prev.queue[i])) {
          return { ...prev, index: i, drawCount: prev.drawCount + 1 };
        }
      }
      return prev;
    });
  }, []);

  return {
    current: state.queue[state.index],
    draw,
    reset,
    skipTo,
    atEnd: state.queue.length > 0 && state.index === state.queue.length - 1,
    position: state.queue.length === 0 ? 0 : state.index + 1,
    total: state.queue.length,
    cycle: state.cycle,
    drawCount: state.drawCount,
  };
}
