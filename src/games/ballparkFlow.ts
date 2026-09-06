/**
 * BALLPARK'S ROUND, AS A STATE MACHINE.
 * ---------------------------------------------------------------
 * Pulled out of the component so the sequence can be read in one place and
 * tested without a browser. Every action is a no-op unless the round is in
 * the phase it applies to — which is what makes a double tap harmless: the
 * second press finds a state the first one already left, and returns it
 * unchanged. The component only runs side effects (drawing a card, sounding
 * a note) when the state actually changed.
 *
 *   intro     how to play, once per phone and again on request
 *   handoff   whose turn: the name, and the one action that reveals
 *   picking   the spectrum picker, reached from handoff
 *   reading   the Reader's screen; `revealed` says whether the target is up
 *   guessing  the table's dial
 *   reveal    both needles and the verdict
 */
export type Phase = "intro" | "handoff" | "picking" | "reading" | "guessing" | "reveal";

export interface Flow {
  phase: Phase;
  /** Where the intro goes back to: handoff, or nowhere on a first visit. */
  from: Phase | null;
  /** The target is on screen. Only ever true in `reading`. */
  revealed: boolean;
  guess: number;
  /** The dial has been touched this round. A tap in the middle counts. */
  touched: boolean;
  locked: number | null;
  round: number;
}

export type Action =
  | { type: "gotIt" }
  | { type: "howToPlay" }
  | { type: "pickSpectrum" }
  | { type: "spectrumPicked" }
  | { type: "reveal" }
  | { type: "hideAndPass" }
  | { type: "dial"; value: number }
  | { type: "lock" }
  | { type: "next" }
  | { type: "hidden" };

export const MIDPOINT = 50;

export function initialFlow(seenIntro: boolean): Flow {
  return {
    phase: seenIntro ? "handoff" : "intro",
    from: null,
    revealed: false,
    guess: MIDPOINT,
    touched: false,
    locked: null,
    round: 0,
  };
}

export function reduce(s: Flow, a: Action): Flow {
  switch (a.type) {
    case "gotIt":
      return s.phase === "intro" ? { ...s, phase: s.from ?? "handoff", from: null } : s;
    case "howToPlay":
      return s.phase === "handoff" ? { ...s, phase: "intro", from: "handoff" } : s;
    case "pickSpectrum":
      return s.phase === "handoff" ? { ...s, phase: "picking" } : s;
    case "spectrumPicked":
      return s.phase === "picking" ? { ...s, phase: "handoff" } : s;
    /* One deliberate action does both halves of the old handoff: it is the
       Reader taking the phone AND turning the card over. The name is on the
       button, so it cannot be pressed on someone else's behalf by reflex. */
    case "reveal":
      if (s.phase === "handoff") return { ...s, phase: "reading", revealed: true };
      if (s.phase === "reading" && !s.revealed) return { ...s, revealed: true };
      return s;
    /* The target goes down BEFORE the screen changes hands. Both happen in
       one state so there is no frame in which the guessing screen exists
       with the target still up. */
    case "hideAndPass":
      return s.phase === "reading" && s.revealed
        ? { ...s, phase: "guessing", revealed: false }
        : s;
    case "dial":
      return s.phase === "guessing" ? { ...s, guess: a.value, touched: true } : s;
    case "lock":
      return s.phase === "guessing" && s.touched
        ? { ...s, phase: "reveal", locked: s.guess }
        : s;
    case "next":
      return s.phase === "reveal"
        ? {
            ...s,
            phase: "handoff",
            revealed: false,
            guess: MIDPOINT,
            touched: false,
            locked: null,
            round: s.round + 1,
          }
        : s;
    /* The phone stopped being looked at. A target that is up goes down and
       stays down until the Reader reveals it again; nothing advances. */
    case "hidden":
      return s.phase === "reading" && s.revealed ? { ...s, revealed: false } : s;
  }
}

/** The phases where leaving would throw a live round away. */
export function isLive(phase: Phase): boolean {
  return phase === "reading" || phase === "guessing" || phase === "reveal";
}

/**
 * A POSITION SAID OUT LOUD.
 *
 * "62" tells a screen reader nothing about a spectrum whose two ends are the
 * entire content of the round, so every spoken position is worded against
 * them. Shared by the live dial's value text, the Reader's target and the
 * reveal's description, so the three cannot describe the same point three
 * ways.
 */
export function positionText(value: number, left: string, right: string): string {
  const v = Math.round(value);
  if (v <= 2) return `all the way at ${left}`;
  if (v >= 98) return `all the way at ${right}`;
  if (v >= 45 && v <= 55) return `halfway between ${left} and ${right}`;
  return `${v}% of the way from ${left} to ${right}`;
}
