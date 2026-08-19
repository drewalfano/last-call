import type { Pools } from "./pools";

/**
 * SAY THE SAME THING — opening prompts.
 * Night policy: LEAD — the 19+ prompts go on top, the safe ones stay.
 *
 * LEAD rather than supplement because this is the one prompt pool a player
 * READS — the picker lays all of it out — so the order of the list is
 * something a table sees and the adult entries belong at the top of it.
 *
 * A prompt only works if it's broad enough that two people will almost
 * certainly say different things first, but narrow enough that they can
 * converge in a few rounds. "Fast food" is the shape: dozens of valid answers,
 * but a small enough world that McDonald's and Taco Bell have an obvious
 * middle. "Things" would be too wide; "Big Mac" too narrow to have a middle at
 * all.
 *
 * PLURAL OR MASS NOUN, NEVER "a <thing>". This is the rule the list above
 * follows and it is the difference between a prompt that plays and one that
 * does not. "A sport" asks for one instance, so both players reach for the
 * name of a sport and the only moves left are sideways — soccer, tennis,
 * hockey — with no way to close the gap. "Sports" asks for the territory, so
 * "soccer field" and "half time" are as legal as "soccer", and a pair who
 * opened miles apart has somewhere to meet.
 *
 * "Fast food" was already right, which is how the rule got noticed: it is the
 * example this note has always held up, and most of the list was not shaped
 * like it. The adjective prompts take Letter Rip's phrasing — "Things that are
 * cold" — so the two modes that both put a category in front of a table word
 * them the same way.
 *
 * These are only the OPENING word. After that the players' own two answers
 * become the prompt, which is the game — so the pool doesn't need the depth a
 * per-turn deck would.
 */
export const SAY_THE_SAME_THING: Pools<string> = {
  safe: [
    "Fast food", "Things that are cold", "Holiday destinations",
    "Things in a kitchen", "Famous dogs", "Things you queue for",
    "Board games", "Things that are round", "Breakfast foods",
    "Things that are expensive", "Cartoon characters", "Things that are loud",
    "Sports", "Things in your pocket", "Colours",
    "Things that smell good", "Car brands", "Things that are wet",
    "Superheroes", "Things you'd take camping", "Pizza toppings",
    "Things that are heavy", "Bands", "Things in a hospital",
    "Drinks", "Things you lose", "Countries",
    "Things that are sticky", "Jobs", "Things in a garden",
    "Zoo animals", "Things you'd never share", "Cities",
    "Things you sit on", "Movie villains", "Things in a bar",
    "Snacks", "Things you charge", "Seasons",
    "Things that are always late", "Instruments", "Things in a hotel room",
    "Shoe brands", "Things you throw",
  ],
  night: [
    "Red flags", "Things you'd hide before a date comes over",
    "Bad pickup lines", "Things you'd never text your ex",
    "Dating app clichés", "Things worth lying about",
    "Reasons to leave early", "Things you'd regret at 3am",
    "Excuses for not replying", "Things you'd never do sober",
    "Bad tattoos", "Things you'd delete",
    "Reasons to block someone", "Things you'd never split",
    "Icebreakers that fail", "Things you'd fake",
    "Reasons to unmatch", "Things you'd take back",
    "Bad first-date questions", "Things you'd never admit",
    "Questionable decisions", "Things you'd blame on the drinks",
    "Reasons your friends staged an intervention", "Things you'd swipe left on",
    "Morning-after realisations", "Things you'd hide from your mum",
    "Reasons to change your number", "Things you'd never post",
    "Overrated nights out", "Things you'd lie about on a profile",
    "Reasons to ghost", "Things you'd do for a dare",
  ],
};
