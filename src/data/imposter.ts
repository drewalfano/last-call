import type { ContentMode } from "../state/contentMode";
import { resolvePool, type Pools } from "./pools";

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
 * TEN WORDS IS THE FLOOR, TWENTY IS THE SHAPE.
 *
 * A round burns exactly one word, and a table that picks a category picks the
 * same one again — Animals is somebody's category the way a bar stool is
 * somebody's stool. A ten-word category is therefore a category you have
 * MEMORISED after a single long night: the round stops being "what fits this
 * clue" and becomes "which of the ten is left", which the Imposter can play as
 * well as anyone. Twenty puts the whole list out of reach of one sitting.
 *
 * Nothing below ten ships. If a category cannot reach it without padding —
 * without a fifth word that means what the first four meant — it is the wrong
 * category, and the fix is a different category rather than four more words.
 *
 * Which is the other half of the count: the words have to stay tellable APART
 * as the list grows. Twenty words that collapse into six ideas are worse than
 * ten distinct ones, because every clue then fits three cards at once and the
 * Imposter bluffs for free. Repeats across categories cost the same — a word
 * in two lists is a word the table can be clued toward twice — so a word
 * appears once in the whole file, at whichever tier it belongs to.
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

export const IMPOSTER_CATEGORIES: Pools<WordCategory> = {
  safe: [
    {
      name: "Foods",
      words: [
        "Carrot", "Pizza", "Sushi", "Kebab", "Pancakes",
        "Avocado", "Hot sauce", "Cereal", "Garlic bread", "Oysters",
        "Ramen", "Popcorn", "Roast dinner", "Peanut butter", "Ice cream",
        "Tacos", "Olives", "Birthday cake", "Cheeseboard", "Curry",
      ],
    },
    {
      name: "Celebrities",
      words: [
        "Beyoncé", "Taylor Swift", "Dwayne Johnson", "Rihanna", "Gordon Ramsay",
        "Snoop Dogg", "Adele", "Keanu Reeves", "Zendaya", "David Attenborough",
        "Lady Gaga", "Serena Williams", "Tom Cruise", "Oprah", "Ed Sheeran",
        "Leonardo DiCaprio", "Cristiano Ronaldo", "Morgan Freeman", "Dolly Parton", "Simon Cowell",
      ],
    },
    {
      name: "Night out",
      words: [
        "Cover fee", "Bouncer", "Last call", "Dance floor", "Smoking area",
        "Coat check", "Bar tab", "Taxi queue", "Dive bar", "Rooftop bar",
        "Karaoke", "Guest list", "Bathroom queue", "DJ booth", "Pub quiz",
        "ID check", "Sticky floor", "Wristband", "Beer garden", "Group photo",
      ],
    },
    {
      name: "Drinks",
      words: [
        "Tequila", "Espresso martini", "Guinness", "Shots", "Hangover",
        "Happy hour", "Open bar", "Beer pong", "Bottomless brunch", "Ice bucket",
        "Mojito", "Red wine", "Cider", "Prosecco", "Jägerbomb",
        "Pint glass", "Cocktail umbrella", "Mocktail", "Sangria", "Whiskey",
      ],
    },
    {
      name: "Places",
      words: [
        "Airport", "Casino", "Gym", "Hospital", "Petrol station",
        "Library", "Beach", "IKEA", "Laundromat", "Waiting room",
        "Zoo", "Church", "Campsite", "Ski lift", "Supermarket",
        "Museum", "Car park", "Theme park", "Post office", "Motorway services",
      ],
    },
    {
      name: "Screen",
      words: [
        "Titanic", "The Office", "Love Island", "Jaws", "Breaking Bad",
        "Star Wars", "Netflix", "Horror film", "Reality TV", "Cliffhanger",
        "Friends", "Harry Potter", "The Simpsons", "Documentary", "Subtitles",
        "Trailer", "Sequel", "Rom-com", "Plot twist", "Binge-watch",
      ],
    },
    {
      name: "Jobs",
      words: [
        "Dentist", "Lifeguard", "Pilot", "Teacher", "Influencer",
        "Plumber", "Chef", "Barber", "Wedding planner", "Taxi driver",
        "Firefighter", "Vet", "Estate agent", "Postman", "Nurse",
        "Electrician", "Farmer", "Referee", "Bartender", "Personal trainer",
      ],
    },
    {
      name: "Countries",
      words: [
        "Japan", "Brazil", "Ireland", "Egypt", "Australia",
        "Italy", "Iceland", "Mexico", "Thailand", "Canada",
        "France", "India", "Greece", "Norway", "Kenya",
        "Spain", "Switzerland", "Portugal", "South Korea", "Morocco",
      ],
    },
    {
      name: "Cities",
      words: [
        "Paris", "Tokyo", "Vegas", "Dublin", "New York",
        "Amsterdam", "Berlin", "Sydney", "Rome", "Ibiza",
        "London", "Barcelona", "Venice", "Istanbul", "Los Angeles",
        "Prague", "Cape Town", "Rio de Janeiro", "Edinburgh", "Bangkok",
      ],
    },
    {
      name: "Animals",
      words: [
        "Penguin", "Shark", "Sloth", "Raccoon", "Horse",
        "Octopus", "Goose", "Hamster", "Crocodile", "Pigeon",
        "Giraffe", "Bat", "Koala", "Wasp", "Dolphin",
        "Owl", "Snake", "Kangaroo", "Hedgehog", "Camel",
      ],
    },
    {
      name: "Sports",
      words: [
        "Golf", "Boxing", "Swimming", "Darts", "Marathon",
        "Skiing", "Tennis", "Rugby", "Bowling", "Formula 1",
        "Basketball", "Ice skating", "Surfing", "Cycling", "Gymnastics",
        "Snooker", "Horse racing", "Climbing", "Table tennis", "Penalty shootout",
      ],
    },
    {
      name: "Around the house",
      words: [
        "Kettle", "Sofa", "Shower", "Fridge", "Doorbell",
        "Laundry", "Houseplant", "Smoke alarm", "Radiator", "Junk drawer",
        "Mirror", "Vacuum", "Bin day", "Ironing board", "Bath mat",
        "Remote control", "Spare key", "Wardrobe", "Bookshelf", "Toaster",
      ],
    },
    {
      name: "Colours",
      words: [
        "Red", "Navy", "Beige", "Neon green", "Gold",
        "Lilac", "Black", "Turquoise", "Burgundy", "Silver",
        "White", "Orange", "Hot pink", "Mustard", "Emerald",
        "Charcoal", "Cream", "Rose gold", "Sky blue", "Khaki",
      ],
    },
    {
      name: "Things",
      words: [
        "Phone charger", "Group chat", "Fake ID", "Passport", "AirPods",
        "Wallet", "Sunglasses", "Uber", "Umbrella", "House keys",
        "Suitcase", "Selfie stick", "Power bank", "Water bottle", "Chewing gum",
        "Lighter", "Wristwatch", "Bike lock", "Shopping list", "Headphones",
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
        "Swipe right", "Dinner date", "Set up by friends", "Speed dating", "Dating profile",
        "Date night", "Split the bill", "Goodnight kiss", "Anniversary", "Relationship status",
      ],
    },
    {
      name: "Exes",
      words: [
        "Ex's apartment", "Rebound", "Ghosting", "Blocked number", "Drunk text",
        "Old photos", "Closure", "Box of their stuff", "Someone else's hoodie",
        "Unfollowed", "Their new partner", "Breakup playlist", "Ex at the same party",
        "Returned key", "Shared Netflix login", "Anniversary reminder", "Best friend's ex",
        "Awkward run-in", "Sad song", "Moving out",
      ],
    },
    {
      name: "Texting",
      words: [
        "Left on read", "Double text", "Slid into the DMs", "Screenshot",
        "Shared location", "Read receipts", "Typing dots", "Notifications off",
        "Breadcrumbing", "Drafts folder", "Voice note", "3am text", "Wrong chat",
        "Autocorrect", "Unsent message", "Emoji reaction", "Selfie", "Vanish mode",
        "Contact name", "Reply guy",
      ],
    },
    {
      name: "Nightlife",
      words: [
        "Afterparty", "Lock-in", "Closing time", "VIP booth", "Bottle service",
        "Last one standing", "Night bus", "Queue jump", "Bad decision",
        "Sunday morning taxi", "Walk of shame", "Shoes in hand", "Lost jacket",
        "Dead phone", "Shared cigarette", "Kicked out", "Table dancing",
        "4am kebab", "Karaoke duet", "Free round",
      ],
    },
    {
      name: "Red flags",
      words: [
        "Red flag", "Hall pass", "Open relationship", "Long distance",
        "Mutual friend", "Someone's coworker", "Toothbrush at their place",
        "Meeting the parents", "Emergency contact", "Moving in together",
        "Still friends with their ex", "Joint bank account", "Matching tattoos",
        "Couple's holiday", "Living with their mum", "Jealous streak",
        "Love bombing", "Never posts you", "Always on their phone",
        "Friends who hate you",
      ],
    },
    {
      name: "Secrets",
      words: [
        "Second phone", "Locked phone", "Burner account", "Snooping",
        "White lie", "Alibi", "Sworn to secrecy", "Deleted history",
        "Group chat about you", "Anonymous account", "Hidden folder",
        "Secret admirer", "Overheard conversation", "Sneaking out", "Fake plans",
        "Shared password", "Old username", "Nobody knows yet", "Cover story",
        "Blackmail",
      ],
    },
  ],
  filthy: [
    {
      name: "Trouble",
      words: [
        "Police", "Handcuffs", "Fine", "Curfew", "Lawyer",
        "Bail", "Warning", "Fight", "Caution", "Witness",
        "Statement", "Cell", "Court", "Breathalyser", "Security camera",
        "Trespassing", "Speeding ticket", "Noise complaint", "Banned", "Mugshot",
      ],
    },
    {
      name: "The morning after",
      words: [
        "Receipt", "Voicemail", "Stranger", "Taxi", "Water",
        "Regret", "Bruise", "Silence", "Missed calls", "Empty wallet",
        "Wrong bed", "Aching feet", "Painkillers", "Fry-up", "Sunrise",
        "Smudged makeup", "Glitter", "Borrowed charger", "Bank alert", "Apology",
      ],
    },
    {
      name: "Things you'd hide",
      words: [
        "Diary", "Message", "Photo", "Bottle", "Letter",
        "Key", "Scar", "Bill", "Cigarettes", "Pills",
        "Ring", "Note", "Number", "Bank statement", "Ticket stub",
        "Nickname", "Hickey", "Password", "Playlist", "Parcel",
      ],
    },
    {
      name: "Regrets",
      words: [
        "Tattoo", "Text", "Shot", "Haircut", "Email",
        "Ex", "Piercing", "Confession", "Speech", "Dare",
        "Bet", "Impulse buy", "Truth", "Late-night order", "Resignation",
        "Argument", "Promise", "Toast", "Souvenir", "Rumour",
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
/* Was its own copy of the lead logic. It is the shared resolver now — the
   categories here are browsed off a page, which is exactly what "lead" means. */
function categoriesFor(mode: ContentMode): readonly WordCategory[] {
  return resolvePool(IMPOSTER_CATEGORIES, mode, "lead");
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
