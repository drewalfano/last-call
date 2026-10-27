/**
 * DRAG TO REORDER, AS ARITHMETIC.
 * ---------------------------------------------------------------
 * Rank It's list was ordered by tapping the items in turn, which made
 * changing your mind a Start over. Dragging makes it another drag: the list
 * is always a complete order, just not yet the one you want.
 *
 * Every row is the same height, so where a dragged row lands is how many rows
 * it has travelled, rounded — no hit-testing against the others. That is what
 * lets this stay a handful of pure functions the component and the Rank It
 * state can share, and what the tests below it pin.
 */

/** `list` with the item at `from` moved to `to`. Same array if nothing moves. */
export function move<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return list.slice();
  }
  const next = list.slice();
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}

/**
 * The slot a row picked up at `from` is over, `dy` pixels later, when each row
 * plus its gap is `step` tall. Past either end it stays at that end.
 */
export function slotFor(from: number, dy: number, step: number, count: number): number {
  if (step <= 0 || count <= 0) return from;
  const to = from + Math.round(dy / step);
  return Math.min(count - 1, Math.max(0, to));
}

/**
 * How far a row that is NOT being dragged shifts while another one is held
 * over `to`: one step toward the gap the dragged row left, if it sits between
 * the two. In rows, not pixels.
 */
export function shiftFor(index: number, from: number, to: number): number {
  if (index === from) return 0;
  if (from < to && index > from && index <= to) return -1;
  if (from > to && index < from && index >= to) return 1;
  return 0;
}

/** Where an arrow key sends the focused row, or null if it does not move. */
export function stepKey(key: string, index: number, count: number): number | null {
  const to = key === "ArrowUp" ? index - 1 : key === "ArrowDown" ? index + 1 : null;
  if (to === null || to < 0 || to >= count) return null;
  return to;
}

/**
 * A starting order. Shuffled so nobody begins from the list as written, and
 * never handed back as `avoid` — for the guessers, the ranker's own order — so
 * the table never opens on the answer. Fisher–Yates, with `rand` injectable for
 * the tests.
 */
export function shuffled<T>(
  list: readonly T[],
  avoid: readonly T[] = list,
  rand: () => number = Math.random,
): T[] {
  if (list.length < 2) return list.slice();
  for (;;) {
    const next = list.slice();
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    if (next.some((item, i) => item !== avoid[i])) return next;
  }
}
