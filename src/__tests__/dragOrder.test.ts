import { describe, expect, it } from "vitest";
import { move, shiftFor, shuffled, slotFor, stepKey } from "../lib/dragOrder";

const five = ["a", "b", "c", "d", "e"];

describe("move", () => {
  it("moves down and up", () => {
    expect(move(five, 0, 3)).toEqual(["b", "c", "d", "a", "e"]);
    expect(move(five, 4, 1)).toEqual(["a", "e", "b", "c", "d"]);
  });

  it("leaves the list alone for a no-op or an out-of-range index", () => {
    expect(move(five, 2, 2)).toEqual(five);
    expect(move(five, -1, 2)).toEqual(five);
    expect(move(five, 1, 9)).toEqual(five);
  });

  it("never mutates its input", () => {
    const list = five.slice();
    move(list, 0, 4);
    expect(list).toEqual(five);
  });
});

describe("slotFor", () => {
  it("rounds to the nearest row travelled", () => {
    expect(slotFor(1, 0, 100, 5)).toBe(1);
    expect(slotFor(1, 49, 100, 5)).toBe(1);
    expect(slotFor(1, 51, 100, 5)).toBe(2);
    expect(slotFor(3, -160, 100, 5)).toBe(1);
  });

  it("stays at the ends when dragged past them", () => {
    expect(slotFor(0, -500, 100, 5)).toBe(0);
    expect(slotFor(2, 900, 100, 5)).toBe(4);
  });

  it("does not move on a zero step", () => {
    expect(slotFor(2, 300, 0, 5)).toBe(2);
  });
});

describe("shiftFor", () => {
  it("closes the gap behind a row dragged down", () => {
    // b (1) held over d (3): c and d shift up, a and e stay.
    expect([0, 1, 2, 3, 4].map((i) => shiftFor(i, 1, 3))).toEqual([0, 0, -1, -1, 0]);
  });

  it("opens a gap ahead of a row dragged up", () => {
    // e (4) held over b (1): b, c and d shift down.
    expect([0, 1, 2, 3, 4].map((i) => shiftFor(i, 4, 1))).toEqual([0, 1, 1, 1, 0]);
  });

  it("agrees with move: shifted rows land where move puts them", () => {
    for (let from = 0; from < 5; from++) {
      for (let to = 0; to < 5; to++) {
        const after = move(five, from, to);
        five.forEach((item, i) => {
          if (i === from) return;
          expect(after.indexOf(item)).toBe(i + shiftFor(i, from, to));
        });
      }
    }
  });
});

describe("stepKey", () => {
  it("moves the focused row one place with the arrows", () => {
    expect(stepKey("ArrowUp", 2, 5)).toBe(1);
    expect(stepKey("ArrowDown", 2, 5)).toBe(3);
  });

  it("does nothing at the ends or for other keys", () => {
    expect(stepKey("ArrowUp", 0, 5)).toBeNull();
    expect(stepKey("ArrowDown", 4, 5)).toBeNull();
    expect(stepKey("ArrowLeft", 2, 5)).toBeNull();
  });
});

describe("shuffled", () => {
  it("keeps every item exactly once", () => {
    expect(shuffled(five).slice().sort()).toEqual(five);
  });

  it("never opens on the order it is told to avoid", () => {
    // A rand that, unchecked, would leave the list as it was.
    let calls = 0;
    const rand = () => (calls++ < 4 ? 0.999 : 0);
    const out = shuffled(five, five, rand);
    expect(out).not.toEqual(five);
    expect(out.slice().sort()).toEqual(five);
  });

  it("hands back a one-item list unchanged", () => {
    expect(shuffled(["a"])).toEqual(["a"]);
  });
});
