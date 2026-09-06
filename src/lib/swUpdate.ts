import { useSyncExternalStore } from "react";

/**
 * UPDATES, HELD UNTIL NOBODY IS MID-ROUND.
 * ---------------------------------------------------------------
 * The service worker used to be registered as `autoUpdate`: a new build
 * installed, took over the page and reloaded it, whatever was on screen. At
 * Home that is invisible. Mid-round it is a secret word vanishing off a phone
 * that is being passed around — game state lives in memory on purpose, so
 * the reload took the round with it.
 *
 * So the worker is registered as `prompt` now (see vite.config.ts): a new
 * build installs and WAITS, and this store decides when it is allowed to take
 * over.
 *
 *   - Found before anyone has touched the app — the ordinary case on an
 *     installed phone, which only looks for a new worker on a cold launch —
 *     it applies at once. Nothing has been started, so nothing is lost.
 *   - Found after that, it is held as `ready`. Home shows an offer to
 *     restart; a game in progress shows nothing and the offer waits for the
 *     table to come back to Home.
 *
 * A check can also be asked for by hand, from Settings. Under `prompt` a
 * check has three honest outcomes — nothing new, something new (now
 * waiting), or "could not check" — and the third one is reported as exactly
 * that. Offline is not "up to date".
 *
 * Held outside React because the registration happens in main.tsx before
 * the tree mounts, and every reader of it is a screen that mounts later.
 */
export type UpdateStatus =
  | "idle"
  | "checking"
  | "current"
  | "ready"
  | "unavailable"
  | "applying";

interface UpdateState {
  status: UpdateStatus;
  /** True once a service worker registration is in hand; false if there never will be one. */
  registered: boolean | null;
}

let state: UpdateState = { status: "idle", registered: null };
const listeners = new Set<() => void>();
let registration: ServiceWorkerRegistration | undefined;
let applyFn: (() => Promise<void> | void) | undefined;
/** Whether a person has touched the app yet. See decideOnReady. */
let interacted = false;
/** A round is up and must not be interrupted. Set by App from the screen state. */
let inRound = false;

function set(next: Partial<UpdateState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  const touched = () => {
    interacted = true;
    window.removeEventListener("pointerdown", touched, true);
    window.removeEventListener("keydown", touched, true);
  };
  window.addEventListener("pointerdown", touched, true);
  window.addEventListener("keydown", touched, true);
}

/** main.tsx hands the registration over; `undefined` means there never will be one. */
export function captureRegistration(reg: ServiceWorkerRegistration | undefined): void {
  registration = reg;
  set({ registered: reg !== undefined });
}

/** The function that tells a waiting worker to take over, from registerSW. */
export function captureApply(fn: () => Promise<void> | void): void {
  applyFn = fn;
}

/**
 * THE POLICY, AS A PURE FUNCTION so a test can pin it.
 *
 * `apply` when the page has just loaded and nobody has touched anything —
 * the reload is invisible. `offer` when someone is at Home: it is their
 * phone, and a restart they did not ask for reads as a crash. `hold` while a
 * round is up; the offer appears when the round is closed.
 */
export function decideOnReady(ctx: { interacted: boolean; inRound: boolean }): "apply" | "offer" | "hold" {
  if (!ctx.interacted) return "apply";
  return ctx.inRound ? "hold" : "offer";
}

/** registerSW's onNeedRefresh: a new build is installed and waiting. */
export function markReady(): void {
  if (decideOnReady({ interacted, inRound }) === "apply") {
    void applyUpdate();
    return;
  }
  set({ status: "ready" });
}

/** App reports whether a round is up, so a ready build knows to wait. */
export function setInRound(active: boolean): void {
  inRound = active;
}

/**
 * Restart onto the waiting build.
 *
 * The ordinary path: the waiting worker is told to skip waiting, it takes
 * control, and workbox-window reloads the page on `controllerchange`. The
 * fallback is for the one case where that never comes: a page that no worker
 * controls yet — the very first session after install, before any reload —
 * where a new worker activates at once instead of waiting and there is no
 * change of controller to react to. The new build is active either way, so
 * a plain reload lands on it. Nothing here is ever left saying "Restarting"
 * with nothing happening.
 */
export async function applyUpdate(): Promise<void> {
  if (!applyFn) return;
  set({ status: "applying" });
  try {
    await applyFn();
  } catch {
    set({ status: "unavailable" });
    return;
  }
  if (typeof window !== "undefined") {
    window.setTimeout(() => window.location.reload(), RELOAD_FALLBACK_MS);
  }
}

/** Long enough for a controlled page's controllerchange to reload it first. */
const RELOAD_FALLBACK_MS = 1500;

/**
 * Ask the browser for a newer worker. Resolves once the answer is known:
 * `ready` if one installed (and is now waiting), `current` if nothing
 * changed, `unavailable` if the check itself could not run — offline, or no
 * worker at all. Never resolves `current` on a failed fetch.
 */
export async function checkForUpdate(): Promise<UpdateStatus> {
  if (state.status === "checking" || state.status === "applying") return state.status;
  if (state.status === "ready") return "ready";
  const reg = registration;
  if (!reg) {
    set({ status: "unavailable" });
    return "unavailable";
  }
  set({ status: "checking" });
  try {
    await reg.update();
  } catch {
    set({ status: "unavailable" });
    return "unavailable";
  }
  const worker = reg.installing ?? reg.waiting;
  if (!worker) {
    set({ status: "current" });
    return "current";
  }
  const outcome = await new Promise<UpdateStatus>((resolve) => {
    if (worker.state === "installed" || worker.state === "activated") return resolve("ready");
    const onState = () => {
      if (worker.state === "installed" || worker.state === "activated") {
        worker.removeEventListener("statechange", onState);
        resolve("ready");
      } else if (worker.state === "redundant") {
        worker.removeEventListener("statechange", onState);
        resolve("unavailable");
      }
    };
    worker.addEventListener("statechange", onState);
  });
  /* markReady may already have set `ready` through onNeedRefresh; either way
     the store ends on the same word. */
  set({ status: outcome });
  return outcome;
}

/** Back to idle after a settled answer has been read. */
export function settle(): void {
  if (state.status === "current" || state.status === "unavailable") set({ status: "idle" });
}

export function useUpdateState(): UpdateState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

/** For tests: wipe module state between cases. */
export function _reset(): void {
  state = { status: "idle", registered: null };
  registration = undefined;
  applyFn = undefined;
  interacted = false;
  inRound = false;
}
export function _setInteracted(v: boolean): void {
  interacted = v;
}
