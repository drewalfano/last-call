/**
 * MODE REGISTRY
 * The single source of truth for the eleven game modes.
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
  | "hot-seat"
  | "ballpark";

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
  /**
   * WHO IT PLAYS WITH, DERIVED FROM THE RULES AND NOTHING ELSE.
   *
   * `min` is the smallest table the mechanic works at, read off the mode's
   * own code where it enforces one (Odd One Out deals to 3-10) and off the
   * rule where it does not (Most Likely To needs a third person to point at;
   * a pair pointing at each other is not a vote). `max` is only set where the
   * mode enforces one. These feed two things: the cue line on the Home card,
   * and what Pick a game for me will volunteer to a roster of a given size.
   */
  players: PlayerRange;
  /**
   * ROUGH, AND SAID SO. Nothing here was timed with a stopwatch; these are
   * the order of magnitude a table should expect, so Home can tell a two-
   * minute round from a twenty-minute game. `per` matters more than the
   * number: a round of Ballpark ends and the next one starts, where a game of
   * Kings Cup runs to the fourth king. The label rounds and prefixes "~".
   */
  pace: Pace;
  /**
   * The one card Home quietly points a first-timer at. Exactly one mode
   * carries it, and it is the one with no private screen, no setup and a
   * card that explains itself in a sentence.
   */
  starter?: boolean;
}

export interface PlayerRange {
  min: number;
  max?: number;
}

export interface Pace {
  minutes: number;
  per: "round" | "game";
}

/**
 * Order is deliberate: highest-replay modes sit at the top, because
 * eleven cards scroll past a single screen.
 */
export const MODES: ModeDef[] = [
  {
    id: "last-call",
    players: { min: 2 },
    pace: { minutes: 1, per: "round" },
    title: "Last Call",
    tagline: "The wildcard. Never know what's coming.",
    color: "--cat-last-call",
    signature: true,
  },
  {
    id: "imposter",
    // MIN_PLAYERS / MAX_PLAYERS in games/imposterLogic.ts. Kept in step by a test.
    players: { min: 3, max: 10 },
    pace: { minutes: 5, per: "round" },
    title: "Odd One Out",
    tagline: "One of you doesn't know the word.",
    color: "--cat-imposter",
  },
  /*
   * THIRD, and it is the pool that puts it there rather than the mode being
   * new. Almost everything below it is spent by being played: a Rank It set,
   * a Hot Seat question and a Most Likely To card are each used up the first
   * time a table sees them, so the count in the file is very close to the
   * number of rounds in it. Ballpark's sixty pairs are not — the target moves
   * every round and the clue-giver changes with it, so "Underrated /
   * Overrated" is a different argument the fourth time it comes up. The two
   * above it are the namesake and the one that already behaves this way.
   */
  {
    id: "ballpark",
    // One Reader and at least one person guessing.
    players: { min: 2 },
    pace: { minutes: 2, per: "round" },
    title: "Ballpark",
    tagline: "One clue, one dial. Get close.",
    color: "--cat-ballpark",
  },
  {
    id: "last-word",
    players: { min: 2 },
    pace: { minutes: 1, per: "round" },
    starter: true,
    title: "Letter Rip",
    tagline: "Category, letter, pass. Don't freeze.",
    color: "--cat-last-word",
  },
  {
    id: "rank-it",
    // One Ranker and at least one person guessing.
    players: { min: 2 },
    pace: { minutes: 3, per: "round" },
    title: "Rank It",
    tagline: "Guess how they'd rank it.",
    color: "--cat-rank-it",
  },
  {
    id: "kings-cup",
    // 52 cards and four kings; the game has an end, so the pace is a game.
    players: { min: 2 },
    pace: { minutes: 20, per: "game" },
    drinking: true,
    title: "Kings Cup",
    tagline: "Draw a card, do what it says.",
    color: "--cat-kings-cup",
  },
  {
    id: "ride-the-bus",
    // One rider at a time; a full ride is four rounds and the bus.
    players: { min: 2 },
    pace: { minutes: 5, per: "game" },
    drinking: true,
    title: "Ride the Bus",
    tagline: "Four rounds, then try to get off the bus.",
    color: "--cat-ride-the-bus",
  },
  {
    id: "say-the-same-thing",
    players: { min: 2 },
    pace: { minutes: 1, per: "round" },
    title: "Same Page",
    tagline: "Two people, one word. Keep converging.",
    color: "--cat-say-the-same-thing",
  },
  {
    id: "the-number-game",
    // MIN_SEATS in games/NumberGame.tsx without a roster; a roster of any
    // size deals every name a seat, so there is no ceiling to state.
    players: { min: 2 },
    pace: { minutes: 3, per: "round" },
    title: "Overbid",
    tagline: "Bid high. Get called out.",
    color: "--cat-the-number-game",
  },
  {
    id: "most-likely-to",
    // Everyone points at someone. Two people can only point at each other.
    players: { min: 3 },
    pace: { minutes: 1, per: "round" },
    title: "Most Likely To",
    tagline: "Count to three, then point.",
    color: "--cat-most-likely-to",
  },
  {
    id: "hot-seat",
    // One in the seat and a table with opinions, which takes two of them.
    players: { min: 3 },
    pace: { minutes: 4, per: "round" },
    title: "Hot Seat",
    tagline: "One person. Everyone else with opinions.",
    color: "--cat-hot-seat",
  },
];

export const MODE_BY_ID: Record<ModeId, ModeDef> = Object.fromEntries(
  MODES.map((m) => [m.id, m]),
) as Record<ModeId, ModeDef>;
