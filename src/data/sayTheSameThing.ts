import type { Pools } from "./pools";

/**
 * SAY THE SAME THING — opening prompts.
 * Night policy: LEAD — the 19+ prompts go on top, the safe ones stay.
 *
 * LEAD rather than supplement because this is the one prompt pool a player
 * READS — the picker lays all of it out — so the order of the list is
 * something a table sees and the adult entries belong at the top of it.
 *
 * OPEN, NOT DOMINANT. The mode rewards convergence across a wide field, so
 * the only thing a prompt has to do is leave the field wide. Hundreds of
 * valid answers, and players cluster on the common ones by themselves —
 * "Countries" and "Drinks" have no single answer everyone reaches for and
 * that is fine, because three or four strong pullers is a healthy prompt,
 * not a broken one. Two players landing on the same one is the game working.
 *
 * An earlier pass had this backwards. It asked each prompt to name ONE
 * dominant answer and cut everything that came back with several, which
 * threw out Countries, Cities, Drinks, Jobs, Snacks and the whole "Things in
 * a <place>" family — the widest prompts in the bank, removed for being
 * wide. That test is withdrawn. Do not reintroduce it.
 *
 * The real failure is a CLOSED answer space, and it arrives two ways:
 *
 *   A qualifier clause pre-narrows the field. "Things you'd lie about on a
 *   profile" is a big category with a clause bolted on that leaves about six
 *   answers, and six answers is not a game.
 *
 *   The phrasing asks for a joke. "Things you'd <verb>" and "Reasons to
 *   <verb>" invite a performance — the point of an answer becomes that
 *   nobody else had it, which is the opposite of the game. Neither
 *   construction appears in this file.
 *
 * STRIP THE QUALIFIER. When a prompt reads as <qualifier> + <category>, the
 * qualifier is usually there narrowing the field, and dropping it costs
 * nothing: Famous dogs became Pets, Zoo animals became Animals, Shoe brands
 * became Shoes, Car brands became Cars, Movie villains became Villains. The
 * exception is a qualifier that IS the subject — "Fast food" is not a
 * narrowed "Food", it is its own territory, and "Dating apps" cannot lose
 * "Dating" and stay the same prompt.
 *
 * PLURAL OR MASS NOUN, NEVER "a <thing>". "A sport" asks for one instance, so
 * both players reach for the name of a sport and the only moves left are
 * sideways — soccer, tennis, hockey — with no way to close the gap. "Sports"
 * asks for the territory, so "soccer field" and "half time" are as legal as
 * "soccer", and a pair who opened miles apart has somewhere to meet.
 *
 * ADULT FROM THE SUBJECT, NOT THE FRAMING. The 19+ tiers are wide adult
 * territory — Hangovers, Exes, Kinks — rather than confessions dressed as
 * categories. "Hangovers" is a category with a hundred answers in it;
 * "Things you'd regret at 3am" is a request for a story about yourself, and
 * a table plays it for the laugh instead of for the match. Same rule as the
 * safe tier, applied to rowdier subjects.
 *
 * These are only the OPENING word. After that the players' own two answers
 * become the prompt, which is the game — so the pool doesn't need the depth a
 * per-turn deck would.
 */
export const SAY_THE_SAME_THING: Pools<string> = {
  safe: [
    "Fast food", "Things in a kitchen", "Countries",
    "Things that are expensive", "Animals", "Things in a bar",
    "Drinks", "Things that smell good", "Cities",
    "Things in a garden", "Board games", "Things that are heavy",
    "Snacks", "Things in a hospital", "Sports",
    "Things that are loud", "Jobs", "Things in a hotel room",
    "Pizza toppings", "Things that are sticky", "Cartoon characters",
    "Bands", "Superheroes", "Cars",
    "Holidays", "Breakfast foods", "Instruments",
    "Villains", "Shoes", "Camping",
    "Pets", "Red flags", "Things that are cold",
    "Colours", "Seasons",
  ],
  night: [
    "Dating apps", "Nightclubs", "Exes",
    "Cocktails", "First dates", "Bars",
    "Break-ups", "Shots", "Flirting",
    "Pubs", "Crushes", "Drinking games",
    "Kissing", "Karaoke", "Hookups",
    "Bouncers", "Cheating", "Fake IDs",
    "Pickup lines", "Stag dos", "Hangovers",
    "Hen dos", "Tattoos", "Strip clubs",
    "Lingerie",
  ],
  filthy: [
    "Drugs", "Sex positions", "Nudes",
    "Kinks", "Sexting", "Sex toys",
    "Porn", "One-night stands", "Condoms",
    "Body parts", "Foreplay", "Affairs",
  ],
};

/**
 * WARM-UPS — valid, but never two in a round.
 *
 * The narrowest prompts in the bank. Their fields are small enough that the
 * pair matches almost immediately and almost nobody has to think, which is a
 * fine way to open — it teaches the game in one attempt — and a miserable way
 * to spend a whole round, because the second one plays exactly like the
 * first.
 *
 * They are tagged rather than cut because opening on one is worth having, but
 * they sit at the edge of what belongs here: judged on answer space alone,
 * "Seasons" has four answers and "Colours" has about a dozen, and a bank made
 * of these would not be a game. One per round is the whole allowance.
 *
 * "Things that are cold" is the survivor of three — round and wet were cut,
 * being the same prompt with less in them.
 *
 * Nothing enforces this yet and nothing needs to: a round serves exactly one
 * opening word, so the constraint holds by construction today. The tag is
 * here so that an arranger which ever deals more than one per round has the
 * list to check against, rather than having to rediscover which entries these
 * were.
 */
export const SAY_THE_SAME_THING_WARMUPS: readonly string[] = [
  "Colours",
  "Seasons",
  "Things that are cold",
];
