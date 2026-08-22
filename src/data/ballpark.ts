import type { Pools } from "./pools";

/**
 * BALLPARK
 * ---------------------------------------------------------------
 * A pair of opposing concepts and a hidden point between them. The Reader
 * sees the point, says one thing that sits there, and the table argues its
 * way to a dial position.
 *
 * WHAT MAKES A PAIR WORK: two reasonable people must be able to put the same
 * clue in meaningfully different places. "Small / large" is objective — the
 * clue answers itself and nobody argues, which is the entire mechanic gone.
 * "Small / tiny" has almost no gap at all, and that is exactly why it plays:
 * the narrowness is the joke, and the table has to invent the scale before it
 * can use it.
 *
 * The other rule is that a pair must not need shared reference knowledge. A
 * pair that only lands for people who watched a particular show dies at a
 * mixed table, which is most tables.
 *
 * `left` maps to 0 on the dial and `right` to 100. The order inside a pair is
 * not always negative-to-positive and should not be regularised — several
 * here run the other way on purpose, so the table cannot learn that the good
 * end is always on the right and start reading the dial instead of the clue.
 */
export interface Spectrum {
  left: string;
  right: string;
}

/**
 * No 19+ pairs are written yet, so Night plays the Safe pool unchanged.
 *
 * The empty tier is spelled out rather than left off because it is the thing
 * a later pass fills in, and `supplement` is already the right policy for it:
 * these are dealt blind, one at a time, not browsed in a picker, so there is
 * no ordering claim to make. See the policy note in pools.ts.
 */
export const BALLPARK: Pools<Spectrum> = {
  safe: [
    // supplied
    { left: "Underrated", right: "Overrated" },
    { left: "Small", right: "Tiny" },
    { left: "Insignificant cultural event", right: "Significant cultural event" },
    { left: "Worst day of the year", right: "Best day of the year" },
    { left: "Unsexy emoji", right: "Sexy emoji" },
    { left: "Snack", right: "Meal" },

    // food and drink
    { left: "Soup", right: "Stew" },
    { left: "Sandwich", right: "Not a sandwich" },
    { left: "Breakfast food", right: "Dinner food" },
    { left: "Cheap drink", right: "Expensive drink" },
    { left: "Sad lunch", right: "Triumphant lunch" },
    { left: "Beer", right: "Not beer" },
    { left: "Acceptable pizza topping", right: "War crime" },
    { left: "Hangover cure", right: "Hangover cause" },

    // social
    { left: "Rude", right: "Polite" },
    { left: "Acquaintance", right: "Best friend" },
    { left: "Cancel plans guilt free", right: "Must attend" },
    { left: "Fine to text at 2am", right: "Absolutely not" },
    { left: "Small talk", right: "Real conversation" },
    { left: "Introvert activity", right: "Extrovert activity" },
    { left: "Green flag", right: "Red flag" },
    { left: "Compliment", right: "Insult" },
    { left: "Bad first date", right: "Great first date" },

    // taste and status
    { left: "Trashy", right: "Classy" },
    { left: "Cringe", right: "Based" },
    { left: "Guilty pleasure", right: "Genuinely good" },
    { left: "Try hard", right: "Effortless" },
    { left: "Dated", right: "Timeless" },
    { left: "Cheap looking", right: "Expensive looking" },
    { left: "Sellout", right: "Artist" },
    { left: "Ugly", right: "Beautiful" },
    { left: "Basic", right: "Niche" },

    // difficulty and risk
    { left: "Easy", right: "Hard" },
    { left: "Safe", right: "Dangerous" },
    { left: "Minor inconvenience", right: "Ruins your week" },
    { left: "Chore", right: "Hobby" },
    { left: "Skill", right: "Luck" },
    { left: "Bad idea", right: "Good idea" },
    { left: "Forgivable mistake", right: "Unforgivable" },

    // objects and places
    { left: "Vehicle", right: "Not a vehicle" },
    { left: "Furniture", right: "Decoration" },
    { left: "Clean", right: "Dirty" },
    { left: "Bad place to live", right: "Good place to live" },
    { left: "Tourist trap", right: "Hidden gem" },
    { left: "Toy", right: "Tool" },
    { left: "Disposable", right: "Heirloom" },

    // culture
    { left: "Forgotten", right: "Iconic" },
    { left: "Bad movie", right: "Good movie" },
    { left: "One hit wonder", right: "Legend" },
    { left: "Made for kids", right: "Made for adults" },
    { left: "Fad", right: "Institution" },
    { left: "Villain", right: "Hero" },
    { left: "Sport", right: "Not a sport" },

    // time and feeling
    { left: "Boring", right: "Exciting" },
    { left: "Too early", right: "Too late" },
    { left: "Wastes time", right: "Time well spent" },
    { left: "Stressful", right: "Relaxing" },
    { left: "Old", right: "New" },
    { left: "Temporary", right: "Permanent" },
    { left: "Nightmare", right: "Dream" },
  ],
  night: [],
};

/**
 * THE THREE ZONES.
 *
 * How close the group got, drawn as three arcs growing out of the answer.
 * They are a PICTURE and nothing else — there are no points behind them and
 * nothing accumulates. What they are for is making "off by six" mean
 * something at a glance, because six units of a spectrum is not a quantity
 * anyone has an instinct for until they can see how much of the dial it is.
 *
 * Written as half-widths in dial units, where the whole arc is 100 units of
 * 180 degrees — so one unit is 1.8 degrees, and the innermost zone is a
 * little over five degrees either side of the answer. Ordered innermost
 * first; `zoneFor` takes the first one the distance fits in, so each entry is
 * an upper bound and the lower edge of each is the one before it.
 *
 * ONE ARRAY, read by the reveal that draws the arcs and the line that names
 * the result. If the widths were written twice the picture and the words
 * would drift, and the picture is how the words get their meaning.
 */
export const ZONES = [
  /* NOT "Dead on." — that one is spoken for. The line under the dial reads
     "<zone> Off by <n>.", so an innermost zone called "Dead on." produced
     "Dead on. Off by 3.", which argues with itself. An exact hit is its own
     sentence and says "Dead on." with no number after it; this zone is the
     three units either side of that, and wants a name that survives having a
     distance attached to it. */
  { within: 3, name: "Nailed it." },
  { within: 8, name: "Close." },
  { within: 15, name: "Nearly." },
] as const;

/** The zone a distance lands in, or null for a miss beyond the outermost. */
export function zoneFor(distance: number): (typeof ZONES)[number] | null {
  for (const zone of ZONES) {
    if (distance <= zone.within) return zone;
  }
  return null;
}

/**
 * THE TARGET IS INSET, AND THAT IS NOT A ROUNDING DETAIL.
 *
 * A target at 2 cannot be clued. The Reader has to name something MORE
 * extreme than the left-hand concept already is, and there is nothing out
 * there — so the clue lands at the endpoint, the table dials to the endpoint,
 * and the round scores four points without anyone playing. Pulling the range
 * in to 12–88 leaves room on both sides of every target for a clue to be
 * placed, which is the only thing that makes the guess a guess.
 */
export const TARGET_MIN = 12;
export const TARGET_MAX = 88;

export function randomTarget(): number {
  return TARGET_MIN + Math.floor(Math.random() * (TARGET_MAX - TARGET_MIN + 1));
}
