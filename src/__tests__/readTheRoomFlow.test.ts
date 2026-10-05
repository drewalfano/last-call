import { describe, expect, it } from "vitest";
import { MODE_BY_ID } from "../data/modes";
import { READ_THE_ROOM } from "../data/readTheRoom";
import { misfit, whyNot } from "../lib/fit";
import {
  EMPTY_TALLY,
  MAX_LINE,
  initialFlow,
  isLive,
  lineOf,
  nextPair,
  pickJudge,
  reduce,
  settle,
  standings,
  writerAt,
  type Action,
  type Flow,
  type Pair,
  type Phase,
  type Tally,
} from "../games/readTheRoomFlow";

const run = (s: Flow, ...actions: Action[]) => actions.reduce(reduce, s);

/** A small seeded generator, so the rotation tests are repeatable. */
function seeded(seed: number): () => number {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

/** One state parked in each phase, reached the way a table would reach it. */
function atPhase(phase: Phase): Flow {
  const matchup = initialFlow(true);
  /* Both writing screens are parked with something typed, so Done has a line to take. */
  const writeA = run(matchup, { type: "start", bFirst: false }, { type: "draft", text: "Knot Today" });
  const pass = reduce(writeA, { type: "done" });
  const writeB = run(pass, { type: "taken" }, { type: "draft", text: "Mostly Floats" });
  const reveal = reduce(writeB, { type: "done" });
  const judge = reduce(reveal, { type: "revealAll" });
  const result = reduce(judge, { type: "pick", slot: 0 });
  const states: Record<Phase, Flow> = {
    intro: initialFlow(false),
    matchup,
    picking: reduce(matchup, { type: "pickPrompt" }),
    writeA,
    pass,
    writeB,
    reveal,
    judge,
    result,
  };
  return states[phase];
}

const PHASES: Phase[] = ["intro", "matchup", "picking", "writeA", "pass", "writeB", "reveal", "judge", "result"];

/** Every action, and the only phases it may change anything in. */
const ALLOWED: { action: Action; in: Phase[] }[] = [
  { action: { type: "gotIt" }, in: ["intro"] },
  { action: { type: "howToPlay" }, in: ["matchup"] },
  { action: { type: "pickPrompt" }, in: ["matchup"] },
  { action: { type: "promptPicked" }, in: ["picking"] },
  { action: { type: "start", bFirst: true }, in: ["matchup"] },
  { action: { type: "draft", text: "x" }, in: ["writeA", "writeB"] },
  { action: { type: "done" }, in: ["writeA", "writeB"] },
  { action: { type: "taken" }, in: ["pass"] },
  { action: { type: "hidden" }, in: ["writeA", "writeB"] },
  { action: { type: "uncover" }, in: [] },
  { action: { type: "tick" }, in: ["reveal"] },
  { action: { type: "revealAll" }, in: ["reveal"] },
  { action: { type: "pick", slot: 1 }, in: ["judge"] },
  { action: { type: "draw" }, in: ["judge"] },
  { action: { type: "next" }, in: ["result"] },
];

describe("Read the Room round", () => {
  it("opens on the intro the first time and on the matchup after that", () => {
    expect(initialFlow(false).phase).toBe("intro");
    expect(initialFlow(true).phase).toBe("matchup");
  });

  it("makes every action a no-op outside its phase, so a double tap is harmless", () => {
    for (const { action, in: allowed } of ALLOWED) {
      for (const phase of PHASES) {
        const s = atPhase(phase);
        const next = reduce(s, action);
        if (allowed.includes(phase)) expect(next, `${action.type} in ${phase}`).not.toBe(s);
        else expect(next, `${action.type} in ${phase}`).toBe(s);
      }
    }
  });

  it("treats a second tap on every advancing action as nothing", () => {
    const steps: Action[] = [
      { type: "start", bFirst: false },
      { type: "draft", text: "one" },
      { type: "done" },
      { type: "taken" },
      { type: "draft", text: "two" },
      { type: "done" },
      { type: "revealAll" },
      { type: "pick", slot: 0 },
      { type: "next" },
    ];
    let s = initialFlow(true);
    for (const a of steps) {
      s = reduce(s, a);
      if (a.type !== "draft") expect(reduce(s, a), a.type).toBe(s);
    }
  });

  it("runs intro → matchup → writeA → pass → writeB → reveal → judge → result → matchup", () => {
    const seen: Phase[] = [];
    let s = initialFlow(false);
    const step = (a: Action) => {
      s = reduce(s, a);
      if (seen[seen.length - 1] !== s.phase) seen.push(s.phase);
    };
    seen.push(s.phase);
    step({ type: "gotIt" });
    step({ type: "start", bFirst: false });
    step({ type: "draft", text: "A line" });
    step({ type: "done" });
    step({ type: "taken" });
    step({ type: "draft", text: "Another line" });
    step({ type: "done" });
    step({ type: "tick" });
    step({ type: "tick" });
    step({ type: "tick" });
    step({ type: "pick", slot: 1 });
    step({ type: "next" });
    expect(seen).toEqual(["intro", "matchup", "writeA", "pass", "writeB", "reveal", "judge", "result", "matchup"]);
    expect(s.round).toBe(1);
    expect(s).toMatchObject({ lineA: "", lineB: "", shown: 0, winner: null, covered: false });
  });

  it("pops the lines in one at a time before the table can judge", () => {
    const r = atPhase("reveal");
    expect(r.shown).toBe(0);
    expect(reduce(r, { type: "tick" })).toMatchObject({ phase: "reveal", shown: 1 });
    expect(run(r, { type: "tick" }, { type: "tick" })).toMatchObject({ phase: "reveal", shown: 2 });
    expect(run(r, { type: "tick" }, { type: "tick" }, { type: "tick" }).phase).toBe("judge");
    expect(reduce(r, { type: "revealAll" })).toMatchObject({ phase: "judge", shown: 2 });
  });

  it("will not advance an empty or whitespace-only line", () => {
    const a = atPhase("matchup");
    const writeA = reduce(a, { type: "start", bFirst: false });
    expect(reduce(writeA, { type: "done" })).toBe(writeA);
    const spaces = reduce(writeA, { type: "draft", text: "   \t " });
    expect(reduce(spaces, { type: "done" })).toBe(spaces);
    const blankB = reduce(atPhase("writeB"), { type: "draft", text: "  " });
    expect(reduce(blankB, { type: "done" })).toBe(blankB);
  });

  it("trims a finished line and holds a draft to the limit", () => {
    const pass = run(atPhase("matchup"), { type: "start", bFirst: false }, { type: "draft", text: "  padded  " }, { type: "done" });
    expect(pass.lineA).toBe("padded");
    const long = reduce(atPhase("writeA"), { type: "draft", text: "x".repeat(MAX_LINE + 20) });
    expect(long.lineA).toHaveLength(MAX_LINE);
  });

  it("covers a writing screen when the phone is put away, keeps the draft, and needs a tap to come back", () => {
    const typed = reduce(atPhase("writeA"), { type: "draft", text: "half a th" });
    const covered = reduce(typed, { type: "hidden" });
    expect(covered).toMatchObject({ phase: "writeA", covered: true, lineA: "half a th" });
    expect(reduce(covered, { type: "hidden" })).toBe(covered);
    expect(reduce(covered, { type: "draft", text: "typed blind" })).toBe(covered);
    expect(reduce(covered, { type: "done" })).toBe(covered);
    const back = reduce(covered, { type: "uncover" });
    expect(back).toMatchObject({ covered: false, lineA: "half a th" });
  });

  it("shuffles the order the lines stand in and still credits the right writer", () => {
    for (const bFirst of [false, true]) {
      const judge = run(
        atPhase("matchup"),
        { type: "start", bFirst },
        { type: "draft", text: "first writer's line" },
        { type: "done" },
        { type: "taken" },
        { type: "draft", text: "second writer's line" },
        { type: "done" },
        { type: "revealAll" },
      );
      const top = writerAt(judge, 0);
      const bottom = writerAt(judge, 1);
      expect(top).not.toBe(bottom);
      expect(top).toBe(bFirst ? "B" : "A");
      expect(lineOf(judge, top)).toBe(bFirst ? "second writer's line" : "first writer's line");
      expect(reduce(judge, { type: "pick", slot: 0 }).winner).toBe(top);
      expect(reduce(judge, { type: "pick", slot: 1 }).winner).toBe(bottom);
    }
  });

  it("calls a draw with no winner and no change to anyone's points", () => {
    const drawn = reduce(atPhase("judge"), { type: "draw" });
    expect(drawn).toMatchObject({ phase: "result", winner: "draw" });
    const before: Tally = { writes: { Jess: 1 }, points: { Jess: 1 }, last: null };
    const after = settle(before, ["Jess", "Marco"], null);
    expect(after.points).toEqual({ Jess: 1 });
    expect(after.writes).toEqual({ Jess: 2, Marco: 1 });
  });

  it("gives the winner a point and nobody else", () => {
    const after = settle(EMPTY_TALLY, ["Jess", "Marco"], "Marco");
    expect(after.points).toEqual({ Marco: 1 });
    expect(standings(["Jess", "Marco", "Sam"], after)).toEqual([
      { name: "Marco", points: 1 },
      { name: "Jess", points: 0 },
      { name: "Sam", points: 0 },
    ]);
  });

  it("can show the intro again from the matchup and return to it", () => {
    const back = run(atPhase("matchup"), { type: "howToPlay" }, { type: "gotIt" });
    expect(back.phase).toBe("matchup");
  });

  it("opens the prompt list from the matchup and comes back to it", () => {
    const back = run(atPhase("matchup"), { type: "pickPrompt" }, { type: "promptPicked" });
    expect(back.phase).toBe("matchup");
    expect(back.round).toBe(0);
  });

  it("guards exits from the first keystroke to the tap, and nowhere else", () => {
    expect(PHASES.filter(isLive)).toEqual(["writeA", "pass", "writeB", "reveal", "judge"]);
  });
});

describe("Read the Room matchups", () => {
  const same = (a: Pair, b: Pair) => (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);

  it("needs two names to make a pair", () => {
    expect(nextPair([], EMPTY_TALLY)).toBeNull();
    expect(nextPair(["Jess"], EMPTY_TALLY)).toBeNull();
    expect(nextPair(["Jess", "Marco"], EMPTY_TALLY)).not.toBeNull();
  });

  it("never repeats a pair back to back, and keeps write counts within one", () => {
    for (let n = 3; n <= 9; n++) {
      const players = Array.from({ length: n }, (_, i) => `P${i + 1}`);
      for (let seed = 1; seed <= 20; seed++) {
        const rng = seeded(seed * 97 + n);
        let tally = EMPTY_TALLY;
        let last: Pair | null = null;
        for (let round = 0; round < n * 6; round++) {
          const pair = nextPair(players, tally, rng)!;
          expect(pair[0]).not.toBe(pair[1]);
          if (last) expect(same(pair, last), `n=${n} seed=${seed} round=${round}`).toBe(false);
          tally = settle(tally, pair, rng() < 0.5 ? pair[0] : null);
          last = pair;
          const counts = players.map((p) => tally.writes[p] ?? 0);
          expect(Math.max(...counts) - Math.min(...counts), `n=${n} seed=${seed} round=${round}`).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("prefers whoever has written least", () => {
    const tally: Tally = { writes: { Jess: 2, Marco: 2, Sam: 1, Ana: 1 }, points: {}, last: ["Jess", "Marco"] };
    const pair = nextPair(["Jess", "Marco", "Sam", "Ana"], tally, seeded(3))!;
    expect([...pair].sort()).toEqual(["Ana", "Sam"]);
  });

  it("breaks ties at random rather than by seat", () => {
    const players = ["Jess", "Marco", "Sam", "Ana"];
    const firsts = new Set<string>();
    const rng = seeded(11);
    for (let i = 0; i < 60; i++) firsts.add([...nextPair(players, EMPTY_TALLY, rng)!].sort().join("+"));
    expect(firsts.size).toBeGreaterThan(3);
  });

  it("fills {other} with a judge, never one of the writers", () => {
    const players = ["Jess", "Marco", "Sam", "Ana", "Lee"];
    const rng = seeded(5);
    let tally = EMPTY_TALLY;
    for (let i = 0; i < 200; i++) {
      const pair = nextPair(players, tally, rng)!;
      const other = pickJudge(players, pair, rng);
      expect(other).toBeDefined();
      expect(pair).not.toContain(other);
      tally = settle(tally, pair, null);
    }
    expect(pickJudge(["Jess", "Marco"], ["Jess", "Marco"])).toBeUndefined();
  });

  it("is a game for three or more, and says so to a table of two", () => {
    const mode = MODE_BY_ID["read-the-room"];
    const why = misfit(mode, { size: 2, content: "night" });
    expect(why).toBe("too-few");
    expect(whyNot(mode, why!)).toBe("needs 3 or more");
    expect(misfit(mode, { size: 3, content: "safe" })).toBeNull();
  });
});

describe("Read the Room prompts", () => {
  it("has no duplicates across tiers and names nobody but a judge", () => {
    const all = [...READ_THE_ROOM.safe, ...READ_THE_ROOM.night, ...(READ_THE_ROOM.filthy ?? [])];
    expect(new Set(all.map((p) => p.toLowerCase())).size).toBe(all.length);
    for (const p of all) {
      expect(p.trim()).toBe(p);
      expect(p.replace(/\{(name|left)\}/g, "")).toBe(p);
    }
  });
});
