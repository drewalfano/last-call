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
 * SO EVERY ONE OF THESE IS DELIBERATELY UNDER-SPECIFIED. The test each hint
 * has to pass is that it fits several words in its own category and not just
 * its own: "Cold" is Sushi here, but it would sit just as well on the Ice
 * bucket two categories down, and "After midnight" belongs to the Kebab, the
 * Taxi queue and the Night bus alike. An Imposter who reads one still has to
 * listen — they have narrowed the room, not found the word. A hint that
 * identifies its word is a bug in this file, and the fix is always to make it
 * vaguer rather than to delete it.
 *
 * They also have to survive being SAID, because a table can hear a hint read
 * out and know instantly who read it — see the rule on the role card. Written
 * as a fragment rather than a clue for exactly that reason: "Shared out" is
 * useless as a turn and fine as a starting point.
 *
 * A tuple, not an object. Two hundred and forty of these are written by hand
 * and read as a list; `["Pizza", "Shared out"]` stays a table you can scan a
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
        ["Carrot", "Good for you"],
        ["Pizza", "Shared out"],
        ["Sushi", "Cold"],
        ["Kebab", "After midnight"],
        ["Pancakes", "Stacked up"],
        ["Avocado", "Overpriced"],
        ["Hot sauce", "It burns"],
        ["Cereal", "Morning"],
        ["Garlic bread", "On the side"],
        ["Oysters", "An acquired taste"],
      ],
    },
    {
      name: "Celebrities",
      words: [
        ["Beyoncé", "Sells out stadiums"],
        ["Taylor Swift", "Enormous crowds"],
        ["Dwayne Johnson", "Very large"],
        ["Rihanna", "Sells more than music"],
        ["Gordon Ramsay", "Shouts"],
        ["Snoop Dogg", "Very relaxed"],
        ["Adele", "Makes you cry"],
        ["Keanu Reeves", "Universally liked"],
        ["Zendaya", "Young for it"],
        ["David Attenborough", "That voice"],
      ],
    },
    {
      name: "Night out",
      words: [
        ["Cover fee", "Before you're in"],
        ["Bouncer", "Says no"],
        ["Last call", "The end of it"],
        ["Dance floor", "Sticky"],
        ["Smoking area", "Outside"],
        ["Coat check", "You'll want it back"],
        ["Bar tab", "It adds up"],
        ["Taxi queue", "Waiting"],
        ["Dive bar", "Cheap"],
        ["Rooftop bar", "A view"],
      ],
    },
    {
      name: "Drinks",
      words: [
        ["Tequila", "Trouble"],
        ["Espresso martini", "Keeps you going"],
        ["Guinness", "Takes its time"],
        ["Shots", "All at once"],
        ["Hangover", "The morning"],
        ["Happy hour", "Cheaper for a while"],
        ["Open bar", "Free"],
        ["Beer pong", "There are rules"],
        ["Bottomless brunch", "Daytime"],
        ["Ice bucket", "Cold"],
      ],
    },
    {
      name: "Places",
      words: [
        ["Airport", "Early"],
        ["Casino", "You'll lose"],
        ["Gym", "January"],
        ["Hospital", "Nobody wants to be there"],
        ["Petrol station", "A quick stop"],
        ["Library", "Quiet"],
        ["Beach", "Warm"],
        ["IKEA", "A maze"],
        ["Laundromat", "Waiting around"],
        ["Waiting room", "Your name gets called"],
      ],
    },
    {
      name: "Screen",
      words: [
        ["Titanic", "You know how it ends"],
        ["The Office", "Cringe"],
        ["Love Island", "Couples"],
        ["Jaws", "Don't go in"],
        ["Breaking Bad", "He changes"],
        ["Star Wars", "Everyone's seen it"],
        ["Netflix", "Nothing on"],
        ["Horror film", "Through your fingers"],
        ["Reality TV", "Not really real"],
        ["Cliffhanger", "Wait a year"],
      ],
    },
    {
      name: "Jobs",
      words: [
        ["Dentist", "Nobody looks forward to it"],
        ["Lifeguard", "Watching"],
        ["Pilot", "The uniform"],
        ["Teacher", "Underpaid"],
        ["Influencer", "Is that a job?"],
        ["Plumber", "You call in a panic"],
        ["Chef", "Hot and loud"],
        ["Barber", "Half an hour"],
        ["Wedding planner", "One big day"],
        ["Taxi driver", "Opinions"],
      ],
    },
    {
      name: "Countries",
      words: [
        ["Japan", "Very orderly"],
        ["Brazil", "Loud and warm"],
        ["Ireland", "It rains"],
        ["Egypt", "Very old"],
        ["Australia", "Everything bites"],
        ["Italy", "You'd eat well"],
        ["Iceland", "Small and cold"],
        ["Mexico", "Spicy"],
        ["Thailand", "Backpackers"],
        ["Canada", "Polite"],
      ],
    },
    {
      name: "Cities",
      words: [
        ["Paris", "Romantic, supposedly"],
        ["Tokyo", "Enormous"],
        ["Vegas", "What happens there"],
        ["Dublin", "Pints"],
        ["New York", "It doesn't stop"],
        ["Amsterdam", "Bikes and water"],
        ["Berlin", "Out until Monday"],
        ["Sydney", "The other side of the world"],
        ["Rome", "Ruins"],
        ["Ibiza", "One long season"],
      ],
    },
    {
      name: "Animals",
      words: [
        ["Penguin", "Dressed for it"],
        ["Shark", "Keeps moving"],
        ["Sloth", "In no hurry"],
        ["Raccoon", "Goes through your bins"],
        ["Horse", "Big and expensive"],
        ["Octopus", "Cleverer than it looks"],
        ["Goose", "Aggressive"],
        ["Hamster", "Won't last long"],
        ["Crocodile", "It waits"],
        ["Pigeon", "Everywhere, ignored"],
      ],
    },
    {
      name: "Sports",
      words: [
        ["Golf", "Slow and expensive"],
        ["Boxing", "Two of you"],
        ["Swimming", "Wet"],
        ["Darts", "In a pub"],
        ["Marathon", "Months of training"],
        ["Skiing", "Cold and expensive"],
        ["Tennis", "Grunting"],
        ["Rugby", "Bruises"],
        ["Bowling", "Rented shoes"],
        ["Formula 1", "Very loud"],
      ],
    },
    {
      name: "Around the house",
      words: [
        ["Kettle", "First thing you do"],
        ["Sofa", "You sink into it"],
        ["Shower", "Where you think"],
        ["Fridge", "You keep opening it"],
        ["Doorbell", "Someone's here"],
        ["Laundry", "Never finished"],
        ["Houseplant", "You'll kill it"],
        ["Smoke alarm", "Only at 3am"],
        ["Radiator", "Winter"],
        ["Junk drawer", "Everything and nothing"],
      ],
    },
    {
      name: "Colours",
      words: [
        ["Red", "Stop"],
        ["Navy", "The safe choice"],
        ["Beige", "Boring"],
        ["Neon green", "You can't miss it"],
        ["Gold", "First place"],
        ["Lilac", "Gentle"],
        ["Black", "Goes with everything"],
        ["Turquoise", "Holiday water"],
        ["Burgundy", "Rich and dark"],
        ["Silver", "Second place"],
      ],
    },
    {
      name: "Things",
      words: [
        ["Phone charger", "Always someone else's"],
        ["Group chat", "Too many messages"],
        ["Fake ID", "Hope they don't look"],
        ["Tattoo", "Permanent"],
        ["Passport", "Don't lose it"],
        ["AirPods", "Easily lost"],
        ["Wallet", "A pocket"],
        ["Sunglasses", "Indoors, sometimes"],
        ["Uber", "Three minutes away"],
        ["Umbrella", "You forget it"],
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
        ["Soft launch", "Half a photo"],
        ["First date", "Nervous"],
        ["Dating app", "Endless"],
        ["Exclusive", "Agreed"],
        ["Third date", "Expectations"],
        ["Plus one", "Someone else's night"],
        ["Blind date", "You've no idea"],
        ["The talk", "Overdue"],
      ],
    },
    {
      name: "Exes",
      words: [
        ["Ex's apartment", "You know the way"],
        ["Rebound", "Too soon"],
        ["Ghosting", "No answer"],
        ["Blocked number", "Deliberate"],
        ["Drunk text", "3am"],
        ["Old photos", "Still there"],
        ["Closure", "Never quite"],
        ["Box of their stuff", "Handed back"],
        ["Someone else's hoodie", "Not yours"],
        ["Unfollowed", "They noticed"],
      ],
    },
    {
      name: "Texting",
      words: [
        ["Left on read", "Seen"],
        ["Double text", "Couldn't help it"],
        ["Slid into the DMs", "Bold"],
        ["Screenshot", "Evidence"],
        ["Shared location", "Trust, allegedly"],
        ["Read receipts", "On or off"],
        ["Typing dots", "Then nothing"],
        ["Notifications off", "Peace"],
        ["Breadcrumbing", "Just enough"],
        ["Drafts folder", "Never sent"],
      ],
    },
    {
      name: "Nightlife",
      words: [
        ["Afterparty", "Somewhere else"],
        ["Lock-in", "Doors shut, still going"],
        ["Closing time", "Lights on"],
        ["VIP booth", "Roped off"],
        ["Bottle service", "Expensive"],
        ["Last one standing", "Everyone else went home"],
        ["Night bus", "Cheap and grim"],
        ["Queue jump", "Not your turn"],
        ["Bad decision", "Seemed fine at the time"],
        ["Sunday morning taxi", "Daylight"],
      ],
    },
    {
      name: "Red flags",
      words: [
        ["Red flag", "You saw it"],
        ["Hall pass", "Allowed, apparently"],
        ["Open relationship", "Agreed terms"],
        ["Long distance", "Flights"],
        ["Mutual friend", "Awkward"],
        ["Someone's coworker", "Monday"],
        ["Toothbrush at their place", "A step"],
        ["Meeting the parents", "Serious"],
        ["Emergency contact", "On a form"],
        ["Moving in together", "Keys"],
      ],
    },
    {
      name: "Secrets",
      words: [
        ["Second phone", "One too many"],
        ["Locked phone", "Face down"],
        ["Burner account", "Not your name"],
        ["Snooping", "You looked"],
        ["White lie", "Harmless, you'd say"],
        ["Alibi", "Where you were"],
        ["Sworn to secrecy", "You promised"],
        ["Deleted history", "Gone now"],
        ["Group chat about you", "Without you"],
        ["Anonymous account", "No face"],
      ],
    },
  ],
  filthy: [
    {
      name: "Trouble",
      words: [
        ["Police", "They turn up"],
        ["Bouncer", "Won't let you in"],
        ["Fine", "It costs you"],
        ["Curfew", "By a certain time"],
        ["Lawyer", "Expensive help"],
        ["Bail", "To get out"],
        ["Warning", "Just the once"],
        ["Fight", "It kicked off"],
        ["Caution", "On record"],
        ["Witness", "Someone saw"],
      ],
    },
    {
      name: "The morning after",
      words: [
        ["Hangover", "Self-inflicted"],
        ["Receipt", "How much?"],
        ["Voicemail", "You left it"],
        ["Stranger", "Who?"],
        ["Taxi", "How you got back"],
        ["Sunglasses", "Indoors"],
        ["Water", "Too late now"],
        ["Regret", "The feeling"],
        ["Bruise", "No idea where from"],
        ["Silence", "Nobody's talking"],
      ],
    },
    {
      name: "Things you'd hide",
      words: [
        ["Diary", "Written down"],
        ["Receipt", "Proof of spending"],
        ["Bruise", "Cover it up"],
        ["Message", "Delete it"],
        ["Photo", "One copy left"],
        ["Bottle", "Empty"],
        ["Tattoo", "Under a sleeve"],
        ["Letter", "Kept"],
        ["Key", "Not yours to have"],
        ["Scar", "Old"],
      ],
    },
    {
      name: "Regrets",
      words: [
        ["Tattoo", "Forever"],
        ["Text", "Sent"],
        ["Shot", "One more"],
        ["Voicemail", "Listening back"],
        ["Haircut", "It grows"],
        ["Email", "Reply all"],
        ["Tequila", "Every time"],
        ["Ex", "Back again"],
        ["Piercing", "It closes up"],
        ["Confession", "Said out loud"],
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
