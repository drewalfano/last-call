import { useCallback, useEffect, useRef, useState } from "react";
import { MODE_BY_ID, type ModeId } from "./data/modes";
import { SHELL_TOKEN, useAppBackground } from "./lib/appBackground";
import { categoryStyle } from "./lib/style";
import { useTheme } from "./state/theme";
import { Home } from "./games/Home";
import { DeckGame, DECK_GAMES, isDeckGame, type DeckGameConfig } from "./games/DeckGame";
import { LastCallGame } from "./games/LastCallGame";
import { HotSeat } from "./games/HotSeat";
import { RideTheBus } from "./games/RideTheBus";
import { LastWord } from "./games/LastWord";
import { MostLikelyTo } from "./games/MostLikelyTo";
import { SayTheSameThing } from "./games/SayTheSameThing";
import { RankIt } from "./games/RankIt";
import { NumberGame } from "./games/NumberGame";
import { KingsCup } from "./games/KingsCup";
import { Imposter } from "./games/Imposter";

/**
 * SCREEN STATE MACHINE
 * Deliberately not a router. Nav is flat and one level deep: Home → a mode,
 * and the only way out of a mode is back to Home. Nobody bookmarks a
 * prompt mid-party, and a router would cost bundle size
 * and cold-start time for navigation this app doesn't have.
 *
 * Game state is intentionally unmounted on exit — leaving a mode ends the
 * round, which is the behaviour a group expects when someone hits back.
 */
/** Launch animation. Tuned to iOS sheet motion: decisive, then a long settle. */
const LAUNCH_MS = 520;
const LAUNCH_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

/**
 * CLOSING IS NOT OPENING PLAYED BACKWARDS, AND DELIBERATELY SO.
 *
 * Opening is a presentation worth watching: a card's colour expands from the
 * rect you tapped, over 520ms, and the screen swap hides underneath it.
 * Contracting back to that rect would be the symmetrical thing to do and the
 * wrong one, for two reasons.
 *
 * The rect is gone. Home is unmounted while a mode is up, and its deck may
 * have been scrolled since; there is no card on screen to aim at, so the
 * destination would have to be a remembered rectangle that may no longer be
 * where that card sits. A contraction that lands somewhere arbitrary is worse
 * than none.
 *
 * And the X is a reflex. It is pressed to GET OUT — by someone who opened the
 * wrong mode, or whose round has ended — and every pass-the-phone handoff in
 * this app already spends --dur-slow on a card flip. The way out is the last
 * place to spend more.
 *
 * So the colour just goes: --dur-fast, straight through. Long enough that the
 * pack colour is not cut off mid-frame, short enough to stay out of the way.
 * Matches --dur-fast, which is what the CSS takes; see .launch--closing.
 */
const CLOSE_MS = 160;

interface Launch {
  id: ModeId;
  /** Where on screen the tapped card was, in viewport pixels. */
  rect: { top: number; left: number; right: number; bottom: number };
}

export default function App() {
  const [screen, setScreen] = useState<ModeId | null>(null);
  const [launch, setLaunch] = useState<Launch | null>(null);
  /** The mode whose colour is still on screen, fading, after it has closed. */
  const [closing, setClosing] = useState<ModeId | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number>(undefined);
  const { theme } = useTheme();

  /**
   * The colour the whole device shows, status bar included. Home is the shell;
   * inside a mode it is that pack's colour, so the strip above the header
   * reads as more of the same field rather than as a band on top of it.
   *
   * Deliberately keyed to `screen` and not to `launch`: the pack colour lands
   * as the screen swaps, which happens underneath the opaque launch overlay,
   * so the status bar changes colour on the one frame nothing else is visible.
   *
   * `closing` holds it there on the way out, for the same reason read the
   * other way round. The screen goes back to Home immediately — under an
   * opaque overlay still flooded in the pack colour — so a status bar keyed to
   * `screen` alone would snap to the shell while the whole display below it is
   * still red. It follows the overlay instead and changes as that clears,
   * which is once again the frame where nothing else is moving.
   */
  const painted = screen ?? closing;
  useAppBackground(painted ? MODE_BY_ID[painted].color : SHELL_TOKEN, theme);

  /**
   * Leaving a mode drops its colour over the whole screen and fades it out —
   * the same ordering the launch uses, with the two steps swapped. The screen
   * goes back to Home UNDERNEATH an overlay that is already opaque and already
   * covering, so the unmount is as invisible as the mount is on the way in,
   * and what you actually watch is a field of colour clearing off Home.
   *
   * A timeout retires the overlay rather than an animation event: a stalled
   * fade would otherwise leave an opaque sheet of colour over the entire app
   * with nothing left to dismiss it. Same rule, same reason, as the live
   * line's exit and Letter Rip's board.
   *
   * Under reduced motion there is no overlay at all — the same check the
   * launch makes, so both directions answer the question once each.
   */
  const goHome = useCallback(() => {
    if (screen === null) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) {
      setClosing(screen);
      window.clearTimeout(closeTimer.current);
      closeTimer.current = window.setTimeout(() => setClosing(null), CLOSE_MS);
    }
    setScreen(null);
  }, [screen]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  /**
   * Opening a mode expands its color from the tapped card out to the whole
   * screen. The overlay lives up here rather than inside Home for one
   * important reason: it has to outlive the screen swap. The sequence is
   *
   *   1. overlay paints at the card's rect, Home still visible behind it
   *   2. it expands to cover everything
   *   3. only then does the screen swap — hidden under an opaque field, so
   *      the expensive unmount/mount can't be seen
   *   4. a frame later the overlay goes, revealing a screen already flooded
   *      in the same color
   *
   * Doing the swap on step 3 rather than step 1 is what removes the jank.
   */
  const open = useCallback((id: ModeId, rect?: Launch["rect"]) => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!rect || reduced) {
      setScreen(id);
      return;
    }
    setLaunch({ id, rect });
  }, []);

  useEffect(() => {
    if (!launch) return;
    const el = overlayRef.current;
    if (!el) {
      setScreen(launch.id);
      setLaunch(null);
      return;
    }
    const { top, left, right, bottom } = launch.rect;
    const from = `inset(${top}px ${window.innerWidth - right}px ${
      window.innerHeight - bottom
    }px ${left}px round 22px)`;

    const anim = el.animate(
      [{ clipPath: from }, { clipPath: "inset(0px round 0px)" }],
      { duration: LAUNCH_MS, easing: LAUNCH_EASE, fill: "forwards" },
    );

    const finish = () => {
      setScreen(launch.id);
      // Hold the overlay one more frame so the swap happens underneath it.
      requestAnimationFrame(() => requestAnimationFrame(() => setLaunch(null)));
    };
    anim.onfinish = finish;
    anim.oncancel = finish;
    return () => {
      anim.onfinish = null;
      anim.oncancel = null;
    };
  }, [launch]);

  // Every screen starts at the top — a mode entered from the bottom of the
  // Home list should not open mid-scroll.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  // Entering a mode floods the ENTIRE viewport with that pack's color —
  // applied at the app root rather than per-screen so the color runs edge to
  // edge, past the centered content column, on any screen size.
  const flood = screen ? categoryStyle(MODE_BY_ID[screen].color) : undefined;

  return (
    <div className="app" style={flood}>
      <div className="app__frame">{renderScreen(screen, open, goHome)}</div>
      {launch && (
        <div
          ref={overlayRef}
          className="launch"
          style={{
            ...categoryStyle(MODE_BY_ID[launch.id].color),
            // Painted correctly on the very first frame, so the animation
            // never starts from a full-screen flash.
            clipPath: `inset(${launch.rect.top}px ${
              window.innerWidth - launch.rect.right
            }px ${window.innerHeight - launch.rect.bottom}px ${launch.rect.left}px round 22px)`,
          }}
          aria-hidden="true"
        />
      )}
      {/* The colour on its way off. No clip-path: it covers everything from
          the frame it appears, which is what lets the screen swap under it. */}
      {closing && (
        <div
          className="launch launch--closing"
          style={categoryStyle(MODE_BY_ID[closing].color)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

function renderScreen(
  screen: ModeId | null,
  open: (id: ModeId, rect?: Launch["rect"]) => void,
  goHome: () => void,
) {
  if (screen === null) return <Home onPick={open} />;

  const mode = MODE_BY_ID[screen];

  // The plain prompt decks share one component and differ by config.
  if (isDeckGame(screen)) {
    return (
      <DeckGame
        key={screen}
        mode={mode}
        config={DECK_GAMES[screen] as unknown as DeckGameConfig<never>}
        onBack={goHome}
      />
    );
  }

  switch (screen) {
    case "last-call":
      return <LastCallGame mode={mode} onBack={goHome} />;
    case "hot-seat":
      return <HotSeat mode={mode} onBack={goHome} />;
    case "ride-the-bus":
      return <RideTheBus mode={mode} onBack={goHome} />;
    case "last-word":
      return <LastWord mode={mode} onBack={goHome} />;
    case "kings-cup":
      return <KingsCup mode={mode} onBack={goHome} />;
    case "most-likely-to":
      return <MostLikelyTo mode={mode} onBack={goHome} />;
    case "say-the-same-thing":
      return <SayTheSameThing mode={mode} onBack={goHome} />;
    case "rank-it":
      return <RankIt mode={mode} onBack={goHome} />;
    case "the-number-game":
      return <NumberGame mode={mode} onBack={goHome} />;
    case "imposter":
      return <Imposter mode={mode} onBack={goHome} />;
  }
}
