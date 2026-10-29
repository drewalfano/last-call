/**
 * ODD ONE OUT'S DEAL, WITHOUT THE SCREENS.
 * ---------------------------------------------------------------
 * The parts of the mode that decide who gets what, kept away from the
 * component so they can be tested on their own and so the numbers Home
 * quotes for the mode come from the same constants the mode enforces.
 */
export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 10;

export const clampCount = (n: number): number => Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, n));

/**
 * The circle, cut at a random seat: 3, 4, 5, 1, 2 at a table of five.
 *
 * Every player still appears exactly once, and who opens is uniform over the
 * table. What it gives back over a shuffle is the pass: each reveal hands the
 * phone to the seat next door, which is where the roster's own order came
 * from in the first place.
 */
export function revealOrder(count: number, rng: () => number = Math.random): number[] {
  const start = Math.min(count - 1, Math.floor(rng() * count));
  return Array.from({ length: count }, (_, i) => (start + i) % count);
}

export interface Deal {
  imposter: number;
  order: number[];
}

export function deal(count: number, rng: () => number = Math.random): Deal {
  const n = clampCount(count);
  return {
    imposter: Math.min(n - 1, Math.floor(rng() * n)),
    order: revealOrder(n, rng),
  };
}

/**
 * HOW THE ROSTER IS BEING USED, SAID ON THE SETUP CARD.
 *
 * Names are used in roster order until they run out, then numbers. The two
 * cases worth a sentence are the ones a table would otherwise discover mid-
 * deal: a roster longer than the game — the extra names simply are not
 * dealt, and this says which ones — and a roster longer than the count the
 * stepper is set to, where the first N play.
 */
export function rosterNote(rosterSize: number, count: number): string {
  if (rosterSize === 0) return "Add names on Home to use them here.";
  if (rosterSize > MAX_PLAYERS) {
    return `Your roster has ${rosterSize}. This plays up to ${MAX_PLAYERS}, so the first ${count} names play; reorder on Home to choose who.`;
  }
  if (rosterSize > count) return `The first ${count} of your ${rosterSize} names play.`;
  if (rosterSize === count) return "Using your player names.";
  return `Using your ${rosterSize} names, then numbers.`;
}

export type RolePhase = "setup" | "picking" | "cover" | "role" | "ready";

export interface RoleState {
  phase: RolePhase;
  count: number;
  at: number;
}

/**
 * The phone stopped being looked at with a role on screen. Back to the cover
 * for the SAME player: nothing advances, and the role has to be asked for
 * again. A cover screen is safe by construction — a name and a warning.
 */
export function onHidden<S extends RoleState>(s: S): S {
  return s.phase === "role" ? { ...s, phase: "cover" } : s;
}

/** Hide role: on to the next cover, or to the table once everyone has seen theirs. */
export function afterHide<S extends RoleState>(s: S): S {
  if (s.phase !== "role") return s;
  const next = s.at + 1;
  return next >= s.count ? { ...s, phase: "ready" } : { ...s, phase: "cover", at: next };
}

/** The phases where leaving would throw a live round away. */
/**
 * HOLD TO REVEAL, on a tablet: the role is up only while a finger is on the
 * button. Pressing turns this seat's cover over; letting go is the same
 * hide-and-pass the phone's button does, straight to the next seat's cover.
 * A hold that ended because the page hid is `onHidden` — the role goes back
 * under the same seat's cover and has to be held for again. Every reveal is
 * still bracketed by a cover; only the hand on it changed.
 */
export function onHold<S extends RoleState>(s: S): S {
  return s.phase === "cover" ? { ...s, phase: "role" } : s;
}

export function onLetGo<S extends RoleState>(s: S, reason: "let-go" | "hidden"): S {
  return reason === "hidden" ? onHidden(s) : afterHide(s);
}

export function isLive(phase: RolePhase): boolean {
  return phase === "cover" || phase === "role" || phase === "ready";
}
