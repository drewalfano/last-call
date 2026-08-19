import { useCallback, useEffect, useRef, useState } from "react";
import { useContentMode } from "../state/contentMode";
import { useTheme } from "../state/theme";

/**
 * How long the sheet is held on screen on its way out.
 *
 * Matches --dur-fast, which is what the exit animation takes. It is a number
 * here rather than a read of the token because a timeout cannot read CSS, and
 * the two only have to agree to the frame — see the note on the hold below.
 */
const LEAVE_MS = 160;

/**
 * SETTINGS
 * ---------------------------------------------------------------
 * Everything that used to be a lone moon icon on Home. Content rating and
 * appearance are separate controls now — you can run 19+ content on a light
 * screen, or Safe content in the dark, which the old combined toggle made
 * impossible.
 */

export function SettingsButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button className="settings-btn" onClick={onOpen} aria-label="Settings">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
        <path
          d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { isNight, toggle } = useContentMode();
  const { preference, setPreference } = useTheme();

  /**
   * THE SHEET LEAVES AS WELL AS ARRIVES.
   *
   * It came in on a spring and went out between two frames: Home owns whether
   * it is mounted, so every way of dismissing it unmounted the thing mid-air.
   * The one presentation in the app was the only surface that never got to go.
   *
   * The exit is owned HERE rather than by Home, the same way Letter Rip owns
   * its board's — the component that knows it is leaving is the one that
   * should hold itself on screen for it. Home still decides whether the sheet
   * exists; this only delays telling it.
   *
   * THE HOLD IS A TIMEOUT, NOT `animationend`, which is the rule this app
   * arrived at twice already — see GameHeader's live line and LastWord's
   * board. A timeout fires whether or not anything painted, so a surface that
   * defers rendering costs you the animation and nothing else. Waiting on the
   * event would strand a settings sheet over the app with no way to dismiss
   * it, because the only handlers that could are the ones already spent.
   *
   * Guarded against a second dismiss: the backdrop is still under the finger
   * for the whole exit, and a second tap would stack another timeout and
   * another `onClose`.
   */
  const [leaving, setLeaving] = useState(false);
  const exit = useRef<number>(undefined);

  const close = useCallback(() => {
    if (exit.current !== undefined) return;
    setLeaving(true);
    exit.current = window.setTimeout(onClose, LEAVE_MS);
  }, [onClose]);

  useEffect(() => () => window.clearTimeout(exit.current), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  return (
    <div
      className="modal-backdrop"
      data-leaving={leaving || undefined}
      role="presentation"
      onClick={close}
    >
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sheet__head">
          <h2 className="sheet__title">Settings</h2>
          <button className="sheet__close" onClick={close} aria-label="Close settings">
            ×
          </button>
        </header>

        <section className="setting">
          <div className="setting__label">
            <span className="setting__name">Content</span>
            <span className="setting__hint">
              {isNight
                ? "Explicit questions, sex, and prompts about people in the room."
                : "Adult, but comfortable with coworkers or a date at the table."}
            </span>
          </div>
          <div className="segmented" role="group" aria-label="Content rating">
            <button
              className="segmented__opt"
              data-on={!isNight || undefined}
              onClick={() => isNight && toggle()}
            >
              Safe
            </button>
            <button
              className="segmented__opt"
              data-on={isNight || undefined}
              onClick={() => !isNight && toggle()}
            >
              19+
            </button>
          </div>
        </section>

        <section className="setting">
          <div className="setting__label">
            <span className="setting__name">Appearance</span>
            <span className="setting__hint">
              Device follows your phone. Packs keep their colour either way.
            </span>
          </div>
          <div className="segmented segmented--three" role="group" aria-label="Appearance">
            {(["dark", "light", "device"] as const).map((opt) => (
              <button
                key={opt}
                className="segmented__opt"
                data-on={preference === opt || undefined}
                onClick={() => setPreference(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </section>

        {/* Not decoration, and not an about box. This exists because an
            installed app can serve a build from days ago — everything is
            precached so it opens with no signal, and iOS only looks for a new
            service worker on a cold launch. Both values are baked into the
            bundle at build time, so a stale bundle shows a stale stamp and
            the question answers itself.

            Dated rather than numbered, because "is this current" is really
            "is this today" — no release number to remember to bump and no
            chance of it confidently stating the wrong answer. The commit
            beside it pins the exact build, separates two pushes on the same
            day, and can be checked against the last commit on main. */}
        <p className="sheet__build">
          Build {__BUILT_ON__} · {__BUILD_COMMIT__}
        </p>
      </div>
    </div>
  );
}
