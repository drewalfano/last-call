import type { Pools } from "./pools";

/**
 * READ THE ROOM
 * Night policy: SUPPLEMENT — dealt blind, so the 19+ prompts simply join
 * the safe ones. Nobody browses this list.
 *
 * PROMPTS ARE SETUPS, NOT PUNCHLINES. Two players each write one line for
 * the same prompt and the table picks the better one, so the joke is
 * theirs to bring; a prompt that is already funny leaves them nothing to
 * add. What a good one does is point at shared ground — an app everyone
 * has, a job everyone has met, a moment everyone has dreaded — wide enough
 * that two people can land in completely different places on it.
 *
 * `{other}` is the inside-joke slot. With a roster it names one of the
 * JUDGES, never a writer (see pickJudge in readTheRoomFlow.ts); without one
 * it falls back to "someone else" and still reads.
 */
export const READ_THE_ROOM: Pools<string> = {
  safe: [
    "Worst thing to hear from your Uber driver",
    "What {other} would get kicked out of Costco for",
    "A new threat from the Duolingo owl",
    "The real reason the Titanic sank",
    "Worst thing to say at a gender reveal",
    "A Florida Man headline about {other}",
    "What the self-checkout machine is really thinking",
    "A terrible name for a boat",
    "What {other}'s Spotify Wrapped is hiding",
    "The worst possible fortune cookie",
    "A text you should never send to the family group chat",
    "What the GPS voice says when she finally snaps",
    "A new Olympic sport nobody asked for",
    "A Tim Hortons menu item that got pulled after one day",
    "Worst thing to find in a rental car",
    "A one-star review of {other}'s cooking",
    "The Netflix true crime doc about this table",
    "What your dog says about you behind your back",
    "An IKEA product name and what it actually does",
    "Worst way to open a best man speech",
    "A new warning label for {other}",
    "What the pilot says when they think the mic is off",
    "A LinkedIn post that should have stayed a draft",
    "The worst thing to yell at a kids' soccer game",
  ],
  night: [
    "The worst thing to whisper during a first kiss",
    "A Hinge prompt answer that guarantees an unmatch",
    "What {other} is really doing on their phone at 2am",
    "The worst pickup line for this exact bar",
    "A cocktail named after {other}, and what's in it",
    "What the bouncer says about {other} after they leave",
    "A text {other} sent last night and regrets",
    "Worst thing to say when meeting your partner's parents",
    "A dating app bio that's way too honest",
    "A 3am Amazon order that needs explaining",
    "What you should never yell at a wedding",
    "The real reason {other} got left on read",
  ],
  filthy: [
    "A safe word that would ruin the mood",
    "An OnlyFans name for {other}",
    "What {other}'s browser history is hiding",
    "A terrible name for a sex position",
    "Worst thing to find in a hotel bed",
    "The worst thing to say right after",
  ],
};
