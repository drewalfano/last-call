import { beforeEach, describe, expect, it } from "vitest";
import {
  _reset,
  _setInteracted,
  applyUpdate,
  captureApply,
  captureRegistration,
  checkForUpdate,
  decideOnReady,
  markReady,
  setInRound,
} from "../lib/swUpdate";

type Listener = () => void;

class FakeWorker {
  listeners: Listener[] = [];
  state: string;
  constructor(state: string) {
    this.state = state;
  }
  addEventListener(_: string, l: Listener) { this.listeners.push(l); }
  removeEventListener() {}
  fire() { this.listeners.forEach((l) => l()); }
}

function fakeRegistration(opts: { fails?: boolean; finds?: "installed" | "installing" | null }) {
  const worker = opts.finds ? new FakeWorker(opts.finds) : null;
  const reg = {
    installing: worker && opts.finds === "installing" ? worker : null,
    waiting: worker && opts.finds === "installed" ? worker : null,
    async update() {
      if (opts.fails) throw new TypeError("Failed to fetch");
    },
  } as unknown as ServiceWorkerRegistration;
  return { reg, worker };
}

describe("update policy", () => {
  beforeEach(() => _reset());

  it("applies a build found before anyone has touched the app", () => {
    expect(decideOnReady({ interacted: false, inRound: false })).toBe("apply");
    expect(decideOnReady({ interacted: false, inRound: true })).toBe("apply");
  });

  it("offers at Home and holds during a round", () => {
    expect(decideOnReady({ interacted: true, inRound: false })).toBe("offer");
    expect(decideOnReady({ interacted: true, inRound: true })).toBe("hold");
  });

  it("does not restart under an active round when a build arrives", async () => {
    let applied = 0;
    captureApply(() => { applied++; });
    _setInteracted(true);
    setInRound(true);
    markReady();
    expect(applied).toBe(0);
    // And once the table is back at Home the restart is still a deliberate tap.
    setInRound(false);
    expect(applied).toBe(0);
    await applyUpdate();
    expect(applied).toBe(1);
  });

  it("restarts at once on a cold launch", () => {
    let applied = 0;
    captureApply(() => { applied++; });
    markReady();
    expect(applied).toBe(1);
  });

  it("reports a failed check as unavailable, never as up to date", async () => {
    captureRegistration(fakeRegistration({ fails: true }).reg);
    expect(await checkForUpdate()).toBe("unavailable");
  });

  it("reports no service worker as unavailable", async () => {
    captureRegistration(undefined);
    expect(await checkForUpdate()).toBe("unavailable");
  });

  it("reports current when nothing new was found", async () => {
    captureRegistration(fakeRegistration({ finds: null }).reg);
    expect(await checkForUpdate()).toBe("current");
  });

  it("reports ready once a found build has installed", async () => {
    const { reg, worker } = fakeRegistration({ finds: "installing" });
    captureRegistration(reg);
    const p = checkForUpdate();
    worker!.state = "installed";
    worker!.fire();
    expect(await p).toBe("ready");
  });

  it("reports ready immediately for a build already waiting", async () => {
    captureRegistration(fakeRegistration({ finds: "installed" }).reg);
    expect(await checkForUpdate()).toBe("ready");
  });
});
