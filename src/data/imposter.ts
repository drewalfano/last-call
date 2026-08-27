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
 * The safe set mixes plain categories anyone can play cold (Countries, Foods,
 * Animals) with bar-flavoured ones (Night out, Drinks). The plain ones matter
 * more than they look: a table that only ever gets nightlife words runs out of
 * distinct clues fast.
 *
 * Night is meaningfully more adult in subject — dating, exes, nightlife —
 * rather than the same words with profanity attached. A rude word is not a
 * better secret word; a clueable one is.
 */

/**
 * A word and the nudge that goes with it, in that order.
 *
 * WHAT A HINT IS FOR. The Imposter's problem is not that the game is hard, it
 * is that going first is unplayable: no word, nothing heard yet, and a clue
 * owed out loud. The hint exists to make that turn survivable — it hands over
 * an angle to talk from, not the answer.
 *
 * CONCRETE AND LITERAL, NEVER A RIFF. This is the rule these were rewritten
 * against, because the first set broke it everywhere and was useless at the
 * table for exactly that reason. Adele got "Heartbreak", Bottomless brunch
 * got "Daytime", Waiting room got "Your turn" — associations and puns, each
 * one a little joke about its word. A joke is no help to someone who has to
 * speak next: it tells you the mood of the answer and nothing about what kind
 * of thing it is, so the clue you build from it lands anywhere. Adele is
 * "Ballads" now, the brunch is "Refills", the waiting room is "Sitting".
 * Name a property — what it is, where it is, what it does, what it is made
 * of — and let the Imposter build their own line off it.
 *
 * ONE WORD, TWO AT THE OUTSIDE, AND THAT IS A RULE ABOUT THE GAME RATHER
 * THAN ABOUT THE CARD. These ran to a phrase each at first — "Nobody wants to
 * be there", "You know how it ends" — and a phrase is not a nudge, it is a
 * clue with the work already done. What the Imposter needs is something to
 * think from, not a sentence to lean on. Anything past two words wants
 * cutting rather than rewording.
 *
 * AND STILL DELIBERATELY UNDER-SPECIFIED, which is the rule concreteness has
 * to be balanced against rather than a contradiction of it. The test each
 * hint has to pass is that it fits several words in its own category and not
 * just its own: "Water" is the Crocodile here and the Swimming two categories
 * down and the Shower two below that; "Cold" is the Ice bucket, the Penguin,
 * Iceland and the Fridge. An Imposter who reads one still has to listen —
 * they have narrowed the room, not found the word. A hint that identifies its
 * word is a bug in this file, and the fix is always to widen it to a property
 * its neighbours share, never to retreat into vagueness.
 *
 * They also have to survive being SAID, because a table can hear a hint read
 * out and know instantly who read it — see the rule on the role card. Written
 * as a fragment rather than a clue for exactly that reason: "Shared" is
 * useless as a turn and fine as a starting point.
 *
 * A tuple, not an object. Two hundred and forty of these are written by hand
 * and read as a list; `["Pizza", "Shared"]` stays a table you can scan a
 * column of, where the object form would triple the file to say nothing more.
 * The element names carry at the call site, which is where it matters.
 */
export type SecretWord = readonly [word: string, hint: string];

export interface WordCategory {
  name: string;
  words: readonly SecretWord[];
}

export const IMPOSTER_CATEGORIES: Pools<WordCategory> = {
  safe: [
    {
      name: "Foods",
      words: [
        ["Carrot",       "Crunchy"],
        ["Pizza",        "Sliced"],
        ["Sushi",        "Raw"],
        ["Kebab",        "Wrapped"],
        ["Pancakes",     "Stacked"],
        ["Avocado",      "Green"],
        ["Hot sauce",    "Spicy"],
        ["Cereal",       "Breakfast"],
        ["Garlic bread", "A side"],
        ["Oysters",      "Salty"],
        ["Caesar salad", "A bowl"],
      ],
    },
    {
      name: "Celebrities",
      words: [
        ["Beyoncé",            "Singer"],
        ["Taylor Swift",       "Tours"],
        ["Dwayne Johnson",     "Blockbusters"],
        ["Rihanna",            "Fashion"],
        ["Gordon Ramsay",      "TV"],
        ["Snoop Dogg",         "Music"],
        ["Adele",              "Ballads"],
        ["Keanu Reeves",       "Films"],
        ["Zendaya",            "Red carpet"],
        ["David Attenborough", "British"],
        ["Katy Perry",         "Pop"],
        ["Princess Diana",     "Nineties"],
      ],
    },
    {
      name: "Night out",
      words: [
        ["Cover fee",    "Paid"],
        ["Bouncer",      "The door"],
        ["Last call",    "The end"],
        ["Dance floor",  "Crowded"],
        ["Smoking area", "Outside"],
        ["Coat check",   "A ticket"],
        ["Bar tab",      "Adds up"],
        ["Taxi queue",   "Waiting"],
        ["Dive bar",     "Cheap"],
        ["Rooftop bar",  "Expensive"],
      ],
    },
    {
      name: "Drinks",
      words: [
        ["Tequila",           "A spirit"],
        ["Espresso martini",  "A cocktail"],
        ["Guinness",          "A pint"],
        ["Shots",             "Quick"],
        ["Hangover",          "The morning"],
        ["Happy hour",        "Cheaper"],
        ["Open bar",          "Free"],
        ["Beer pong",         "A game"],
        ["Bottomless brunch", "Refills"],
        ["Ice bucket",        "Cold"],
        ["Vodka",             "Clear"],
        ["Mimosa",            "Juice"],
        ["Caesar",            "Savoury"],
      ],
    },
    {
      name: "Places",
      words: [
        ["Airport",        "Queues"],
        ["Casino",         "Machines"],
        ["Gym",            "Early"],
        ["Hospital",       "Waiting"],
        ["Petrol station", "A stop"],
        ["Library",        "Quiet"],
        ["Beach",          "Warm"],
        ["IKEA",           "Trolleys"],
        ["Laundromat",     "Coins"],
        ["Waiting room",   "Sitting"],
        ["Grocery store",  "Aisles"],
      ],
    },
    {
      name: "Screen",
      words: [
        ["Titanic",      "Romance"],
        ["The Office",   "Episodes"],
        ["Love Island",  "Contestants"],
        ["Jaws",         "A monster"],
        ["Breaking Bad", "A series"],
        ["Star Wars",    "Sequels"],
        ["Netflix",      "At home"],
        ["Horror film",  "Scary"],
        ["Reality TV",   "Voting"],
        ["Cliffhanger",  "The ending"],
      ],
    },
    {
      name: "Jobs",
      words: [
        ["Dentist",         "A chair"],
        ["Lifeguard",       "Water"],
        ["Pilot",           "Travel"],
        ["Teacher",         "Holidays"],
        ["Influencer",      "Online"],
        ["Plumber",         "Emergency"],
        ["Chef",            "Long hours"],
        ["Barber",          "Appointments"],
        ["Wedding planner", "Booked"],
        ["Taxi driver",     "Late nights"],
      ],
    },
    {
      name: "Countries",
      words: [
        ["Japan",     "Islands"],
        ["Brazil",    "Hot"],
        ["Ireland",   "Small"],
        ["Egypt",     "Ancient"],
        ["Australia", "Far"],
        ["Italy",     "Food"],
        ["Iceland",   "Cold"],
        ["Mexico",    "Spicy"],
        ["Thailand",  "Beaches"],
        ["Canada",    "Huge"],
        ["America",   "Loud"],
        ["France",    "Wine"],
        ["India",     "Crowded"],
        ["China",     "Tea"],
      ],
    },
    {
      name: "Cities",
      words: [
        ["Paris",     "Romantic"],
        ["Tokyo",     "Enormous"],
        ["Vegas",     "Neon"],
        ["Dublin",    "Rain"],
        ["New York",  "Skyscrapers"],
        ["Amsterdam", "Water"],
        ["Berlin",    "Clubs"],
        ["Sydney",    "Beaches"],
        ["Rome",      "Ruins"],
        ["Ibiza",     "Summer"],
        ["Toronto",   "Winters"],
        ["Vancouver", "Mountains"],
        ["Detroit",   "Cars"],
        ["LA",        "Sunshine"],
      ],
    },
    {
      name: "Animals",
      words: [
        ["Penguin",   "Cold"],
        ["Shark",     "Teeth"],
        ["Sloth",     "Slow"],
        ["Raccoon",   "Bins"],
        ["Horse",     "Big"],
        ["Octopus",   "Many legs"],
        ["Goose",     "Wings"],
        ["Hamster",   "Small"],
        ["Crocodile", "Water"],
        ["Pigeon",    "In cities"],
        ["Pig",       "A farm"],
        ["Cow",       "Grazing"],
        ["Giraffe",   "Tall"],
        ["Spider",    "Feared"],
      ],
    },
    {
      name: "Sports",
      words: [
        ["Golf",       "Slow"],
        ["Boxing",     "One-on-one"],
        ["Swimming",   "Water"],
        ["Darts",      "The pub"],
        ["Marathon",   "Running"],
        ["Skiing",     "Snow"],
        ["Tennis",     "A net"],
        ["Rugby",      "Rough"],
        ["Bowling",    "Rented shoes"],
        ["Formula 1",  "Fast"],
        ["Baseball",   "A bat"],
        ["Basketball", "Indoors"],
        ["Hockey",     "Ice"],
      ],
    },
    {
      name: "Around the house",
      words: [
        ["Kettle",      "Hot"],
        ["Sofa",        "Sitting"],
        ["Shower",      "Water"],
        ["Fridge",      "Cold"],
        ["Doorbell",    "A sound"],
        ["Laundry",     "Washing"],
        ["Houseplant",  "Green"],
        ["Smoke alarm", "Beeping"],
        ["Radiator",    "Warm"],
        ["Junk drawer", "Full"],
      ],
    },
    {
      name: "Colours",
      words: [
        ["Red",       "Bold"],
        ["Navy",      "Dark"],
        ["Beige",     "Plain"],
        ["Neon pink", "Bright"],
        ["Gold",      "Metallic"],
        ["Lilac",     "Pale"],
        ["Black",     "Formal"],
        ["Turquoise", "The sea"],
        ["Burgundy",  "Wine"],
        ["Silver",    "Shiny"],
        ["Green",     "Nature"],
        ["White",     "Clean"],
      ],
    },
    {
      name: "Things",
      words: [
        ["Phone charger", "Borrowed"],
        ["Group chat",    "Notifications"],
        ["Fake ID",       "Risky"],
        ["Tattoo",        "Permanent"],
        ["Passport",      "Travel"],
        ["AirPods",       "Easily lost"],
        ["Wallet",        "Cards"],
        ["Sunglasses",    "Outside"],
        ["Uber",          "An app"],
        ["Umbrella",      "Rain"],
      ],
    },
  ],
  night: [
    {
      name: "Dating",
      words: [
        ["Situationship", "No label"],
        ["Talking stage", "Early"],
        ["Soft launch",   "Online"],
        ["First date",    "Nerves"],
        ["Dating app",    "Strangers"],
        ["Exclusive",     "Agreed"],
        ["Third date",    "Counting"],
        ["Plus one",      "An invite"],
        ["Blind date",    "Set up"],
        ["The talk",      "Overdue"],
      ],
    },
    {
      name: "Exes",
      words: [
        ["Ex's apartment",        "A place"],
        ["Rebound",               "Too soon"],
        ["Ghosting",              "No reply"],
        ["Blocked number",        "Your phone"],
        ["Drunk text",            "3am"],
        ["Old photos",            "Kept"],
        ["Closure",               "An ending"],
        ["Box of their stuff",    "Returned"],
        ["Someone else's hoodie", "Borrowed"],
        ["Unfollowed",            "Online"],
      ],
    },
    {
      name: "Texting",
      words: [
        ["Left on read",      "No reply"],
        ["Double text",       "Twice"],
        ["Slid into the DMs", "First move"],
        ["Screenshot",        "Saved"],
        ["Shared location",   "A map"],
        ["Read receipts",     "A setting"],
        ["Typing dots",       "Waiting"],
        ["Notifications off", "Silence"],
        ["Breadcrumbing",     "Just enough"],
        ["Drafts folder",     "Unsent"],
      ],
    },
    {
      name: "Nightlife",
      words: [
        ["Afterparty",          "Somewhere else"],
        ["Lock-in",             "Doors shut"],
        ["Closing time",        "The end"],
        ["VIP booth",           "Roped off"],
        ["Bottle service",      "Expensive"],
        ["Last one standing",   "Alone"],
        ["Night bus",           "Getting home"],
        ["Queue jump",          "Cutting in"],
        ["Bad decision",        "Seemed fine"],
        ["Sunday morning taxi", "Daylight"],
      ],
    },
    {
      name: "Red flags",
      words: [
        ["Red flag",                  "A warning"],
        ["Hall pass",                 "Allowed"],
        ["Open relationship",         "Both know"],
        ["Long distance",             "Flights"],
        ["Mutual friend",             "In common"],
        ["Someone's coworker",        "At work"],
        ["Toothbrush at their place", "A step"],
        ["Meeting the parents",       "Serious"],
        ["Emergency contact",         "On forms"],
        ["Moving in together",        "Keys"],
      ],
    },
    {
      name: "Secrets",
      words: [
        ["Second phone",         "Spare"],
        ["Locked phone",         "Face down"],
        ["Burner account",       "Fake name"],
        ["Snooping",             "You looked"],
        ["White lie",            "Harmless"],
        ["Alibi",                "Your story"],
        ["Sworn to secrecy",     "Promised"],
        ["Deleted history",      "Gone"],
        ["Group chat about you", "Without you"],
        ["Anonymous account",    "No face"],
      ],
    },
  ],
  filthy: [
    {
      name: "Trouble",
      words: [
        ["Police",  "A uniform"],
        ["Bouncer", "Turned away"],
        ["Fine",    "Money"],
        ["Curfew",  "A time"],
        ["Lawyer",  "Expensive"],
        ["Bail",    "Paid out"],
        ["Warning", "Just once"],
        ["Fight",   "Kicked off"],
        ["Caution", "On record"],
        ["Witness", "Someone saw"],
      ],
    },
    {
      name: "The morning after",
      words: [
        ["Hangover",   "Your head"],
        ["Receipt",    "The total"],
        ["Voicemail",  "A message"],
        ["Stranger",   "Someone new"],
        ["Taxi",       "Got home"],
        ["Sunglasses", "Indoors"],
        ["Water",      "Thirsty"],
        ["Regret",     "The feeling"],
        ["Bruise",     "A mark"],
        ["Silence",    "Nobody talks"],
      ],
    },
    {
      name: "Things you'd hide",
      words: [
        ["Diary",   "Written down"],
        ["Receipt", "Proof"],
        ["Bruise",  "Covered up"],
        ["Message", "Deleted"],
        ["Photo",   "One copy"],
        ["Bottle",  "Empty"],
        ["Tattoo",  "Long sleeves"],
        ["Letter",  "Kept"],
        ["Key",     "Not yours"],
        ["Scar",    "Old"],
      ],
    },
    {
      name: "Regrets",
      words: [
        ["Tattoo",     "Forever"],
        ["Text",       "Sent"],
        ["Shot",       "One more"],
        ["Voicemail",  "Played back"],
        ["Haircut",    "It grows"],
        ["Email",      "Reply all"],
        ["Tequila",    "Every time"],
        ["Ex",         "Back again"],
        ["Piercing",   "It closes"],
        ["Confession", "Out loud"],
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

/**
 * Every word a draw can land on, with its hint attached — the chosen
 * category's, or all of them when none is set.
 *
 * The hint travels WITH the word rather than being looked up afterwards. A
 * lookup would have to key on the word, and the word is not unique: Tattoo is
 * in Things, in Things you'd hide and in Regrets, and it wants a different
 * nudge in each — "Permanent", "Long sleeves", "Forever". Which one you get
 * is a fact about the draw, so the draw is what carries it.
 */
export function wordsFor(mode: ContentMode, category: string | null): readonly SecretWord[] {
  const cats = categoriesFor(mode);
  if (!category) return cats.flatMap((c) => c.words);
  return cats.find((c) => c.name === category)?.words ?? cats.flatMap((c) => c.words);
}

export function categoryNames(mode: ContentMode): string[] {
  return categoriesFor(mode).map((c) => c.name);
}
