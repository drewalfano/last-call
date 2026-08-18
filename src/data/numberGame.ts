import type { Pools } from "./pools";

/**
 * THE NUMBER GAME — bidding categories.
 * Night policy: LEAD — the 19+ categories go on top, the safe ones stay.
 *
 * A category works here if a confident person could plausibly claim five and a
 * show-off could claim twelve. Too narrow ("Beatles drummers") and there's no
 * bidding room; too wide ("words") and nobody can ever be challenged.
 *
 * Deliberately skewed toward things people *think* they know more of than they
 * do — that gap between the bid and the recall is the whole game.
 */
export const NUMBER_GAME_CATEGORIES: Pools<string> = {
  safe: [
    "Taylor Swift songs", "Countries in Europe", "Pixar films", "Cocktails",
    "Premier League teams", "US states", "Breakfast cereals", "Harry Potter characters",
    "Car brands", "Types of pasta", "Simpsons characters", "Capital cities",
    "Beatles songs", "Chocolate bars", "Disney princesses", "Sports played with a ball",
    "Countries in Africa", "Marvel characters", "Crisp flavours", "Board games",
    "Things in a kitchen drawer", "Dog breeds", "Beers", "Musicals",
    "Horror films", "Fast food chains", "Islands", "Christmas songs",
    "Things at a festival", "Card games", "Cheeses", "Olympic sports",
    "Reality TV shows", "Kinds of tea", "Football players", "Video games",
    "Pizza toppings", "Airlines", "Shoe brands", "Cities in Italy",
  ],
  night: [
    "Reasons a date ends early", "Dating app red flags", "Places you shouldn't hook up",
    "Excuses for not texting back", "Things you'd hide before someone comes over",
    "Ways to end a relationship badly", "Things people lie about on profiles",
    "Reasons your friends hated your ex", "Bad pickup lines", "Things you'd never text your ex",
    "Signs someone isn't interested", "Reasons to leave a party with someone",
    "Things you'd delete before handing over your phone", "Worst places to get caught",
    "Reasons to block someone", "Things you'd never admit sober",
    "Bad first-date questions", "Ways to ruin a night out", "Morning-after regrets",
    "Things that kill the mood", "Reasons to unmatch", "Worst things to say afterwards",
    "Nicknames you'd never call a partner", "Reasons to change your number",
    "Things you'd fake", "Excuses for leaving in the morning",
  ],
};
