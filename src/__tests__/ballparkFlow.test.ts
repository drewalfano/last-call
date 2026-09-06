import { describe, expect, it } from "vitest";
import { MIDPOINT, initialFlow, isLive, positionText, reduce, type Flow } from "../games/ballparkFlow";

const run = (s: Flow, ...types: Parameters<typeof reduce>[1][]) => types.reduce(reduce, s);

describe("Ballpark round", () => {
  it("opens on the intro the first time and on the handoff after that", () => {
    expect(initialFlow(false).phase).toBe("intro");
    expect(initialFlow(true).phase).toBe("handoff");
  });

  it("reveals in one action and keeps the spot hidden until it", () => {
    const s = initialFlow(true);
    expect(s.revealed).toBe(false);
    const r = reduce(s, { type: "reveal" });
    expect(r.phase).toBe("reading");
    expect(r.revealed).toBe(true);
  });

  it("hides the spot and passes in the same step, so no frame shows both", () => {
    const r = run(initialFlow(true), { type: "reveal" }, { type: "hideAndPass" });
    expect(r.phase).toBe("guessing");
    expect(r.revealed).toBe(false);
  });

  it("re-hides on backgrounding and needs a deliberate re-reveal, without advancing", () => {
    const up = reduce(initialFlow(true), { type: "reveal" });
    const hidden = reduce(up, { type: "hidden" });
    expect(hidden.phase).toBe("reading");
    expect(hidden.revealed).toBe(false);
    expect(reduce(hidden, { type: "hideAndPass" })).toBe(hidden);
    expect(reduce(hidden, { type: "reveal" }).revealed).toBe(true);
    const guessing = run(up, { type: "hideAndPass" });
    expect(reduce(guessing, { type: "hidden" })).toBe(guessing);
  });

  it("accepts a midpoint guess once the dial has been touched", () => {
    const g = run(initialFlow(true), { type: "reveal" }, { type: "hideAndPass" });
    expect(reduce(g, { type: "lock" })).toBe(g);
    const tapped = reduce(g, { type: "dial", value: MIDPOINT });
    expect(tapped.touched).toBe(true);
    const locked = reduce(tapped, { type: "lock" });
    expect(locked.phase).toBe("reveal");
    expect(locked.locked).toBe(MIDPOINT);
  });

  it("treats rapid duplicate taps as one", () => {
    const s = initialFlow(true);
    const once = reduce(s, { type: "reveal" });
    expect(reduce(once, { type: "reveal" })).toBe(once);
    const locked = run(once, { type: "hideAndPass" }, { type: "dial", value: 70 }, { type: "lock" });
    expect(reduce(locked, { type: "lock" })).toBe(locked);
    const next = reduce(locked, { type: "next" });
    expect(reduce(next, { type: "next" })).toBe(next);
    expect(next.round).toBe(1);
  });

  it("resets the dial and the lock for the next round", () => {
    const next = run(
      initialFlow(true),
      { type: "reveal" }, { type: "hideAndPass" }, { type: "dial", value: 80 }, { type: "lock" }, { type: "next" },
    );
    expect(next).toMatchObject({ phase: "handoff", guess: MIDPOINT, touched: false, locked: null, revealed: false });
  });

  it("can show the intro again from the handoff and return to it", () => {
    const back = run(initialFlow(true), { type: "howToPlay" }, { type: "gotIt" });
    expect(back.phase).toBe("handoff");
    const s = initialFlow(true);
    expect(reduce(s, { type: "gotIt" })).toBe(s);
  });

  it("guards exits only once someone is holding a secret or a guess", () => {
    expect(isLive("intro")).toBe(false);
    expect(isLive("handoff")).toBe(false);
    expect(isLive("reading")).toBe(true);
    expect(isLive("guessing")).toBe(true);
    expect(isLive("reveal")).toBe(true);
  });

  it("describes positions against the spectrum's ends", () => {
    expect(positionText(1, "Snack", "Meal")).toBe("all the way at Snack");
    expect(positionText(50, "Snack", "Meal")).toBe("halfway between Snack and Meal");
    expect(positionText(78, "Snack", "Meal")).toBe("78% of the way from Snack to Meal");
    expect(positionText(99, "Snack", "Meal")).toBe("all the way at Meal");
  });
});
