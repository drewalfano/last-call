/**
 * LETTER BANK LAYOUT — A TEMPORARY SWITCH.
 *
 * Letter Rip's twenty letters are a 4x5 grid. This lets the installed app run
 * them as two concentric rings instead, so the choice can be made at a table
 * on a real phone rather than argued about from a screenshot.
 *
 * It is here to be REMOVED. The grid is not in question — measured in the
 * board a 375pt phone actually gives the bank, four columns yield a 77.8pt
 * letter and the best ring yields 61.6pt, because a ring spends the middle of
 * the board on a hole. What no measurement settles is whether a ring is worth
 * a fifth of the tap target for the way it looks and the way it puts the clock
 * in the middle of the thing it is timing. That is a question for a table.
 *
 * Defaults to the grid, so nothing changes for anyone who does not go looking.
 *
 * Held outside React, like the mute flag in audio.ts and for the same reason:
 * one screen reads it, once, on the way in. The Settings control keeps its own
 * copy for display — see the note there.
 */

const KEY = "lastcall.letterbank";

export type Bank = "grid" | "rings";

export function getBank(): Bank {
  try {
    return localStorage.getItem(KEY) === "rings" ? "rings" : "grid";
  } catch {
    /* private mode: the grid, which is what it would have been anyway */
    return "grid";
  }
}

export function setBank(value: Bank): void {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    /* holds for this session and no longer */
  }
}

/**
 * WHERE EACH LETTER SITS ON THE RINGS, as percentages of a square stage.
 *
 * Thirteen outside and seven inside, which is the split that survives: every
 * division from 9+11 to 17+3 was solved for the largest circle that still
 * clears its own ring, the other ring and the edge of the board, and this one
 * came out on top at 61.6pt against the grid's 77.8pt.
 *
 * Percentages rather than points so the whole thing scales with whatever box
 * the phone gives it, and computed here rather than in CSS because `sin()` and
 * `cos()` in a stylesheet would decide this on the device — where a browser
 * without them piles all twenty letters on the centre spot, which is not a
 * failure anyone should discover at a table.
 *
 * The inner ring is turned half a step so its letters sit in the outer ring's
 * gaps; that stagger is what buys the last few points of diameter.
 */
const OUTER = 13;

/** Diameter, and the two ring radii. Fractions of the stage's side. */
export const RING_D = 0.182;
const R_OUTER = 0.409;
const R_INNER = 0.2166;

export function ringSeats(count: number): { x: number; y: number }[] {
  return Array.from({ length: count }, (_, i) => {
    const outer = i < OUTER;
    const n = outer ? OUTER : count - OUTER;
    const step = outer ? i : i - OUTER;
    const r = outer ? R_OUTER : R_INNER;
    /* A at the top, going clockwise, the way the grid reads left to right. */
    const angle = -Math.PI / 2 + (2 * Math.PI * step) / n + (outer ? 0 : Math.PI / n);
    return { x: 50 + r * 100 * Math.cos(angle), y: 50 + r * 100 * Math.sin(angle) };
  });
}
