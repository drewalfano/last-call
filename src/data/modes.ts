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
  | "kings-cup"
  | "ride-the-bus"
  | "last-word"
  | "imposter"
  | "drink-if"
  | "most-likely-to"
  | "would-you-rather"
  | "truth-or-dare"
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
    id: "kings-cup",
    title: "Kings Cup",
    tagline: "Draw a card, do what it says.",
    color: "--cat-kings-cup",
  },
  {
    id: "ride-the-bus",
    title: "Ride the Bus",
    tagline: "Four rounds, then try to get off the bus.",
    color: "--cat-ride-the-bus",
  },
  {
    id: "last-word",
    title: "Last Word",
    tagline: "Category, letter, pass. Don't freeze.",
    color: "--cat-last-word",
  },
  {
    id: "imposter",
    title: "Imposter",
    tagline: "One of you doesn't know the word.",
    color: "--cat-imposter",
  },
  {
    id: "drink-if",
    title: "Drink If…",
    tagline: "No turns, no setup. Call yourself out.",
    color: "--cat-drink-if",
  },
  {
    id: "most-likely-to",
    title: "Most Likely To",
    tagline: "Point at someone. Loudest vote wins.",
    color: "--cat-most-likely-to",
  },
  {
    id: "would-you-rather",
    title: "Would You Rather",
    tagline: "Two bad options. Pick one.",
    color: "--cat-would-you-rather",
  },
  {
    id: "truth-or-dare",
    title: "Truth or Dare",
    tagline: "Commit before you see the card.",
    color: "--cat-truth-or-dare",
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
