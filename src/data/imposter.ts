import type { ContentMode } from "../state/contentMode";

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
 * Night is meaningfully more adult in subject — dating, hookups, nightlife —
 * rather than the same words with profanity attached. A rude word is not a
 * better secret word; a revealing one is.
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
  night: [
    {
      name: "Hookups",
      words: [
        "One-night stand", "Sneaky link", "Booty call", "Walk of shame", "Morning after",
        "Body count", "Hookup", "Sleepover", "Late night call", "Bedroom",
      ],
    },
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
        "Old photos", "Someone's ex", "Deleted the app", "Reinstalled the app",
        "Someone else's hoodie",
      ],
    },
    {
      name: "Texting",
      words: [
        "Sexting", "Thirst trap", "Left on read", "Slid into the DMs", "Screenshot",
        "Shared location", "Notifications off", "Unread messages", "Breadcrumbing",
        "Read receipts",
      ],
    },
    {
      name: "Nightlife",
      words: [
        "Strip club", "Afterparty", "Bad decision", "Sunday morning taxi",
        "Holiday romance", "VIP booth", "Bottle service", "Closing time",
        "Last one standing", "Lock-in",
      ],
    },
    {
      name: "Red flags",
      words: [
        "Red flag", "Second phone", "Emergency contact", "Mutual friend",
        "Situation with a coworker", "Meeting the parents", "Toothbrush at their place",
        "Hall pass", "Open relationship", "Long distance",
      ],
    },
  ],
};

/**
 * The categories on offer, in the order they are shown.
 *
 * 19+ does not REPLACE the safe categories, it LEADS with the adult ones and
 * keeps the rest underneath. This is a list you choose from by name, and
 * swapping it out meant a table that wanted Hookups and Exes lost Foods,
 * Countries and Animals to get them — categories that are not remotely
 * unsuitable for a rowdy table, and that a long night runs out of clues
 * without. The blind prompt decks still replace; you never see what you did
 * not draw, so there is nothing to lose there. See data/pools.ts.
 */
function categoriesFor(mode: ContentMode): WordCategory[] {
  if (mode === "safe") return IMPOSTER_CATEGORIES.safe;
  return [...IMPOSTER_CATEGORIES.night, ...IMPOSTER_CATEGORIES.safe];
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
