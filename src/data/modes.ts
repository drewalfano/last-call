/**
 * MODE REGISTRY
 * The single source of truth for the ten game modes.
 * Home cards, the spin wheel and the screen state machine all read
 * from this list, so adding a mode means editing exactly one array.
 *
 * `color` is a CSS custom property name from tokens.css. It is carried
 * from the Home card into the mode's own screens as a wayfinding cue,
 * and is deliberately identical in Safe and Night shells.
 */

export type ModeId =
  | "last-call"
  | "imposter"
  | "last-word"
  | "most-likely-to"
  | "kings-cup"
  | "ride-the-bus"
  | "say-the-same-thing"
  | "rank-it"
  | "the-number-game"
  | "hot-seat";

export interface ModeDef {
  id: ModeId;
  /** Card + header title. */
  title: string;
  /** One line under the title on the Home card. Keep it to a single line. */
  tagline: string;
  /** CSS custom property carrying this mode's flat category color. */
  color: string;
  /** The app's namesake gets a star on Home. */
  signature?: boolean;
  /**
   * A drinking game at heart: the drinking IS the mechanic, not a prompt it
   * happens to carry. Kings Cup's rules ARE drink instructions and Ride the
   * Bus is a forfeit ladder. Drink If… was the third and is retired; its two
   * hundred-odd prompts are still in src/data/drinkIf.ts, unimported.
   *
   * They are exempt from anything that tries to make the app sober, because
   * there is nothing left of them once you do. What it gates is
   * `pickForMe` — see Home. The cards stay on the deck at every level and a
   * table that wants one can still tap it; what changes is that the app
   * stops handing one to a table that has just told it nobody is drinking.
   */
  drinking?: boolean;
}

/**
 * Order is deliberate: highest-replay modes sit at the top, because
 * ten cards scroll past a single screen.
 */
export const MODES: ModeDef[] = [
  {
    id: "last-call",
    title: "Last Call",
    tagline: "The wildcard. Never know what's coming.",
    color: "--cat-last-call",
    signature: true,
  },
  {
    id: "last-word",
    title: "Letter Rip",
    tagline: "Category, letter, pass. Don't freeze.",
    color: "--cat-last-word",
  },
  {
    id: "imposter",
    title: "Odd One Out",
    tagline: "One of you doesn't know the word.",
    color: "--cat-imposter",
  },
  {
    id: "rank-it",
    title: "Rank It",
    tagline: "Guess how they'd rank it.",
    color: "--cat-rank-it",
  },
  {
    id: "most-likely-to",
    title: "Most Likely To",
    tagline: "Count to three, then point.",
    color: "--cat-most-likely-to",
  },
  {
    id: "kings-cup",
    drinking: true,
    title: "Kings Cup",
    tagline: "Draw a card, do what it says.",
    color: "--cat-kings-cup",
  },
  {
    id: "ride-the-bus",
    drinking: true,
    title: "Ride the Bus",
    tagline: "Four rounds, then try to get off the bus.",
    color: "--cat-ride-the-bus",
  },
  {
    id: "say-the-same-thing",
    title: "Same Page",
    tagline: "Two people, one word. Keep converging.",
    color: "--cat-say-the-same-thing",
  },
  {
    id: "the-number-game",
    title: "Overbid",
    tagline: "Bid high. Get called out.",
    color: "--cat-the-number-game",
  },
  {
    id: "hot-seat",
    title: "Hot Seat",
    tagline: "One person. Everyone else with opinions.",
    color: "--cat-hot-seat",
  },
];

export const MODE_BY_ID: Record<ModeId, ModeDef> = Object.fromEntries(
  MODES.map((m) => [m.id, m]),
) as Record<ModeId, ModeDef>;
