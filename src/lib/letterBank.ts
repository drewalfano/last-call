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

/**
 * Diameter and the two ring radii, as fractions of the stage's side, solved
 * so that NOTHING is noticeably tighter than anything else.
 *
 * The first pass sized each constraint on its own and got three different
 * clearances — 4.8pt between outer neighbours, 3.7pt between the rings and
 * 2.1pt between inner neighbours. The inner ring was the tight one, and since
 * S and T are inner neighbours that is the pair that showed it.
 *
 * These are solved together instead: the inner radius is set from the letter
 * it has to clear rather than from the ring it sits on, and the diameter is
 * the largest that keeps every gap at or above the target. 6.3pt between
 * inner neighbours and between the rings, 8.3pt between outer neighbours.
 *
 * DEAD EQUAL IS NOT AVAILABLE, and it is worth writing down so nobody spends
 * an afternoon on it. Scale the whole figure so both rings have the same
 * centre spacing and the closest ring-to-ring distance comes to 0.938 of it,
 * whatever the angle — so a ring-to-ring pair is always tighter than a
 * within-ring pair, and the outer ring, pinned to the edge of the stage, is
 * always the loosest. Equal inner and cross gaps with a wider outer one is
 * the flattest this arrangement goes.
 */
export const RING_D = 0.174;
const R_OUTER = 0.413;
const R_INNER = 0.22127;

export function ringSeats(count: number): { x: number; y: number }[] {
  return Array.from({ length: count }, (_, i) => {
    const outer = i < OUTER;
    const n = outer ? OUTER : count - OUTER;
    const step = outer ? i : i - OUTER;
    const r = outer ? R_OUTER : R_INNER;
    /* A at the top, going clockwise, the way the grid reads left to right.
       The inner ring is turned a half-TURN, not half a step. 13 and 7 are
       coprime, so the two rings drift in and out of alignment however they
       are offset, and the angle that pushes the closest pair furthest apart
       is 180° — checked at every tenth of a degree. Half a step, which is the
       obvious guess and what this used to be, is one of the worse ones. */
    const angle = -Math.PI / 2 + (2 * Math.PI * step) / n + (outer ? 0 : Math.PI);
    return { x: 50 + r * 100 * Math.cos(angle), y: 50 + r * 100 * Math.sin(angle) };
  });
}
