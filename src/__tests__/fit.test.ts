import { describe, expect, it } from "vitest";
import { MODES, MODE_BY_ID } from "../data/modes";
import { MAX_PLAYERS, MIN_PLAYERS } from "../games/imposterLogic";
import { fitSummary, fitting, misfit, noFitAdvice, pickForGroup, paceLabel, playersLabel } from "../lib/fit";

describe("game eligibility", () => {
  it("keeps the registry's Odd One Out range in step with the mode's own limits", () => {
    expect(MODE_BY_ID.imposter.players).toEqual({ min: MIN_PLAYERS, max: MAX_PLAYERS });
  });

  it("exactly one mode is the recommended first game", () => {
    expect(MODES.filter((m) => m.starter)).toHaveLength(1);
  });

  it("excludes games the roster is too small for", () => {
    expect(misfit(MODE_BY_ID.imposter, { size: 2, content: "night" })).toBe("too-few");
    expect(misfit(MODE_BY_ID["most-likely-to"], { size: 2, content: "night" })).toBe("too-few");
    expect(misfit(MODE_BY_ID.ballpark, { size: 2, content: "night" })).toBeNull();
  });

  it("excludes games the roster is too big for", () => {
    expect(misfit(MODE_BY_ID.imposter, { size: 11, content: "night" })).toBe("too-many");
    expect(misfit(MODE_BY_ID.imposter, { size: 10, content: "night" })).toBeNull();
  });

  it("does not filter on size when there is no roster", () => {
    expect(fitting({ content: "night" })).toHaveLength(MODES.length);
  });

  it("skips drinking games at Mild and nowhere else", () => {
    expect(misfit(MODE_BY_ID["kings-cup"], { content: "safe" })).toBe("drinking");
    expect(misfit(MODE_BY_ID["kings-cup"], { content: "night" })).toBeNull();
    expect(misfit(MODE_BY_ID["kings-cup"], { content: "filthy" })).toBeNull();
    expect(fitting({ content: "safe" }).map((m) => m.id)).not.toContain("ride-the-bus");
  });

  it("labels ranges and pace without false precision", () => {
    expect(playersLabel({ min: 3, max: 10 })).toBe("3–10 players");
    expect(playersLabel({ min: 2 })).toBe("2+ players");
    expect(paceLabel({ minutes: 20, per: "game" })).toBe("~20 min a game");
  });
});

describe("pick a game for me", () => {
  it("draws only from games that fit and shows its working", () => {
    const { pick, pool, excluded } = pickForGroup({ size: 2, content: "safe" }, () => 0.5);
    expect(pick).not.toBeNull();
    expect(pool.every((m) => !m.drinking && m.players.min <= 2)).toBe(true);
    expect(excluded.map((e) => e.mode.id).sort()).toEqual(
      ["hot-seat", "imposter", "kings-cup", "most-likely-to", "ride-the-bus"].sort(),
    );
  });

  it("uses the injected rng and never indexes past the pool", () => {
    const a = pickForGroup({ content: "night" }, () => 0);
    const b = pickForGroup({ content: "night" }, () => 0.999999);
    expect(a.pick?.id).toBe(MODES[0].id);
    expect(b.pick?.id).toBe(MODES[MODES.length - 1].id);
    expect(pickForGroup({ content: "night" }, () => 1).pick).not.toBeNull();
  });

  it("returns no pick, and useful advice, when nothing qualifies", () => {
    const one = { size: 1, content: "night" as const };
    expect(pickForGroup(one).pick).toBeNull();
    expect(fitSummary(one)).toMatch(/Nothing fits/);
    expect(noFitAdvice(one)).toMatch(/Add names/);
  });

  it("summarises the pool honestly with and without a roster", () => {
    expect(fitSummary({ content: "night" })).toBe(`All ${MODES.length} games fit.`);
    expect(fitSummary({ content: "safe" })).toBe(`${MODES.length - 2} of ${MODES.length} games fit.`);
    expect(fitSummary({ size: 4, content: "safe" })).toBe(`${MODES.length - 2} of ${MODES.length} games fit for 4.`);
  });
});
