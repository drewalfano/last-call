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
 * ONE WORD, TWO AT THE OUTSIDE, AND THAT IS A RULE ABOUT THE GAME RATHER
 * THAN ABOUT THE CARD. These ran to a phrase each at first — "Nobody wants to
 * be there", "You know how it ends" — and a phrase is not a nudge, it is a
 * clue with the work already done. What the Imposter needs is a word to think
 * from, not a sentence to lean on: "Dreaded" leaves them somewhere to start
 * and everything still to work out, where the long form left them holding
 * most of the answer. Anything past two words wants cutting rather than
 * rewording.
 *
 * SO EVERY ONE OF THESE IS DELIBERATELY UNDER-SPECIFIED. The test each hint
 * has to pass is that it fits several words in its own category and not just
 * its own: "Cold" is Sushi here, and sits just as well on the Ice bucket two
 * categories down, on Iceland and on Skiing. "Morning" is the Cereal and the
 * Hangover. "Dreaded" is the Hospital and the Dentist. An Imposter who reads
 * one still has to listen — they have narrowed the room, not found the word.
 * A hint that identifies its word is a bug in this file, and the fix is
 * always to make it vaguer rather than to delete it.
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
        ["Carrot", "Healthy"],
        ["Pizza", "Shared"],
        ["Sushi", "Cold"],
        ["Kebab", "Late"],
        ["Pancakes", "Stacked"],
        ["Avocado", "Overpriced"],
        ["Hot sauce", "Burns"],
        ["Cereal", "Morning"],
        ["Garlic bread", "A side"],
        ["Oysters", "Acquired"],
      ],
    },
    {
      name: "Celebrities",
      words: [
        ["Beyoncé", "Stadiums"],
        ["Taylor Swift", "Crowds"],
        ["Dwayne Johnson", "Huge"],
        ["Rihanna", "Business"],
        ["Gordon Ramsay", "Shouting"],
        ["Snoop Dogg", "Relaxed"],
        ["Adele", "Heartbreak"],
        ["Keanu Reeves", "Beloved"],
        ["Zendaya", "Young"],
        ["David Attenborough", "The voice"],
      ],
    },
    {
      name: "Night out",
      words: [
        ["Cover fee", "Upfront"],
        ["Bouncer", "No"],
        ["Last call", "The end"],
        ["Dance floor", "Sticky"],
        ["Smoking area", "Outside"],
        ["Coat check", "Left behind"],
        ["Bar tab", "Adds up"],
        ["Taxi queue", "Waiting"],
        ["Dive bar", "Cheap"],
        ["Rooftop bar", "A view"],
      ],
    },
    {
      name: "Drinks",
      words: [
        ["Tequila", "Trouble"],
        ["Espresso martini", "Awake"],
        ["Guinness", "Slow"],
        ["Shots", "At once"],
        ["Hangover", "Morning"],
        ["Happy hour", "Half price"],
        ["Open bar", "Free"],
        ["Beer pong", "A game"],
        ["Bottomless brunch", "Daytime"],
        ["Ice bucket", "Cold"],
      ],
    },
    {
      name: "Places",
      words: [
        ["Airport", "Early"],
        ["Casino", "You lose"],
        ["Gym", "January"],
        ["Hospital", "Dreaded"],
        ["Petrol station", "A stop"],
        ["Library", "Quiet"],
        ["Beach", "Warm"],
        ["IKEA", "A maze"],
        ["Laundromat", "Killing time"],
        ["Waiting room", "Your turn"],
      ],
    },
    {
      name: "Screen",
      words: [
        ["Titanic", "Doomed"],
        ["The Office", "Cringe"],
        ["Love Island", "Couples"],
        ["Jaws", "Stay out"],
        ["Breaking Bad", "He changes"],
        ["Star Wars", "Universal"],
        ["Netflix", "Nothing on"],
        ["Horror film", "Peeking"],
        ["Reality TV", "Scripted"],
        ["Cliffhanger", "Unfinished"],
      ],
    },
    {
      name: "Jobs",
      words: [
        ["Dentist", "Dreaded"],
        ["Lifeguard", "Watching"],
        ["Pilot", "Uniform"],
        ["Teacher", "Underpaid"],
        ["Influencer", "Hardly work"],
        ["Plumber", "Emergency"],
        ["Chef", "Hot"],
        ["Barber", "Monthly"],
        ["Wedding planner", "One day"],
        ["Taxi driver", "Opinions"],
      ],
    },
    {
      name: "Countries",
      words: [
        ["Japan", "Orderly"],
        ["Brazil", "Loud"],
        ["Ireland", "Rain"],
        ["Egypt", "Ancient"],
        ["Australia", "It bites"],
        ["Italy", "Eat well"],
        ["Iceland", "Cold"],
        ["Mexico", "Spicy"],
        ["Thailand", "Backpackers"],
        ["Canada", "Polite"],
      ],
    },
    {
      name: "Cities",
      words: [
        ["Paris", "Romantic"],
        ["Tokyo", "Enormous"],
        ["Vegas", "Excess"],
        ["Dublin", "Pints"],
        ["New York", "Never stops"],
        ["Amsterdam", "Bikes"],
        ["Berlin", "All weekend"],
        ["Sydney", "Far"],
        ["Rome", "Ruins"],
        ["Ibiza", "One season"],
      ],
    },
    {
      name: "Animals",
      words: [
        ["Penguin", "Dressed up"],
        ["Shark", "Keeps moving"],
        ["Sloth", "Slow"],
        ["Raccoon", "Your bins"],
        ["Horse", "Expensive"],
        ["Octopus", "Clever"],
        ["Goose", "Aggressive"],
        ["Hamster", "Short-lived"],
        ["Crocodile", "It waits"],
        ["Pigeon", "Ignored"],
      ],
    },
    {
      name: "Sports",
      words: [
        ["Golf", "Slow"],
        ["Boxing", "One-on-one"],
        ["Swimming", "Wet"],
        ["Darts", "The pub"],
        ["Marathon", "Training"],
        ["Skiing", "Cold"],
        ["Tennis", "Grunting"],
        ["Rugby", "Bruises"],
        ["Bowling", "Rented shoes"],
        ["Formula 1", "Loud"],
      ],
    },
    {
      name: "Around the house",
      words: [
        ["Kettle", "First thing"],
        ["Sofa", "Sinking"],
        ["Shower", "Thinking"],
        ["Fridge", "Keep looking"],
        ["Doorbell", "Someone's here"],
        ["Laundry", "Never done"],
        ["Houseplant", "Neglected"],
        ["Smoke alarm", "3am"],
        ["Radiator", "Winter"],
        ["Junk drawer", "Everything"],
      ],
    },
    {
      name: "Colours",
      words: [
        ["Red", "Stop"],
        ["Navy", "Safe"],
        ["Beige", "Boring"],
        ["Neon green", "Unmissable"],
        ["Gold", "First"],
        ["Lilac", "Gentle"],
        ["Black", "Always works"],
        ["Turquoise", "Holiday"],
        ["Burgundy", "Deep"],
        ["Silver", "Second"],
      ],
    },
    {
      name: "Things",
      words: [
        ["Phone charger", "Borrowed"],
        ["Group chat", "Muted"],
        ["Fake ID", "Risky"],
        ["Tattoo", "Permanent"],
        ["Passport", "Precious"],
        ["AirPods", "Easily lost"],
        ["Wallet", "Pocket"],
        ["Sunglasses", "Indoors"],
        ["Uber", "Minutes away"],
        ["Umbrella", "Forgotten"],
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
        ["Situationship", "Undefined"],
        ["Talking stage", "Early"],
        ["Soft launch", "Barely shown"],
        ["First date", "Nerves"],
        ["Dating app", "Endless"],
        ["Exclusive", "Agreed"],
        ["Third date", "Expectations"],
        ["Plus one", "Invited along"],
        ["Blind date", "No idea"],
        ["The talk", "Overdue"],
      ],
    },
    {
      name: "Exes",
      words: [
        ["Ex's apartment", "Familiar"],
        ["Rebound", "Too soon"],
        ["Ghosting", "No reply"],
        ["Blocked number", "Deliberate"],
        ["Drunk text", "3am"],
        ["Old photos", "Still there"],
        ["Closure", "Never quite"],
        ["Box of their stuff", "Returned"],
        ["Someone else's hoodie", "Not yours"],
        ["Unfollowed", "Noticed"],
      ],
    },
    {
      name: "Texting",
      words: [
        ["Left on read", "Seen"],
        ["Double text", "Couldn't wait"],
        ["Slid into the DMs", "Bold"],
        ["Screenshot", "Evidence"],
        ["Shared location", "Trust"],
        ["Read receipts", "Optional"],
        ["Typing dots", "Then nothing"],
        ["Notifications off", "Peace"],
        ["Breadcrumbing", "Just enough"],
        ["Drafts folder", "Unsent"],
      ],
    },
    {
      name: "Nightlife",
      words: [
        ["Afterparty", "Elsewhere"],
        ["Lock-in", "Doors shut"],
        ["Closing time", "Lights on"],
        ["VIP booth", "Roped off"],
        ["Bottle service", "Expensive"],
        ["Last one standing", "Alone"],
        ["Night bus", "Grim"],
        ["Queue jump", "Cutting in"],
        ["Bad decision", "Seemed fine"],
        ["Sunday morning taxi", "Daylight"],
      ],
    },
    {
      name: "Red flags",
      words: [
        ["Red flag", "You knew"],
        ["Hall pass", "Permitted"],
        ["Open relationship", "Both know"],
        ["Long distance", "Flights"],
        ["Mutual friend", "Awkward"],
        ["Someone's coworker", "Monday"],
        ["Toothbrush at their place", "A step"],
        ["Meeting the parents", "Serious"],
        ["Emergency contact", "On forms"],
        ["Moving in together", "Keys"],
      ],
    },
    {
      name: "Secrets",
      words: [
        ["Second phone", "Spare"],
        ["Locked phone", "Face down"],
        ["Burner account", "Fake name"],
        ["Snooping", "You looked"],
        ["White lie", "Harmless"],
        ["Alibi", "Your story"],
        ["Sworn to secrecy", "Promised"],
        ["Deleted history", "Gone"],
        ["Group chat about you", "Without you"],
        ["Anonymous account", "No face"],
      ],
    },
  ],
  filthy: [
    {
      name: "Trouble",
      words: [
        ["Police", "They arrive"],
        ["Bouncer", "Turned away"],
        ["Fine", "It costs"],
        ["Curfew", "By then"],
        ["Lawyer", "Expensive"],
        ["Bail", "Paid out"],
        ["Warning", "Just once"],
        ["Fight", "Kicked off"],
        ["Caution", "On record"],
        ["Witness", "Someone saw"],
      ],
    },
    {
      name: "The morning after",
      words: [
        ["Hangover", "Self-inflicted"],
        ["Receipt", "The total"],
        ["Voicemail", "Rambling"],
        ["Stranger", "Who?"],
        ["Taxi", "Got home"],
        ["Sunglasses", "Indoors"],
        ["Water", "Too late"],
        ["Regret", "The feeling"],
        ["Bruise", "No idea"],
        ["Silence", "Unspoken"],
      ],
    },
    {
      name: "Things you'd hide",
      words: [
        ["Diary", "Written down"],
        ["Receipt", "Proof"],
        ["Bruise", "Covered up"],
        ["Message", "Delete it"],
        ["Photo", "One copy"],
        ["Bottle", "Empty"],
        ["Tattoo", "Long sleeves"],
        ["Letter", "Kept"],
        ["Key", "Not yours"],
        ["Scar", "Old"],
      ],
    },
    {
      name: "Regrets",
      words: [
        ["Tattoo", "Forever"],
        ["Text", "Sent"],
        ["Shot", "One more"],
        ["Voicemail", "Played back"],
        ["Haircut", "It grows"],
        ["Email", "Reply all"],
        ["Tequila", "Every time"],
        ["Ex", "Back again"],
        ["Piercing", "It closes"],
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
 * nudge in each — "Permanent", "Under a sleeve", "Forever". Which one you get
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
