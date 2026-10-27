import { useEffect, useSyncExternalStore } from "react";

/**
 * KEEP THE SCREEN ON WHILE A ROUND IS LIVE.
 * ---------------------------------------------------------------
 * A board propped on a table between turns is a screen nobody is touching,
 * and iPadOS dims and locks it on the same timer as one left in a bag. The
 * round survives that — its state is in memory and the page is only hidden —
 * but somebody has to reach over, wake it, and find the game again, which is
 * the one job the device had.
 *
 * Hung on the exit guard's signal, so "live" means exactly what it means for
 * "End this round?": each game names its own live phases once and both read
 * them. A setup screen, an intro or Home lets the screen sleep as usual.
 *
 * The browser drops the lock whenever the page is hidden, and does not take it
 * back on its own. So it is requested again each time the page comes back to
 * the front while the round is still live.
 *
 * On by default. The setting exists for a table that wants the device's own
 * timer back, not because staying awake needs asking for.
 */

const KEY = "lastcall.wakeLock.off";

let off = readOff();
const listeners = new Set<() => void>();

function readOff(): boolean {
  try {
    return localStorage.getItem(KEY) === "true";
  } catch {
    return false;
  }
}

export const keepAwake = {
  isOn(): boolean {
    return !off;
  },
  setOn(on: boolean): void {
    off = !on;
    try {
      localStorage.setItem(KEY, String(off));
    } catch {
      /* private mode: the setting holds for this session and no longer */
    }
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /** Re-read storage. For tests, which swap localStorage under the module. */
  reload(): void {
    off = readOff();
  },
};

/** Whether the lock should be held right now. */
export function shouldHold(live: boolean, on: boolean, visible: boolean): boolean {
  return live && on && visible;
}

export function useKeepAwake(): boolean {
  return useSyncExternalStore(keepAwake.subscribe, keepAwake.isOn);
}

export function useWakeLock(live: boolean): void {
  const on = useKeepAwake();

  useEffect(() => {
    if (!live || !on || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let done = false;

    const acquire = async () => {
      if (!shouldHold(live, on, document.visibilityState === "visible")) return;
      if (sentinel && !sentinel.released) return;
      try {
        const s = await navigator.wakeLock.request("screen");
        if (done) void s.release();
        else sentinel = s;
      } catch {
        /* refused — low battery, or no user activation yet. The screen
           sleeps on its usual timer, which is all that was ever at stake. */
      }
    };

    void acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      done = true;
      document.removeEventListener("visibilitychange", acquire);
      void sentinel?.release();
    };
  }, [live, on]);
}
