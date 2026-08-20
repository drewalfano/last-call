import type { Pools } from "./pools";

/**
 * RANK IT — ranking prompts.
 * Night policy: LEAD — the 19+ sets go on top, the safe ones stay.
 * The lists here are picked by name off a browsable page, not drawn blind,
 * so swapping them out would take away choices the table can still see and
 * still wants. See data/pools.ts for why categories lead rather than replace.
 *
 * Every prompt has to be OPINION, never trivia. "Rank these by population" has
 * a right answer, so the group isn't guessing the Ranker — they're guessing a
 * fact, and the game stops being about the person. Each set below is one a
 * table can argue about for a minute without anyone being able to prove a
 * point, which is where the fun is.
 *
 * Four or five items. Three is over too fast; six turns a quick round into
 * admin.
 */
export interface RankPrompt {
  /** The instruction — carries the axis being ranked. */
  title: string;
  items: string[];
}

export const RANK_IT: Pools<RankPrompt> = {
  safe: [
    { title: "Rank these fast food places, best to worst", items: ["McDonald's", "Wendy's", "Taco Bell", "Subway", "KFC"] },
    { title: "Rank these nights out, best to worst", items: ["House party", "Club", "Pub", "Concert", "Patio drinks"] },
    { title: "Rank these from worst to least bad", items: ["Being left on read", "A bad haircut", "Missing a flight", "Losing your phone", "Getting caught lying"] },
    { title: "Rank these hangover cures", items: ["Greasy breakfast", "Going back to sleep", "Cold shower", "Gatorade", "Hair of the dog"] },
    { title: "Rank these pizza toppings", items: ["Pepperoni", "Pineapple", "Mushroom", "Olives", "Extra cheese"] },
    { title: "Rank these ways to spend a Sunday", items: ["Lie-in", "Big walk", "Roast dinner", "Doing nothing", "Seeing friends"] },
    { title: "Rank these from most to least annoying", items: ["Slow walkers", "Loud chewing", "Being late", "Talking in films", "Leaving on read"] },
    { title: "Rank these holidays", items: ["Beach", "City break", "Skiing", "Road trip", "Camping"] },
    { title: "Rank these chores worst to best", items: ["Washing up", "Laundry", "Bins", "Hoovering", "Cleaning the bathroom"] },
    { title: "Rank these breakfast foods", items: ["Pancakes", "Full fry-up", "Cereal", "Avocado toast", "Nothing"] },
    { title: "Rank these seats on a plane", items: ["Window", "Aisle", "Middle", "Exit row", "Front row"] },
    { title: "Rank these from most to least stressful", items: ["Job interview", "First date", "Public speaking", "Driving test", "Family dinner"] },
    { title: "Rank these party guests", items: ["The one who brings drinks", "The DJ", "The early leaver", "The one who cries", "The one who cleans up"] },
    { title: "Rank these snacks", items: ["Crisps", "Chocolate", "Popcorn", "Cheese", "Ice cream"] },
    { title: "Rank these from most to least overrated", items: ["New Year's Eve", "Brunch", "Festivals", "Weddings", "Birthdays"] },
    { title: "Rank these apps by hours lost", items: ["Instagram", "TikTok", "YouTube", "Netflix", "Group chat"] },
    { title: "Rank these ways to travel", items: ["Train", "Plane", "Car", "Bus", "Walking"] },
    { title: "Rank these drinks", items: ["Beer", "Wine", "Cocktails", "Shots", "Water"] },
    { title: "Rank these superpowers", items: ["Flying", "Invisibility", "Reading minds", "Time travel", "Never being tired"] },
    { title: "Rank these from most to least embarrassing", items: ["Tripping in public", "Wrong name", "Reply-all", "Waving at a stranger", "Voice note by accident"] },
    { title: "Rank these pets", items: ["Dog", "Cat", "Fish", "Bird", "Something illegal"] },
    { title: "Rank these seasons", items: ["Summer", "Autumn", "Winter", "Spring"] },
    { title: "Rank these dinner options", items: ["Cook properly", "Takeaway", "Leftovers", "Cereal", "Going out"] },
    { title: "Rank these from most to least worth the money", items: ["Good coffee", "Concert tickets", "Nice shoes", "A big TV", "A holiday"] },
  ],
  night: [
    { title: "Rank these red flags, worst first", items: ["Still texts their ex", "No friends", "Rude to staff", "Won't stop talking about work", "Second phone"] },
    { title: "Rank these dating disasters, worst first", items: ["Getting ghosted", "Being cheated on", "A public breakup", "Meeting their parents too early", "Finding an old photo"] },
    { title: "Rank these dating app sins", items: ["No photos", "Only group photos", "Gym mirror selfie", "Fish", "One-word bio"] },
    { title: "Rank these places to hook up", items: ["Their place", "Your place", "A hotel", "A car", "A festival tent"] },
    { title: "Rank these first-date spots", items: ["Bar", "Dinner", "Coffee", "A walk", "Their place"] },
    { title: "Rank these from most to least forgivable", items: ["Leaving on read", "Cancelling last minute", "Flirting with a friend", "Lying about their age", "Forgetting a birthday"] },
    { title: "Rank these ways to end things", items: ["In person", "Phone call", "Text", "Ghosting", "Getting a friend to do it"] },
    { title: "Rank these exes by how much of a mistake", items: ["The rebound", "The long one", "The one your friends hated", "The one you cheated with", "The one who cried"] },
    { title: "Rank these from most to least of a turn-off", items: ["Bad texting", "No ambition", "Talks over you", "Bad tipper", "Won't split the bill"] },
    { title: "Rank these confessions worst first", items: ["Kissed a friend's ex", "Faked it", "Read their messages", "Lied about your number", "Still have their hoodie"] },
    { title: "Rank these situationship stages", items: ["Talking stage", "Soft launch", "Exclusive", "The talk", "Meeting the friends"] },
    { title: "Rank these by how badly it ends", items: ["Work romance", "Friend's sibling", "Ex's friend", "Holiday fling", "Housemate"] },
    { title: "Rank these texts by desperation", items: ["\"you up\"", "\"we should catch up\"", "A late-night voice note", "Liking an old photo", "\"wrong chat sorry\""] },
    { title: "Rank these from most to least of a green flag", items: ["Good with your friends", "Texts back fast", "Cooks", "Owns a car", "Pays attention"] },
    { title: "Rank these worst nights out", items: ["Losing everyone", "Getting refused entry", "Running into an ex", "Spending rent money", "Crying in the smoking area"] },
  ],
  filthy: [
    { title: "Rank these morning-after moves", items: ["Breakfast together", "Sneak out", "Order a taxi", "Stay all day", "Ask for a lift"] },
    { title: "Rank these by how much trouble they'd get you in", items: ["Group chat screenshot", "Your search history", "A work email", "Your last three texts", "Your camera roll"] },
    { title: "Rank these confessions, worst to hear from a friend", items: ["They cheated", "They lied to you for years", "They took your money", "They told your secret", "They set you up"] },
    { title: "Rank these by how fast you'd lose your job", items: ["A photo", "A group chat", "A voicemail", "A witness", "A receipt"] },
    { title: "Rank these blackouts, worst first", items: ["Wrong city", "Wrong bed", "No phone", "No wallet", "No memory"] },
    { title: "Rank these betrayals, worst first", items: ["A friend's ex", "A friend's partner", "A friend's secret", "A friend's money", "A friend's job"] },
    { title: "Rank these by how hard they'd be to explain", items: ["A tattoo", "A stranger", "A hospital band", "A police caution", "A new number"] },
    { title: "Rank these things to be caught with", items: ["Someone's phone", "Someone's key", "Someone's letter", "Someone's partner", "Someone's money"] },
  ],
};
