import { describe, expect, it } from "vitest";
import { shuffle } from "../lib/deck";

/**
 * The reshuffle seam: a pass through the pool must not repeat a card, and the
 * first card of the next pass must not be the last card of this one. The hook
 * does this inside a React updater, so the test drives the same rule on a
 * plain queue.
 */
function advance<T>(queue: T[], index: number, pool: readonly T[]) {
  if (index + 1 < queue.length) return { queue, index: index + 1, reshuffled: false };
  const last = queue[index];
  const next = shuffle(pool);
  if (next.length > 1 && next[0] === last) [next[0], next[next.length - 1]] = [next[next.length - 1], next[0]];
  return { queue: next, index: 0, reshuffled: true };
}

describe("deck exhaustion", () => {
  it("shows every card once before any repeats, then reshuffles", () => {
    const pool = ["a", "b", "c", "d", "e"];
    let state = { queue: shuffle(pool), index: 0, reshuffled: false };
    const seen = [state.queue[0]];
    for (let i = 1; i < pool.length; i++) {
      state = advance(state.queue, state.index, pool);
      expect(state.reshuffled).toBe(false);
      seen.push(state.queue[state.index]);
    }
    expect([...seen].sort()).toEqual(pool);
    state = advance(state.queue, state.index, pool);
    expect(state.reshuffled).toBe(true);
  });

  it("never deals the same card across the seam", () => {
    const pool = ["a", "b", "c"];
    for (let trial = 0; trial < 200; trial++) {
      const queue = shuffle(pool);
      const last = queue[queue.length - 1];
      const next = advance(queue, queue.length - 1, pool);
      expect(next.queue[0]).not.toBe(last);
    }
  });

  it("shuffle returns a permutation and leaves the source alone", () => {
    const pool = [1, 2, 3, 4, 5, 6];
    const out = shuffle(pool);
    expect([...out].sort()).toEqual(pool);
    expect(pool).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
