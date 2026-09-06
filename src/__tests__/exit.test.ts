import { describe, expect, it } from "vitest";

/**
 * The exit guard as App applies it: the X (or the browser's back) asks to
 * leave; a guarded round turns that into a question; cancelling the question
 * leaves the round exactly as it was. Modelled as a tiny reducer over the same
 * three facts App holds — screen, guard, confirm — so the sequence is pinned
 * without a DOM.
 */
interface Shell { screen: string | null; guarded: boolean; confirm: boolean }
type Event = "x" | "back" | "cancel" | "confirm";

function shell(s: Shell, e: Event): Shell {
  switch (e) {
    case "x":
    case "back":
      if (s.screen === null) return s;
      return s.guarded ? { ...s, confirm: true } : { ...s, screen: null, confirm: false, guarded: false };
    case "cancel":
      return { ...s, confirm: false };
    case "confirm":
      return s.confirm ? { screen: null, guarded: false, confirm: false } : s;
  }
}

describe("leaving a game", () => {
  it("closes a setup screen immediately", () => {
    expect(shell({ screen: "imposter", guarded: false, confirm: false }, "x").screen).toBeNull();
  });

  it("asks before ending a live round, from the X and from back alike", () => {
    const live = { screen: "imposter", guarded: true, confirm: false };
    expect(shell(live, "x")).toEqual({ ...live, confirm: true });
    expect(shell(live, "back")).toEqual({ ...live, confirm: true });
  });

  it("keeps the round intact when the exit is cancelled", () => {
    const asked = shell({ screen: "ballpark", guarded: true, confirm: false }, "x");
    const kept = shell(asked, "cancel");
    expect(kept).toEqual({ screen: "ballpark", guarded: true, confirm: false });
  });

  it("ends the round only on confirmation", () => {
    const asked = shell({ screen: "ballpark", guarded: true, confirm: false }, "x");
    expect(shell(asked, "confirm").screen).toBeNull();
    expect(shell({ screen: "ballpark", guarded: true, confirm: false }, "confirm").screen).toBe("ballpark");
  });
});
