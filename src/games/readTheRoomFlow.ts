/**
 * READ THE ROOM'S ROUND, AS A STATE MACHINE.
 * ---------------------------------------------------------------
 * Same arrangement as ballparkFlow.ts, for the same reasons: the sequence
 * reads in one place, it tests without a browser, and every action is a
 * no-op outside the phase it belongs to — so a double tap finds a state the
 * first tap already left and returns it unchanged. The component only runs a
 * side effect when the state actually changed.
 *
 *   intro    how to play, once per phone and again on request
 *   matchup  who is writing and the prompt, face up for the whole table
 *   writeA   the first writer's screen: prompt, one line, Done
 *   pass     a cover: the phone is on its way to the second writer
 *   writeB   the second writer's screen, the same as the first
 *   reveal   face up: the prompt, then the lines pop in one at a time
 *   judge    both lines tappable; the table picks one, or calls a draw
 *   result   who wrote which, and which one won
 *
 * Also here, and also pure: who writes next, and who `{other}` names. Those
 * are session questions rather than round ones, so they sit beside the
 * reducer instead of inside it, and take an `rng` so a test can pin them.
 */
export type Phase =
  | "intro"
  | "matchup"
  | "writeA"
  | "pass"
  | "writeB"
  | "reveal"
  | "judge"
  | "result";

/** The two writers, by the order they write in. */
export type Writer = "A" | "B";

/** The two places a line can stand on the reveal, top and bottom. */
export type Slot = 0 | 1;

export const MAX_LINE = 60;

export interface Flow {
  phase: Phase;
  /** Where the intro goes back to: matchup, or nowhere on a first visit. */
  from: Phase | null;
  /** Each writer's line. A draft while they are writing, trimmed once they are done. */
  lineA: string;
  lineB: string;
  /**
   * The writing screen has been turned over because the phone stopped being
   * looked at. The draft stays; getting it back is a deliberate tap.
   */
  covered: boolean;
  /**
   * WHICH LINE STANDS ON TOP, decided once per round when writing starts.
   *
   * The lines show unlabeled, and an order that always put the first writer
   * on top would label them anyway — any table that has played two rounds
   * would know whose was whose. So it is a coin, and authorship is read back
   * through `writerAt` rather than assumed from the position.
   */
  bFirst: boolean;
  /** How many lines are up on the reveal, 0 to 2. Both stay up from then on. */
  shown: number;
  /** Who won, `"draw"` if the table would not budge, null until the tap. */
  winner: Writer | "draw" | null;
  round: number;
}

export type Action =
  | { type: "gotIt" }
  | { type: "howToPlay" }
  /** The coin for the reveal order rides in on the action, so this stays pure. */
  | { type: "start"; bFirst: boolean }
  | { type: "draft"; text: string }
  | { type: "done" }
  | { type: "taken" }
  | { type: "hidden" }
  | { type: "uncover" }
  /** One beat of the reveal: the next line pops in, or, with both up, the table gets to judge. */
  | { type: "tick" }
  /** Reduced motion: both lines at once, straight to the judging. */
  | { type: "revealAll" }
  | { type: "pick"; slot: Slot }
  | { type: "draw" }
  | { type: "next" };

export function initialFlow(seenIntro: boolean): Flow {
  return {
    phase: seenIntro ? "matchup" : "intro",
    from: null,
    lineA: "",
    lineB: "",
    covered: false,
    bFirst: false,
    shown: 0,
    winner: null,
    round: 0,
  };
}

function writing(s: Flow): boolean {
  return s.phase === "writeA" || s.phase === "writeB";
}

/** The line belonging to whoever is writing right now. */
export function currentDraft(s: Flow): string {
  return s.phase === "writeB" ? s.lineB : s.lineA;
}

export function reduce(s: Flow, a: Action): Flow {
  switch (a.type) {
    case "gotIt":
      return s.phase === "intro" ? { ...s, phase: s.from ?? "matchup", from: null } : s;
    case "howToPlay":
      return s.phase === "matchup" ? { ...s, phase: "intro", from: "matchup" } : s;
    case "start":
      return s.phase === "matchup" ? { ...s, phase: "writeA", bFirst: a.bFirst } : s;
    /* Typing behind a cover would be typing into a field nobody can see. */
    case "draft": {
      if (!writing(s) || s.covered) return s;
      const text = a.text.slice(0, MAX_LINE);
      return s.phase === "writeA" ? { ...s, lineA: text } : { ...s, lineB: text };
    }
    /* Non-empty after a trim and nothing else, the same bar Hot Seat sets for
       a name. Whatever they wrote is the joke; the app does not referee it. */
    case "done": {
      if (!writing(s) || s.covered) return s;
      const line = currentDraft(s).trim();
      if (!line) return s;
      return s.phase === "writeA"
        ? { ...s, phase: "pass", lineA: line }
        : { ...s, phase: "reveal", lineB: line, shown: 0 };
    }
    case "taken":
      return s.phase === "pass" ? { ...s, phase: "writeB" } : s;
    case "hidden":
      return writing(s) && !s.covered ? { ...s, covered: true } : s;
    case "uncover":
      return writing(s) && s.covered ? { ...s, covered: false } : s;
    case "tick":
      if (s.phase !== "reveal") return s;
      return s.shown < 2 ? { ...s, shown: s.shown + 1 } : { ...s, phase: "judge" };
    case "revealAll":
      return s.phase === "reveal" ? { ...s, phase: "judge", shown: 2 } : s;
    case "pick":
      return s.phase === "judge" ? { ...s, phase: "result", winner: writerAt(s, a.slot) } : s;
    case "draw":
      return s.phase === "judge" ? { ...s, phase: "result", winner: "draw" } : s;
    case "next":
      return s.phase === "result"
        ? {
            ...s,
            phase: "matchup",
            lineA: "",
            lineB: "",
            covered: false,
            shown: 0,
            winner: null,
            round: s.round + 1,
          }
        : s;
  }
}

/** Whose line stands in a slot this round. */
export function writerAt(s: Flow, slot: Slot): Writer {
  return (slot === 0) === s.bFirst ? "B" : "A";
}

export function lineOf(s: Flow, w: Writer): string {
  return w === "A" ? s.lineA : s.lineB;
}

/**
 * The phases where leaving would throw a live round away: from the first
 * keystroke to the tap. The matchup has nothing in it yet and the result has
 * already been seen.
 */
export function isLive(phase: Phase): boolean {
  return (
    phase === "writeA" ||
    phase === "pass" ||
    phase === "writeB" ||
    phase === "reveal" ||
    phase === "judge"
  );
}

/* ================================================================
   THE SESSION: who has written, who has won, who wrote last.
   ================================================================ */

export type Pair = readonly [string, string];

export interface Tally {
  /** Rounds each name has written in, this session. */
  writes: Readonly<Record<string, number>>;
  /** Rounds each name has won. Kept whether or not anyone is shown it. */
  points: Readonly<Record<string, number>>;
  /** The pair that just wrote, so the next one can be anyone else. */
  last: Pair | null;
}

export const EMPTY_TALLY: Tally = { writes: {}, points: {}, last: null };

function samePair(a: Pair, b: Pair): boolean {
  return (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);
}

/**
 * WHO WRITES NEXT.
 *
 * The two who have written least, never the pair that just wrote, ties
 * broken at random. "Least" is read as the pair whose busier member has
 * written least, then the pair with the fewest between them — which is the
 * order that keeps everyone within one round of each other: a lone player
 * one behind is always paired with somebody, and two players level at the
 * bottom are always paired together unless they are the pair that just
 * went, which can only happen once everyone else has caught them up.
 *
 * Who writes FIRST is a coin as well. Writing second is the easier seat —
 * the phone comes back once and goes face up — so nobody should have it
 * every time.
 *
 * Null under two names, where there is no pair to make. With exactly two the
 * repeat rule has nothing to choose between, so the same two go again rather
 * than nobody.
 */
export function nextPair(
  players: readonly string[],
  tally: Tally,
  rng: () => number = Math.random,
): Pair | null {
  if (players.length < 2) return null;
  const count = (p: string) => tally.writes[p] ?? 0;
  const pairs: Pair[] = [];
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) pairs.push([players[i], players[j]]);
  }
  const allowed = tally.last ? pairs.filter((p) => !samePair(p, tally.last!)) : pairs;
  const pool = allowed.length ? allowed : pairs;
  const busier = (p: Pair) => Math.max(count(p[0]), count(p[1]));
  const total = (p: Pair) => count(p[0]) + count(p[1]);
  const leastBusy = Math.min(...pool.map(busier));
  const level = pool.filter((p) => busier(p) === leastBusy);
  const fewest = Math.min(...level.map(total));
  const best = level.filter((p) => total(p) === fewest);
  const pick = best[Math.min(best.length - 1, Math.floor(rng() * best.length))];
  return rng() < 0.5 ? pick : [pick[1], pick[0]];
}

/**
 * WHO `{other}` NAMES: one of the judges, never a writer.
 *
 * A prompt about {other} is a prompt about somebody at the table who is not
 * holding the pen — "What Jess would get kicked out of Costco for" is a
 * different game when Jess is the one writing it. Undefined when nobody is
 * left over, which hands the prompt to fillPrompt's own fallback.
 */
export function pickJudge(
  players: readonly string[],
  pair: Pair | null,
  rng: () => number = Math.random,
): string | undefined {
  const judges = pair ? players.filter((p) => p !== pair[0] && p !== pair[1]) : [...players];
  if (judges.length === 0) return undefined;
  return judges[Math.min(judges.length - 1, Math.floor(rng() * judges.length))];
}

/**
 * The round is over: both writers wrote, and the winner — if there was one —
 * takes a point. A draw counts the writing and nothing else.
 */
export function settle(tally: Tally, pair: Pair, winner: string | null): Tally {
  const writes = { ...tally.writes };
  for (const p of pair) writes[p] = (writes[p] ?? 0) + 1;
  const points = winner === null ? tally.points : { ...tally.points, [winner]: (tally.points[winner] ?? 0) + 1 };
  return { writes, points, last: pair };
}

/**
 * Everyone's points, most first. Roster order breaks ties, so a table level
 * on points reads round the circle rather than in a shuffled order.
 */
export function standings(players: readonly string[], tally: Tally): { name: string; points: number }[] {
  return players
    .map((name, seat) => ({ name, points: tally.points[name] ?? 0, seat }))
    .sort((a, b) => b.points - a.points || a.seat - b.seat)
    .map(({ name, points }) => ({ name, points }));
}
