import { useCallback, useEffect, useRef, useState } from "react";
import { CONTENT_TIERS, type ContentMode, useContentMode } from "../state/contentMode";
import { RING_STYLES, useRingStyle } from "../state/ringOrder";
import { useTheme } from "../state/theme";
import { audio } from "../lib/audio";

/** Order is the control's order, and the index of the current one drives the
    travelling fill — see .segmented. Declared once so the two cannot drift. */
const APPEARANCE = ["light", "dark", "device"] as const;

/** Same deal, and On leads because it is the state the app ships in. */
const SOUND = ["on", "off"] as const;

/**
 * THE CONTENT TIERS, AS A DOT AND TWO FLAMES.
 *
 * Icons rather than words because the labels were being asked to carry two
 * things at once — how explicit the deck is, and who you can play it with —
 * and no three words did both. A heat scale says "more" without claiming to
 * say what OF, and the line under the control does the explaining.
 *
 * The escalation is SIZE, so the sizes have to be far enough apart to read as
 * three steps: 16 and 28 either side of a 20px dot. The first draft ran 19 to
 * 26 and looked like a rendering mistake rather than a scale.
 *
 * Drawn rather than emoji: these sit on a fill that slides under them, so they
 * have to invert with `currentColor`, and an emoji would keep its own colour
 * and its own idea of what a flame looks like on every platform.
 *
 * `label` is the accessible name — the control is fully readable with no
 * visible text — and it leads the hint, so the word never actually
 * disappears, it just stops being a button.
 */
const TIERS: {
  mode: ContentMode;
  label: string;
  hint: string;
  icon: { size: number; flame: boolean };
}[] = [
  { mode: "safe", label: "Mild", hint: "Plays sober, with anyone.",
    icon: { size: 20, flame: false } },
  { mode: "night", label: "Spicy", hint: "Adds material for a night out. Drinking assumed.",
    icon: { size: 16, flame: true } },
  { mode: "filthy", label: "Filthy",
    hint: "Adds what you would only admit to people who will not repeat it.",
    icon: { size: 28, flame: true } },
];

function TierIcon({ size, flame }: { size: number; flame: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {flame ? (
        <path
          fill="currentColor"
          d="M12 2.2c.7 3 2.3 4.4 3.6 5.8C17 9.5 18 11.2 18 13.6a6 6 0 0 1-12 0c0-1.9.7-3.3 1.7-4.4.3 1 .9 1.7 1.6 2 .3-3 1.5-5.7 2.7-9z"
        />
      ) : (
        <circle cx="12" cy="12" r="3.5" fill="currentColor" />
      )}
    </svg>
  );
}

/**
 * The build stamp, worded on the device rather than at build time.
 *
 * __BUILT_AT__ is an ISO instant baked into the bundle — see vite.config.ts.
 * Actions builds in UTC, so anything formatted there would read hours off on
 * the one phone this exists for. `toLocaleString` with no locale argument
 * takes the device's own, so it comes out in the reader's timezone, in the
 * order and clock they already use: "20 Aug 2026, 14:32" or "2:32 PM"
 * depending on the phone, both of which are the right answer for that phone.
 *
 * Computed once at module scope. It cannot change while the app is open —
 * a new build is, by definition, a different bundle.
 */
const BUILT_AT = new Date(__BUILT_AT__).toLocaleString(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

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
  const { mode, tier, setMode } = useContentMode();
  const { preference, setPreference } = useTheme();
  const { ring, setRing } = useRingStyle();
  /**
   * Sound is the one setting held outside React, in the audio manager, because
   * every reader of it is a sound about to play rather than something on
   * screen — see lib/audio.ts. This is the single exception: the control has
   * to show which way it is set. Seeded from the manager rather than mirrored
   * into it, so the stored preference is still the one source.
   */
  const [soundOn, setSoundOn] = useState(!audio.isMuted());

  /**
   * Turning it on plays a tap, which is the only way to find out it worked.
   * Settings is a silent screen by nature and the sounds live inside the
   * games, so without this the control's whole job is invisible until you have
   * left, started a mode and pressed something. Nothing plays when switching
   * off, obviously.
   */
  const setSound = useCallback((on: boolean) => {
    audio.setMuted(!on);
    setSoundOn(on);
    if (on) audio.play("tap");
  }, []);

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
              <b>{TIERS[tier].label}.</b> {TIERS[tier].hint}
            </span>
          </div>
          <div
            className="segmented segmented--three"
            role="group"
            aria-label="Content level"
            style={{ ["--n" as string]: CONTENT_TIERS.length, ["--i" as string]: tier }}
          >
            {TIERS.map((t) => (
              <button
                key={t.mode}
                className="segmented__opt"
                data-on={mode === t.mode || undefined}
                aria-label={t.label}
                aria-pressed={mode === t.mode}
                onClick={() => setMode(t.mode)}
              >
                <TierIcon {...t.icon} />
              </button>
            ))}
          </div>
        </section>

        <section className="setting">
          <div className="setting__label">
            <span className="setting__name">Appearance</span>
            <span className="setting__hint">
              Device follows your phone. Packs keep their colour either way.
            </span>
          </div>
          <div
            className="segmented segmented--three"
            role="group"
            aria-label="Appearance"
            style={{
              ["--n" as string]: APPEARANCE.length,
              ["--i" as string]: APPEARANCE.indexOf(preference),
            }}
          >
            {APPEARANCE.map((opt) => (
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

        <section className="setting">
          <div className="setting__label">
            <span className="setting__name">Sound</span>
            <span className="setting__hint">
              Taps, clocks and buzzers. Made on the phone, so it works offline.
            </span>
          </div>
          <div
            className="segmented"
            role="group"
            aria-label="Sound"
            style={{ ["--n" as string]: SOUND.length, ["--i" as string]: soundOn ? 0 : 1 }}
          >
            {SOUND.map((opt) => (
              <button
                key={opt}
                className="segmented__opt"
                data-on={(opt === "on") === soundOn || undefined}
                aria-pressed={(opt === "on") === soundOn}
                onClick={() => setSound(opt === "on")}
              >
                {opt}
              </button>
            ))}
          </div>
        </section>

        {/* A JUDGING CONTROL, AND IT COMES OUT WHEN THE JUDGING IS DONE.
            Both tours walk the same eleven packs; they are solved for
            different things and the difference is a question about what the
            line looks like, which is not settleable anywhere but a phone. */}
        <section className="setting">
          <div className="setting__label">
            <span className="setting__name">Button glow</span>
            <span className="setting__hint">
              {ring === "tour"
                ? "Tour. Every pack distinct from its neighbours; three laps of hue."
                : "Spectrum. Under two laps of hue; neighbours a little closer."}
            </span>
          </div>
          <div
            className="segmented"
            role="group"
            aria-label="Button glow"
            style={{
              ["--n" as string]: RING_STYLES.length,
              ["--i" as string]: RING_STYLES.indexOf(ring),
            }}
          >
            {RING_STYLES.map((opt) => (
              <button
                key={opt}
                className="segmented__opt"
                data-on={ring === opt || undefined}
                aria-pressed={ring === opt}
                onClick={() => setRing(opt)}
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
            chance of it confidently stating the wrong answer. The time is what
            separates two pushes on the same day, which is most of them. */}
        <p className="sheet__build">Built {BUILT_AT}</p>
      </div>
    </div>
  );
}
