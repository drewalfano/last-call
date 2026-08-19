/**
 * KINGS CUP — the ruleset.
 *
 * Data, not logic: one entry per rank, so any rank can be swapped without
 * touching the game component. Rhyme is the usual alternate if a group wants
 * it over Drive.
 *
 * This is the classic set, gendered ranks included. Floor and Heaven sit
 * either side of them at 4 and 7 — two races to move, bracketing the two
 * ranks that ask nobody to do anything. Thumb Master used to hold 4 and is
 * out: it is one of the two "you are now the X until the next X" rules and
 * Question Master at 12 is the better of them, because a question is
 * something you can catch someone with rather than a race nobody was
 * watching for.
 *
 * Kings do double duty — pour into the cup AND make a rule — which is the
 * common pub version and the reason the app has rules to track at all.
 *
 * No Safe/Night split: the rules are the rules. The two ranks that pull extra
 * content (10 and J) draw from pools that already respect the global mode.
 */

export type KingsCupEffect =
  | "none"
  | "pick-player"
  | "pick-mate"
  | "question-master"
  | "drive"
  | "category"
  | "never-have-i-ever"
  | "kings-cup";

export interface KingsCupRule {
  /** 2–14, matching Card.rank. Aces high. */
  rank: number;
  /** The rule's name, shown large. */
  label: string;
  /** What the table has to do. */
  text: string;
  effect: KingsCupEffect;
}

export const KINGS_CUP_RULES: KingsCupRule[] = [
  {
    rank: 14,
    label: "Waterfall",
    text: "Everyone drinks. You start, and nobody can stop until the person before them stops.",
    effect: "none",
  },
  {
    rank: 2,
    label: "You",
    text: "Pick someone. They drink.",
    effect: "pick-player",
  },
  {
    rank: 3,
    label: "Me",
    text: "That's you. Drink.",
    effect: "none",
  },
  {
    rank: 4,
    label: "Floor",
    text: "Everyone touch the floor. Last one down drinks.",
    effect: "none",
  },
  {
    rank: 5,
    label: "Guys",
    text: "All the guys drink.",
    effect: "none",
  },
  {
    rank: 6,
    label: "Girls",
    text: "All the girls drink.",
    effect: "none",
  },
  {
    rank: 7,
    label: "Heaven",
    text: "Point at the sky. Last hand up drinks.",
    effect: "none",
  },
  {
    rank: 8,
    label: "Mate",
    text: "Pick a mate. They drink every time you drink, for the rest of the game.",
    effect: "pick-mate",
  },
  {
    rank: 9,
    label: "Drive",
    text: "Vroom passes it on. Skrrt sends it back. Skeet skips the next player. You can't skrrt a skrrt. Hesitate or call it wrong and you drink.",
    effect: "drive",
  },
  {
    rank: 10,
    label: "Categories",
    text: "Name one, then go round the table. First to blank or repeat drinks.",
    effect: "category",
  },
  {
    rank: 11,
    label: "Never Have I Ever",
    text: "Say it. Anyone who has, drinks.",
    effect: "never-have-i-ever",
  },
  {
    rank: 12,
    label: "Question Master",
    text: "You're Question Master until the next queen. Anyone who answers a question you ask drinks.",
    effect: "question-master",
  },
  {
    rank: 13,
    label: "King's Cup",
    text: "Pour some of your drink into the cup and make a rule everyone follows. The fourth king drinks it.",
    effect: "kings-cup",
  },
];

export const RULE_BY_RANK: Record<number, KingsCupRule> = Object.fromEntries(
  KINGS_CUP_RULES.map((r) => [r.rank, r]),
);

/** Call words for Drive, shown as a reminder — not everyone knows them. */
export const DRIVE_CALLS: { call: string; means: string }[] = [
  { call: "Vroom", means: "passes it on, same direction" },
  { call: "Skrrt", means: "sends it back the other way" },
  { call: "Skeet", means: "skips the next player" },
];
