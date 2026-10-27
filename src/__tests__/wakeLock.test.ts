import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { keepAwake, shouldHold } from "../lib/wakeLock";

class FakeStorage {
  items = new Map<string, string>();
  getItem(k: string) { return this.items.get(k) ?? null; }
  setItem(k: string, v: string) { this.items.set(k, v); }
}

const g = globalThis as { localStorage?: unknown };

describe("when the lock is held", () => {
  it("only while live, switched on and visible", () => {
    expect(shouldHold(true, true, true)).toBe(true);
    expect(shouldHold(false, true, true)).toBe(false);
    expect(shouldHold(true, false, true)).toBe(false);
    expect(shouldHold(true, true, false)).toBe(false);
  });
});

describe("the Keep screen awake setting", () => {
  let storage: FakeStorage;
  beforeEach(() => {
    storage = new FakeStorage();
    g.localStorage = storage;
    keepAwake.reload();
  });
  afterEach(() => {
    delete g.localStorage;
  });

  it("is on by default", () => {
    expect(keepAwake.isOn()).toBe(true);
  });

  it("survives a reload once switched off", () => {
    keepAwake.setOn(false);
    keepAwake.reload();
    expect(keepAwake.isOn()).toBe(false);
    keepAwake.setOn(true);
    keepAwake.reload();
    expect(keepAwake.isOn()).toBe(true);
  });

  it("tells subscribers, and stops when they leave", () => {
    let calls = 0;
    const stop = keepAwake.subscribe(() => calls++);
    keepAwake.setOn(false);
    stop();
    keepAwake.setOn(true);
    expect(calls).toBe(1);
  });

  it("holds for the session when storage throws", () => {
    g.localStorage = {
      getItem() { throw new Error("denied"); },
      setItem() { throw new Error("denied"); },
    };
    keepAwake.reload();
    expect(keepAwake.isOn()).toBe(true);
    keepAwake.setOn(false);
    expect(keepAwake.isOn()).toBe(false);
  });
});
