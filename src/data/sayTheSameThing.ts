import type { Pools } from "./pools";

/**
 * SAY THE SAME THING — opening prompts.
 * Night policy: REPLACE.
 *
 * A prompt only works if it's broad enough that two people will almost
 * certainly say different things first, but narrow enough that they can
 * converge in a few rounds. "Fast food" is the shape: dozens of valid answers,
 * but a small enough world that McDonald's and Taco Bell have an obvious
 * middle. "Things" would be too wide; "Big Mac" too narrow to have a middle at
 * all.
 *
 * These are only the OPENING word. After that the players' own two answers
 * become the prompt, which is the game — so the pool doesn't need the depth a
 * per-turn deck would.
 */
export const SAY_THE_SAME_THING: Pools<string> = {
  safe: [
    "Fast food", "Something cold", "A holiday destination", "Something in a kitchen",
    "A famous dog", "Something you queue for", "A board game", "Something round",
    "A breakfast food", "Something expensive", "A cartoon character", "Something loud",
    "A sport", "Something in your pocket", "A colour", "Something that smells good",
    "A car brand", "Something wet", "A superhero", "Something you'd take camping",
    "A pizza topping", "Something heavy", "A band", "Something in a hospital",
    "A drink", "Something you lose", "A country", "Something sticky",
    "A job", "Something in a garden", "An animal at the zoo", "Something you'd never share",
    "A city", "Something you sit on", "A movie villain", "Something in a bar",
    "A snack", "Something you charge", "A season", "Something that's always late",
    "An instrument", "Something in a hotel room", "A shoe brand", "Something you throw",
  ],
  night: [
    "A red flag", "Something you'd hide before a date comes over", "A bad pickup line",
    "Something you'd never text your ex", "A dating app cliché", "Something worth lying about",
    "A reason to leave early", "Something you'd regret at 3am", "An excuse for not replying",
    "Something you'd never do sober", "A bad tattoo", "Something you'd delete",
    "A reason to block someone", "Something you'd never split", "An icebreaker that fails",
    "Something you'd fake", "A reason to unmatch", "Something you'd take back",
    "A bad first-date question", "Something you'd never admit", "A questionable decision",
    "Something you'd blame on the drinks", "A reason your friends staged an intervention",
    "Something you'd swipe left on", "A morning-after realisation", "Something you'd hide from your mum",
    "A reason to change your number", "Something you'd never post", "An overrated night out",
    "Something you'd lie about on a profile", "A reason to ghost", "Something you'd do for a dare",
  ],
};
