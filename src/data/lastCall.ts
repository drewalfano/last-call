import type { Pools } from "./pools";

/**
 * LAST CALL — the app's namesake wildcard mode.
 * Night policy: SUPPLEMENT — the 19+ cards join the safe ones, tier by tier.
 *
 * Unlike every other mode, the player doesn't know what *type* of prompt
 * is coming. Each card carries a `kind` (shown as the card eyebrow) and an
 * `intensity` tier. The game deals tier 1 first, then 2, then 3, so a round
 * escalates from social to chaotic instead of opening at full volume.
 *
 * Tier 1 also absorbed the former Happy Hour Qs deck: get-to-know-you
 * questions are exactly what a warm-up card is, and they no longer justify a
 * mode slot of their own.
 *
 * intensity 1 — warm-up, works on a table that just sat down
 * intensity 2 — pointed, personal, starts naming names
 * intensity 3 — chaotic, the reason someone says "okay, last one"
 */
export type WildcardKind = "callout" | "drink" | "vote" | "dare" | "confession" | "question";

export interface Wildcard {
  kind: WildcardKind;
  text: string;
  intensity: 1 | 2 | 3;
}

/** Card eyebrow copy for each kind. */
export const WILDCARD_LABEL: Record<WildcardKind, string> = {
  callout: "Call-out",
  drink: "Drink",
  vote: "Vote",
  dare: "Mini dare",
  confession: "Confession",
  question: "Question",
};

export const LAST_CALL: Pools<Wildcard> = {
  safe: [
    { kind: "callout", text: "Name the person here most likely to still be talking in an hour.", intensity: 1 },
    { kind: "drink", text: "Everyone wearing something they've owned over five years drinks.", intensity: 1 },
    { kind: "question", text: "What's the best thing anyone at this table has done this year?", intensity: 1 },
    { kind: "vote", text: "Vote on who's the best person to sit next to at a wedding.", intensity: 1 },
    { kind: "dare", text: "Swap seats with {other} for the next three turns.", intensity: 1 },
    { kind: "confession", text: "Admit the last thing you googled that you'd rather not read out.", intensity: 1 },
    { kind: "drink", text: "Anyone who's eaten today drinks. Anyone who hasn't drinks twice.", intensity: 1 },
    { kind: "question", text: "What's something you've changed your mind about this year?", intensity: 1 },
    { kind: "callout", text: "Someone here gives advice they never take. Say who.", intensity: 1 },
    { kind: "vote", text: "Vote on who'd handle a genuine emergency best.", intensity: 1 },
    { kind: "dare", text: "Give {other} a compliment specific enough that it can't be a guess.", intensity: 2 },
    { kind: "question", text: "What's the last thing you spent money on and regretted?", intensity: 2 },
    { kind: "drink", text: "Drink if you've cancelled on someone at this table.", intensity: 2 },
    { kind: "callout", text: "Name the person here who's changed the least. Is that a compliment?", intensity: 2 },
    { kind: "confession", text: "What's a story you tell that's a bit better than the truth?", intensity: 2 },
    { kind: "vote", text: "Vote on who's the hardest to get a straight answer out of.", intensity: 2 },
    { kind: "question", text: "What do you think this group gets wrong about you?", intensity: 2 },
    { kind: "dare", text: "Let {other} ask you one question you have to answer straight.", intensity: 2 },
    { kind: "drink", text: "Everyone drinks who's checked their phone since the last card.", intensity: 2 },
    { kind: "callout", text: "Point at whoever is having the best year. They don't get to argue.", intensity: 2 },
    { kind: "confession", text: "Tell the group something you've never said out loud at this table.", intensity: 3 },
    { kind: "dare", text: "Let {other} read the last message you sent, in full.", intensity: 3 },
    { kind: "vote", text: "Vote on who'd be missed most if they stopped coming out.", intensity: 3 },
    { kind: "question", text: "What's the thing you'd want said about you in a toast?", intensity: 3 },
    { kind: "drink", text: "Everyone drinks for every year they've known the person to their left.", intensity: 3 },
    { kind: "callout", text: "Say the nicest true thing you've never told {other}.", intensity: 3 },
    { kind: "confession", text: "Admit the last time you were genuinely wrong about someone here.", intensity: 3 },
    { kind: "dare", text: "Everyone answers one question you choose. You answer it last.", intensity: 3 },
    { kind: "question", text: "What's the best money you've spent in the last year?", intensity: 1 },
    { kind: "question", text: "What's a strong opinion you hold about something trivial?", intensity: 1 },
    { kind: "question", text: "Who in your life would be hardest to replace?", intensity: 2 },
    { kind: "question", text: "What's something you were sure about at 18 and completely wrong about?", intensity: 2 },
    { kind: "question", text: "What's the last thing that genuinely impressed you?", intensity: 1 },
    { kind: "question", text: "What would you do with a completely free Saturday and no phone?", intensity: 1 },
    { kind: "question", text: "What's a compliment you got that you still think about?", intensity: 2 },
    { kind: "question", text: "What's the worst advice you've ever been given confidently?", intensity: 2 },
    { kind: "question", text: "What's something you're better at than you let on?", intensity: 2 },
    { kind: "question", text: "Where were you happiest, geographically?", intensity: 3 },
    { kind: "question", text: "What's a small thing that instantly ruins your day?", intensity: 2 },
    { kind: "question", text: "What did you want to be at ten, and what happened to that?", intensity: 2 },
    { kind: "question", text: "Who's someone you should text back and haven't?", intensity: 2 },
    { kind: "question", text: "What's the most useless skill you're proud of?", intensity: 1 },
    { kind: "question", text: "What's something everyone seems to love that you don't get?", intensity: 2 },
    { kind: "question", text: "What's the best meal you've had this year?", intensity: 1 },
    { kind: "question", text: "What's a risk you took that worked out?", intensity: 2 },
    { kind: "question", text: "What's a risk you didn't take that you still think about?", intensity: 3 },
    { kind: "question", text: "What would your friends say is your most annoying habit?", intensity: 2 },
    { kind: "question", text: "What's something you've changed your mind about recently?", intensity: 1 },
    { kind: "question", text: "Who's the funniest person you know in real life?", intensity: 1 },
    { kind: "question", text: "What's a rule you live by that you'd recommend to anyone?", intensity: 2 },
    { kind: "question", text: "What's the last thing you did for the first time?", intensity: 3 },
    { kind: "question", text: "If you had to give a 20 minute talk with no prep, what's the topic?", intensity: 3 },
    { kind: "question", text: "How did tonight actually start? Whoever's turn it is tells it.", intensity: 1 },
    { kind: "vote", text: "Point at who's most likely to still be out at closing.", intensity: 1 },
    { kind: "drink", text: "Everyone who's checked their phone in the last minute drinks.", intensity: 1 },
    { kind: "callout", text: "Name the person here with the worst taste in music. Defend it.", intensity: 1 },
    { kind: "question", text: "What's the best thing that's happened to you this month?", intensity: 1 },
    { kind: "dare", text: "Say something nice about the person on your left. Mean it.", intensity: 1 },
    { kind: "drink", text: "Youngest person here drinks. Oldest person here decides how much.", intensity: 1 },
    { kind: "vote", text: "Vote on who's the most reliable person at this table.", intensity: 1 },
    { kind: "confession", text: "Admit one thing you're bad at that you pretend you're fine at.", intensity: 1 },
    { kind: "callout", text: "Someone here is the reason plans run late. Say the name.", intensity: 2 },
    { kind: "drink", text: "Drink if you've complained about work today.", intensity: 2 },
    { kind: "question", text: "What's the worst decision you've made in the last year?", intensity: 2 },
    { kind: "dare", text: "Hand your phone to the person across from you for one text.", intensity: 2 },
    { kind: "vote", text: "Vote on who at this table has the messiest life right now.", intensity: 2 },
    { kind: "confession", text: "What have you lied to this group about?", intensity: 2 },
    { kind: "callout", text: "Call out the person here who's changed the most in two years.", intensity: 2 },
    { kind: "drink", text: "Everyone drinks except whoever the group decides is behind.", intensity: 2 },
    { kind: "question", text: "Who at this table would you not want to work with, and why?", intensity: 2 },
    { kind: "dare", text: "Read your last sent message out loud, no context.", intensity: 3 },
    { kind: "confession", text: "Tell the story you'd normally save for people who weren't there.", intensity: 3 },
    { kind: "vote", text: "Vote on who's had the worst night out of anyone here. They drink.", intensity: 3 },
    { kind: "callout", text: "Say the thing about this group everyone's thinking and nobody says.", intensity: 3 },
    { kind: "drink", text: "Pick someone to drink. They pick two people. Those two pick one each.", intensity: 3 },
    { kind: "dare", text: "Let the group choose one photo from your camera roll to show the table.", intensity: 3 },
  ],
  night: [
    { kind: "vote", text: "Vote on who took the longest to get ready tonight.", intensity: 1 },
    { kind: "question", text: "What's the best date you've been on, and did it go anywhere?", intensity: 1 },
    { kind: "drink", text: "Drink if you're the only single person in your family group chat.", intensity: 1 },
    { kind: "callout", text: "Name the person here who flirts without noticing they're doing it.", intensity: 1 },
    { kind: "dare", text: "Describe your last date to the table in one sentence.", intensity: 1 },
    { kind: "confession", text: "Admit how long it's been since you were properly interested in someone.", intensity: 1 },
    { kind: "question", text: "What's the last thing that made you reconsider someone?", intensity: 1 },
    { kind: "drink", text: "Drink if you've checked someone's profile in the last hour.", intensity: 1 },
    { kind: "vote", text: "Vote on who's the most confident and least justified in it.", intensity: 1 },
    { kind: "callout", text: "Name the person here with the best taste in people.", intensity: 1 },
    { kind: "dare", text: "Tell {other} the first honest thought you had about them.", intensity: 1 },
    { kind: "confession", text: "Admit the last thing you lied about on a date.", intensity: 1 },
    { kind: "question", text: "What's the fastest you've ever changed your mind about someone?", intensity: 2 },
    { kind: "drink", text: "Drink if you've been out with someone nobody here has met.", intensity: 2 },
    { kind: "vote", text: "Vote on who here keeps the most from this group.", intensity: 2 },
    { kind: "confession", text: "What's something you've done that you'd struggle to explain sober?", intensity: 2 },
    { kind: "drink", text: "Everyone who's texted an ex this year drinks. Twice this month.", intensity: 2 },
    { kind: "callout", text: "Point at whoever is least honest about their love life.", intensity: 2 },
    { kind: "dare", text: "Let {other} decide who you have to answer a question about.", intensity: 3 },
    { kind: "vote", text: "Vote on the person here most likely to break someone's heart.", intensity: 3 },
    { kind: "vote", text: "Vote on who's leaving with a story tonight. They drink either way.", intensity: 3 },
    { kind: "question", text: "What would change if everyone here knew the truth about tonight?", intensity: 3 },
    { kind: "drink", text: "Last card. Everyone drinks to whatever happens after this.", intensity: 3 },
    { kind: "drink", text: "Drink if you've been on a date in the last month.", intensity: 1 },
    { kind: "vote", text: "Vote on who's most likely to leave with someone tonight.", intensity: 1 },
    { kind: "callout", text: "Name the person here with the worst dating history.", intensity: 1 },
    { kind: "confession", text: "Admit the last time you texted someone you shouldn't have.", intensity: 1 },
    { kind: "dare", text: "Show the group your most recent match, no commentary.", intensity: 1 },
    { kind: "drink", text: "Drink if you're currently talking to more than one person.", intensity: 1 },
    { kind: "question", text: "What's the fastest you've known something wasn't going to work?", intensity: 2 },
    { kind: "vote", text: "Vote on who here has the biggest red flag. They get to respond once.", intensity: 2 },
    { kind: "callout", text: "Someone here has an ex nobody liked. Say who, then say why.", intensity: 2 },
    { kind: "drink", text: "Drink if you've hooked up with someone you met the same night.", intensity: 2 },
    { kind: "question", text: "Who's the one that got away, and what actually happened?", intensity: 2 },
    { kind: "dare", text: "Let the table pick someone here to spend the next round sitting with.", intensity: 3 },
    { kind: "drink", text: "Everyone drinks for every relationship they've ended badly.", intensity: 3 },
    { kind: "vote", text: "Vote on the two people here most likely to end up together. They both drink.", intensity: 3 },
  ],
  filthy: [
    { kind: "callout", text: "Someone here has an ex they still defend. Say who and why.", intensity: 2 },
    { kind: "dare", text: "Let {other} pick one photo on your phone for you to explain.", intensity: 2 },
    { kind: "question", text: "Who's the last person you thought about that you shouldn't have?", intensity: 2 },
    { kind: "confession", text: "What's the thing you'd least want read out from your phone?", intensity: 3 },
    { kind: "question", text: "What have you wanted to say to someone here and never said?", intensity: 3 },
    { kind: "drink", text: "Drink for every person here you've thought about that way.", intensity: 3 },
    { kind: "callout", text: "Say who at this table you'd have gone for if things were different.", intensity: 3 },
    { kind: "confession", text: "Tell the group the thing you swore you'd take to the grave.", intensity: 3 },
    { kind: "dare", text: "Answer any one question {other} asks, completely honestly.", intensity: 3 },
    { kind: "question", text: "What's your type, and who here fits it closest?", intensity: 1 },
    { kind: "confession", text: "What's a hookup you've never told anyone at this table about?", intensity: 2 },
    { kind: "dare", text: "Let the person on your right read one conversation on your phone.", intensity: 2 },
    { kind: "drink", text: "Everyone who's hooked up with someone in this room drinks.", intensity: 2 },
    { kind: "confession", text: "What's the worst thing you've done to someone you were seeing?", intensity: 3 },
    { kind: "vote", text: "Vote on who here would be the best hookup. They don't get to vote.", intensity: 3 },
    { kind: "dare", text: "Text your ex anything the group agrees on. They write it, you send it.", intensity: 3 },
    { kind: "callout", text: "Say who at this table you've thought about, or drink four.", intensity: 3 },
    { kind: "question", text: "What's the most reckless thing you've done for someone in bed?", intensity: 3 },
    { kind: "confession", text: "Tell the group the story you swore you'd take to the grave.", intensity: 3 },
    { kind: "confession", text: "Say the thing that would genuinely change how this table sees you.", intensity: 3 },
    { kind: "dare", text: "Hand your phone to {other} for one minute. No conditions.", intensity: 3 },
    { kind: "callout", text: "Name the person here you've thought about that way and never said.", intensity: 3 },
    { kind: "confession", text: "Tell the group what actually happened the night you never explain.", intensity: 3 },
    { kind: "drink", text: "Everyone who's blacked out this year drinks. Twice if someone had to get you home.", intensity: 3 },
    { kind: "vote", text: "Vote on who here has got away with the most.", intensity: 3 },
  ],
};
