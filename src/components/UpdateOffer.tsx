import { applyUpdate, useUpdateState } from "../lib/swUpdate";

/**
 * A NEW BUILD IS WAITING, AND THIS IS HOME, SO SAY SO.
 *
 * Rendered by Home only. A game in progress never shows this — the store
 * holds the update until the table is back here — and the restart is a tap,
 * not a surprise. See lib/swUpdate.ts for when a ready build applies itself
 * instead (a cold launch, before anyone has touched anything).
 */
export function UpdateOffer() {
  const { status } = useUpdateState();
  if (status !== "ready" && status !== "applying") return null;
  return (
    <div className="update-offer" role="status">
      <span className="update-offer__text">
        {status === "applying" ? "Restarting…" : "A new version is ready."}
      </span>
      <button
        className="update-offer__btn"
        onClick={() => void applyUpdate()}
        disabled={status === "applying"}
      >
        Restart
      </button>
    </div>
  );
}
