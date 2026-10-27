import { describe, expect, it } from "vitest";
import { holdReducer, initialHold, isShowing, type HoldEvent, type HoldState } from "../lib/holdReveal";

const run = (events: HoldEvent[], from: HoldState = initialHold) => events.reduce(holdReducer, from);

describe("hold to reveal", () => {
  it("shows only while held, and letting go ends it", () => {
    const held = run([{ type: "press", source: "pointer", pointerId: 1 }]);
    expect(isShowing(held)).toBe(true);
    const done = holdReducer(held, { type: "release", source: "pointer", pointerId: 1 });
    expect(isShowing(done)).toBe(false);
    expect(done).toEqual({ phase: "released", reason: "let-go" });
  });

  it("is never showing before the first press", () => {
    expect(isShowing(initialHold)).toBe(false);
  });

  it("ignores a second finger landing and lifting", () => {
    const s = run([
      { type: "press", source: "pointer", pointerId: 1 },
      { type: "press", source: "pointer", pointerId: 2 },
      { type: "release", source: "pointer", pointerId: 2 },
    ]);
    expect(isShowing(s)).toBe(true);
  });

  it("does not let a key-up end a finger's hold, or the other way round", () => {
    const byFinger = run([
      { type: "press", source: "pointer", pointerId: 1 },
      { type: "release", source: "key" },
    ]);
    expect(isShowing(byFinger)).toBe(true);
    const byKey = run([{ type: "press", source: "key" }, { type: "release", source: "pointer", pointerId: 1 }]);
    expect(isShowing(byKey)).toBe(true);
  });

  it("ignores key repeat while Space is held", () => {
    const s = run([
      { type: "press", source: "key" },
      { type: "press", source: "key" },
      { type: "press", source: "key" },
    ]);
    expect(s).toEqual({ phase: "holding", source: "key", pointerId: null });
    expect(holdReducer(s, { type: "release", source: "key" })).toEqual({ phase: "released", reason: "let-go" });
  });

  it("hides when the page does, and says so", () => {
    const s = run([{ type: "press", source: "pointer", pointerId: 1 }, { type: "hide" }]);
    expect(isShowing(s)).toBe(false);
    expect(s).toEqual({ phase: "released", reason: "hidden" });
  });

  it("a hide with nothing held changes nothing", () => {
    expect(holdReducer(initialHold, { type: "hide" })).toBe(initialHold);
  });

  it("a release with nothing held changes nothing", () => {
    expect(holdReducer(initialHold, { type: "release", source: "pointer", pointerId: 1 })).toBe(initialHold);
  });

  it("can be held again after a release, for the next seat", () => {
    const s = run([
      { type: "press", source: "pointer", pointerId: 1 },
      { type: "release", source: "pointer", pointerId: 1 },
      { type: "reset" },
      { type: "press", source: "pointer", pointerId: 4 },
    ]);
    expect(isShowing(s)).toBe(true);
  });
});
