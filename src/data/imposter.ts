import type { ContentMode } from "../state/contentMode";
import { lead } from "./pools";

/**
 * IMPOSTER — secret words, grouped into categories.
 *
 * Grouped rather than flat for a secrecy reason. A player browsing a list of
 * *words* and choosing one would know the secret word — and they can still be
 * dealt the Imposter, which breaks the game outright. Choosing a *category*
 * leaks only the theme, which everyone learns from the first clue anyway.
 *
 * A word only works here if a table can clue it without naming it, and if the
 * Imposter could plausibly bluff. Concrete, shared, socially loaded.
 *
 * The safe set mixes plain categories anyone can play cold (Countries, Foods,
 * Animals) with bar-flavoured ones (Night out, Drinks). The plain ones matter
 * more than they look: a table that only ever gets nightlife words runs out of
 * distinct clues fast.
 *
 * Night is meaningfully more adult in subject — dating, exes, nightlife —
 * rather than the same words with profanity attached. A rude word is not a
 * better secret word; a clueable one is.
 */

export interface WordCategory {
  name: string;
  words: string[];
}

export const IMPOSTER_CATEGORIES: Record<ContentMode, WordCategory[]> = {
  safe: [
    {
      name: "Foods",
      words: [
        "Carrot", "Pizza", "Sushi", "Kebab", "Pancakes",
        "Avocado", "Hot sauce", "Cereal", "Garlic bread", "Oysters",
      ],
    },
    {
      name: "Celebrities",
      words: [
        "Beyoncé", "Taylor Swift", "Dwayne Johnson", "Rihanna", "Gordon Ramsay",
        "Snoop Dogg", "Adele", "Keanu Reeves", "Zendaya", "David Attenborough",
      ],
    },
    {
      name: "Night out",
      words: [
        "Cover fee", "Bouncer", "Last call", "Dance floor", "Smoking area",
        "Coat check", "Bar tab", "Taxi queue", "Dive bar", "Rooftop bar",
      ],
    },
    {
      name: "Drinks",
      words: [
        "Tequila", "Espresso martini", "Guinness", "Shots", "Hangover",
        "Happy hour", "Open bar", "Beer pong", "Bottomless brunch", "Ice bucket",
      ],
    },
    {
      name: "Places",
      words: [
        "Airport", "Casino", "Gym", "Hospital", "Petrol station",
        "Library", "Beach", "IKEA", "Laundromat", "Waiting room",
      ],
    },
    {
      name: "Screen",
      words: [
        "Titanic", "The Office", "Love Island", "Jaws", "Breaking Bad",
        "Star Wars", "Netflix", "Horror film", "Reality TV", "Cliffhanger",
      ],
    },
    {
      name: "Jobs",
      words: [
        "Dentist", "Lifeguard", "Pilot", "Teacher", "Influencer",
        "Plumber", "Chef", "Barber", "Wedding planner", "Taxi driver",
      ],
    },
    {
      name: "Countries",
      words: [
        "Japan", "Brazil", "Ireland", "Egypt", "Australia",
        "Italy", "Iceland", "Mexico", "Thailand", "Canada",
      ],
    },
    {
      name: "Cities",
      words: [
        "Paris", "Tokyo", "Vegas", "Dublin", "New York",
        "Amsterdam", "Berlin", "Sydney", "Rome", "Ibiza",
      ],
    },
    {
      name: "Animals",
      words: [
        "Penguin", "Shark", "Sloth", "Raccoon", "Horse",
        "Octopus", "Goose", "Hamster", "Crocodile", "Pigeon",
      ],
    },
    {
      name: "Sports",
      words: [
        "Golf", "Boxing", "Swimming", "Darts", "Marathon",
        "Skiing", "Tennis", "Rugby", "Bowling", "Formula 1",
      ],
    },
    {
      name: "Around the house",
      words: [
        "Kettle", "Sofa", "Shower", "Fridge", "Doorbell",
        "Laundry", "Houseplant", "Smoke alarm", "Radiator", "Junk drawer",
      ],
    },
    {
      name: "Colours",
      words: [
        "Red", "Navy", "Beige", "Neon green", "Gold",
        "Lilac", "Black", "Turquoise", "Burgundy", "Silver",
      ],
    },
    {
      name: "Things",
      words: [
        "Phone charger", "Group chat", "Fake ID", "Tattoo", "Passport",
        "AirPods", "Wallet", "Sunglasses", "Uber", "Umbrella",
      ],
    },
  ],
  /**
   * Night is adult by SUBJECT — dating, exes, nightlife, the things people
   * hide — and the words still have to work as Imposter words, which rules
   * out most of the obvious rude ones twice over.
   *
   * A category fails here when its words are interchangeable. "Booty call",
   * "sneaky link", "one-night stand" and "hookup" all mean the same thing, so
   * any clue that fits one fits all four: the table cannot separate them and
   * the Imposter bluffs for free. The words below are chosen to be tellable
   * APART, not just to be racy.
   */
  night: [
    {
      name: "Dating",
      words: [
        "Situationship", "Talking stage", "Soft launch", "First date", "Dating app",
        "Exclusive", "Third date", "Plus one", "Blind date", "The talk",
      ],
    },
    {
      name: "Exes",
      words: [
        "Ex's apartment", "Rebound", "Ghosting", "Blocked number", "Drunk text",
        "Old photos", "Closure", "Box of their stuff", "Someone else's hoodie",
        "Unfollowed",
      ],
    },
    {
      name: "Texting",
      words: [
        "Left on read", "Double text", "Slid into the DMs", "Screenshot",
        "Shared location", "Read receipts", "Typing dots", "Notifications off",
        "Breadcrumbing", "Drafts folder",
      ],
    },
    {
      name: "Nightlife",
      words: [
        "Afterparty", "Lock-in", "Closing time", "VIP booth", "Bottle service",
        "Last one standing", "Night bus", "Queue jump", "Bad decision",
        "Sunday morning taxi",
      ],
    },
    {
      name: "Red flags",
      words: [
        "Red flag", "Hall pass", "Open relationship", "Long distance",
        "Mutual friend", "Someone's coworker", "Toothbrush at their place",
        "Meeting the parents", "Emergency contact", "Moving in together",
      ],
    },
    {
      name: "Secrets",
      words: [
        "Second phone", "Locked phone", "Burner account", "Snooping",
        "White lie", "Alibi", "Sworn to secrecy", "Deleted history",
        "Group chat about you", "Anonymous account",
      ],
    },
  ],
};

/**
 * The categories on offer, in the order they are shown.
 *
 * 19+ does not REPLACE the safe categories, it LEADS with the adult ones and
 * keeps the rest — sprinkled through them rather than stacked underneath, so
 * the top of the list is not a solid block of the same register. This is a list you choose from by name, and
 * swapping it out meant a table that wanted Hookups and Exes lost Foods,
 * Countries and Animals to get them — categories that are not remotely
 * unsuitable for a rowdy table, and that a long night runs out of clues
 * without. The blind prompt decks still replace; you never see what you did
 * not draw, so there is nothing to lose there. See data/pools.ts.
 */
function categoriesFor(mode: ContentMode): WordCategory[] {
  if (mode === "safe") return IMPOSTER_CATEGORIES.safe;
  return lead(IMPOSTER_CATEGORIES.night, IMPOSTER_CATEGORIES.safe);
}

/** Flat word list for a category, or every word when no category is chosen. */
export function wordsFor(mode: ContentMode, category: string | null): string[] {
  const cats = categoriesFor(mode);
  if (!category) return cats.flatMap((c) => c.words);
  return cats.find((c) => c.name === category)?.words ?? cats.flatMap((c) => c.words);
}

export function categoryNames(mode: ContentMode): string[] {
  return categoriesFor(mode).map((c) => c.name);
}
