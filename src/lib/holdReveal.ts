/**
 * HOLD TO REVEAL, AS STATE.
 * ---------------------------------------------------------------
 * The tap reveal turned a secret face up and left it there until somebody
 * remembered to turn it back. A hold cannot be left on: the role is on screen
 * for exactly as long as one finger is down, and the moment it lifts the card
 * is gone and the next seat is up.
 *
 * Kept as a reducer with no DOM in it so the rules are testable here and the
 * games can fold it into their own flows — imposterLogic and ballparkFlow in
 * Round 3 — without each one re-deciding what a release means.
 *
 * WHO IS HOLDING. A press records its source, and only the same source can
 * let go: a second finger landing and lifting does not end the first one's
 * hold, and a key-up does not end a pointer's. A pointer is told apart by its
 * id for the same reason.
 *
 * HOW IT ENDED. `released` carries the reason. Letting go is the end of a
 * turn and moves to the next seat; the page being hidden is not a decision
 * anyone made, so the caller may treat it differently. Either way the role is
 * off screen, which is the only thing this module promises.
 */

export type HoldSource = "pointer" | "key";

export type HoldState =
  | { phase: "idle" }
  | { phase: "holding"; source: HoldSource; pointerId: number | null }
  | { phase: "released"; reason: "let-go" | "hidden" };

export type HoldEvent =
  | { type: "press"; source: HoldSource; pointerId?: number }
  | { type: "release"; source: HoldSource; pointerId?: number }
  | { type: "hide" }
  | { type: "reset" };

export const initialHold: HoldState = { phase: "idle" };

export function holdReducer(s: HoldState, e: HoldEvent): HoldState {
  switch (e.type) {
    case "press":
      // A press while held is a second finger or a key repeat. Ignored.
      if (s.phase === "holding") return s;
      return { phase: "holding", source: e.source, pointerId: e.pointerId ?? null };
    case "release":
      if (s.phase !== "holding" || s.source !== e.source) return s;
      if (e.source === "pointer" && s.pointerId !== (e.pointerId ?? null)) return s;
      return { phase: "released", reason: "let-go" };
    case "hide":
      return s.phase === "holding" ? { phase: "released", reason: "hidden" } : s;
    case "reset":
      return initialHold;
  }
}

/** The one question the screen asks: is the secret face up right now? */
export function isShowing(s: HoldState): boolean {
  return s.phase === "holding";
}
