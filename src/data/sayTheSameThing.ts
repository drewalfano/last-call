import type { Pools } from "./pools";

/**
 * SAY THE SAME THING — opening prompts.
 * Night policy: LEAD — the 19+ prompts go on top, the safe ones stay.
 *
 * LEAD rather than supplement because this is the one prompt pool a player
 * READS — the picker lays all of it out — so the order of the list is
 * something a table sees and the adult entries belong at the top of it.
 *
 * THE FILTER. This mode rewards convergence, not creativity. A prompt earns
 * its place on two counts at once: a large answer space AND strong gravity —
 * dozens of valid answers exist, but one or two dominate what people reach
 * for first. "Fast food" is the benchmark: hundreds of valid answers, and
 * McDonald's pulls hard.
 *
 * The test is one question, asked out loud: NAME THE DOMINANT ANSWER. If it
 * comes back as a single word — Monopoly, pepperoni, Nike, ice, Tinder — the
 * prompt plays. If naming it produces three or four equally likely answers,
 * the prompt is divergent and does not belong here however good it reads.
 * That is what removed Countries, Cities, Snacks, Drinks, Jobs and
 * Superheroes, all of which are perfectly nice categories with no gravity:
 * "name a country" is the textbook way to make two people say different
 * things forever.
 *
 * Three phrasings fail structurally and none of them survived the pass:
 *
 *   "Things you'd <verb>"   asks for a personal hypothetical, so a player
 *                           answers about themselves rather than about the
 *                           category, and the table plays for the laugh.
 *   "Reasons to <verb>"     the same, plus it invites invention — the point
 *                           of an answer becomes that nobody else had it.
 *   "Things in a <place>"   produces an inventory, and an inventory splits
 *                           by which object you happen to picture first.
 *
 * A qualifier clause is the other killer: it shrinks a wide space down to a
 * handful. "Things you'd lie about on a profile" has maybe six answers once
 * "on a profile" has done its work, and six answers is not a game.
 *
 * "Things that are <adjective>" is kept, but only for properties with a
 * prototype object behind them — cold is ice, round is a ball, wet is water.
 * Degree and judgement adjectives have no prototype (expensive, heavy, loud,
 * sticky) and send everyone to a private example instead.
 *
 * PLURAL OR MASS NOUN, NEVER "a <thing>". "A sport" asks for one instance, so
 * both players reach for the name of a sport and the only moves left are
 * sideways — soccer, tennis, hockey — with no way to close the gap. "Sports"
 * asks for the territory, so "soccer field" and "half time" are as legal as
 * "soccer", and a pair who opened miles apart has somewhere to meet.
 *
 * These are only the OPENING word. After that the players' own two answers
 * become the prompt, which is the game — so the pool doesn't need the depth a
 * per-turn deck would.
 *
 * SIZE. The night and filthy tiers are down to four entries between them,
 * which is not a bug and is not finished either: the 19+ pool was written
 * almost entirely in the two phrasings above, and what was left after the
 * filter is what genuinely converges. It wants refilling with categories
 * shaped like "Dating apps" — a wide adult territory with an obvious first
 * answer — rather than with more confessions.
 */
export const SAY_THE_SAME_THING: Pools<string> = {
  safe: [
    "Fast food", "Things that are cold", "Board games",
    "Things that are round", "Sports", "Pizza toppings",
    "Things that are wet", "Bands", "Zoo animals",
    "Famous dogs", "Instruments", "Movie villains",
    "Shoe brands", "Camping gear", "Colours",
    "Seasons",
  ],
  night: [
    "Dating apps",
    "Pickup lines",
    "Hangovers",
  ],
  filthy: [
    "Drugs",
  ],
};

/**
 * WARM-UPS — valid, but never two in a round.
 *
 * These are the near-pure convergence prompts: the answer space is a small
 * closed set everyone already shares, so the pair matches almost immediately.
 * That is a fine way to open — it teaches the game in one attempt — and a
 * miserable way to spend a whole round, because nothing about the second one
 * is different from the first.
 *
 * The distinction is the closed set, not merely a short list. "Colours" and
 * "Seasons" are sets a table agrees on before anyone speaks. "Things in your
 * pocket" is also short but it is short *personally*, which is a divergent
 * prompt wearing a convergent prompt's size — it was cut rather than tagged.
 *
 * Nothing enforces this yet and nothing needs to: a round serves exactly one
 * opening word, so the constraint holds by construction today. The tag is
 * here so that an arranger which ever deals more than one per round has the
 * list to check against, rather than having to rediscover which entries these
 * were.
 */
export const SAY_THE_SAME_THING_WARMUPS: readonly string[] = ["Colours", "Seasons"];
