import { describe, expect, it } from "vitest";
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  afterHide,
  clampCount,
  deal,
  isLive,
  onHidden,
  onHold,
  onLetGo,
  revealOrder,
  rosterNote,
} from "../games/imposterLogic";

describe("Odd One Out deal", () => {
  it("deals every player exactly once, in seating order from a random cut", () => {
    for (let start = 0; start < 5; start++) {
      const order = revealOrder(5, () => start / 5);
      expect([...order].sort()).toEqual([0, 1, 2, 3, 4]);
      expect(order[0]).toBe(start);
      for (let i = 1; i < order.length; i++) expect(order[i]).toBe((order[i - 1] + 1) % 5);
    }
  });

  it("never picks an imposter outside the table, even at rng's ceiling", () => {
    const d = deal(4, () => 0.9999999);
    expect(d.imposter).toBeLessThan(4);
    expect(d.order).toHaveLength(4);
  });

  it("clamps the count to the mode's limits", () => {
    expect(clampCount(1)).toBe(MIN_PLAYERS);
    expect(clampCount(50)).toBe(MAX_PLAYERS);
    expect(deal(99).order).toHaveLength(MAX_PLAYERS);
  });

  it("says out loud when a roster is longer than the game", () => {
    expect(rosterNote(12, 10)).toMatch(/first 10 names play/);
    expect(rosterNote(6, 4)).toBe("The first 4 of your 6 names play.");
    expect(rosterNote(3, 5)).toBe("Using your 3 names, then numbers.");
    expect(rosterNote(0, 4)).toMatch(/Add names/);
  });
});

describe("Odd One Out privacy", () => {
  const mid = { phase: "role" as const, count: 4, at: 1 };

  it("hides a role by going back to the same player's cover, without advancing", () => {
    expect(onHidden(mid)).toEqual({ ...mid, phase: "cover" });
    const cover = { ...mid, phase: "cover" as const };
    expect(onHidden(cover)).toBe(cover);
  });

  it("only ever moves from a role to a cover, never to the next role", () => {
    expect(afterHide(mid)).toEqual({ ...mid, phase: "cover", at: 2 });
    expect(afterHide({ ...mid, at: 3 })).toEqual({ ...mid, phase: "ready", at: 3 });
  });

  it("ignores a hide pressed twice", () => {
    const once = afterHide(mid);
    expect(afterHide(once)).toBe(once);
  });

  it("guards exits during the deal and the clues, not during setup", () => {
    expect(isLive("setup")).toBe(false);
    expect(isLive("picking")).toBe(false);
    expect(isLive("cover")).toBe(true);
    expect(isLive("role")).toBe(true);
    expect(isLive("ready")).toBe(true);
  });
});

describe("hold to reveal", () => {
  const cover = { phase: "cover" as const, count: 3, at: 0 };

  it("turns only a cover over, and only for the seat it is on", () => {
    expect(onHold(cover)).toEqual({ ...cover, phase: "role" });
    const ready = { ...cover, phase: "ready" as const };
    expect(onHold(ready)).toBe(ready);
  });

  it("letting go passes straight to the next seat's cover, never the next role", () => {
    const held = onHold(cover);
    expect(onLetGo(held, "let-go")).toEqual({ ...cover, at: 1 });
    expect(onLetGo(onHold({ ...cover, at: 2 }), "let-go")).toEqual({ ...cover, phase: "ready", at: 2 });
  });

  it("a hold the page ended goes back under the same seat's cover", () => {
    expect(onLetGo(onHold(cover), "hidden")).toEqual(cover);
  });

  it("a let go with nothing held changes nothing", () => {
    expect(onLetGo(cover, "let-go")).toBe(cover);
  });

  it("brackets every reveal by a cover through a whole deal", () => {
    let s: { phase: "setup" | "picking" | "cover" | "role" | "ready"; count: number; at: number } = cover;
    const seen: string[] = [];
    while (s.phase !== "ready") {
      seen.push(s.phase);
      s = onHold(s);
      seen.push(s.phase);
      s = onLetGo(s, "let-go");
    }
    expect(seen).toEqual(["cover", "role", "cover", "role", "cover", "role"]);
  });
});
