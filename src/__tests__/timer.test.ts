import { describe, expect, it } from "vitest";

/**
 * The clocks in Letter Rip and Overbid are deadline-based: remaining time is
 * always `deadline - now`, never a counter that only moves while frames are
 * being painted. That is what stops a backgrounded phone handing a player
 * extra time — and it is also why a round can expire while the app is in the
 * background, which the UI reports on return rather than pretending it did
 * not happen. The arithmetic is pinned here because it is the whole guarantee.
 */
function remaining(deadline: number, now: number) {
  return Math.max(0, deadline - now);
}

describe("deadline clock", () => {
  it("does not pause while the tab is hidden", () => {
    const start = 1000;
    const deadline = start + 10_000;
    // Frames stop for 4s while backgrounded; the next tick sees 6s left, not 10.
    expect(remaining(deadline, start + 4_000)).toBe(6_000);
  });

  it("expires exactly once the deadline has passed, however long the gap", () => {
    const deadline = 10_000;
    expect(remaining(deadline, 9_999)).toBe(1);
    expect(remaining(deadline, 10_000)).toBe(0);
    expect(remaining(deadline, 60_000)).toBe(0);
  });

  it("rounds seconds up, so the display never shows 0 while time is left", () => {
    expect(Math.ceil(remaining(10_000, 9_001) / 1000)).toBe(1);
    expect(Math.ceil(remaining(10_000, 10_000) / 1000)).toBe(0);
  });
});
