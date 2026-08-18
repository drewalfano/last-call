import { useCallback, useEffect, useRef, useState } from "react";
import { MODE_BY_ID, type ModeId } from "./data/modes";
import { categoryStyle } from "./lib/style";
import { Home } from "./games/Home";
import { DeckGame, DECK_GAMES, isDeckGame, type DeckGameConfig } from "./games/DeckGame";
import { TruthOrDare } from "./games/TruthOrDare";
import { LastCallGame } from "./games/LastCallGame";
import { HotSeat } from "./games/HotSeat";
import { RideTheBus } from "./games/RideTheBus";
import { LastWord } from "./games/LastWord";
import { KingsCup } from "./games/KingsCup";
import { Imposter } from "./games/Imposter";

/**
 * SCREEN STATE MACHINE
 * Deliberately not a router. Nav is flat and one level deep: Home → a mode,
 * and the only way out of a mode is back to Home. Nobody bookmarks a
 * would-you-rather prompt mid-party, and a router would cost bundle size
 * and cold-start time for navigation this app doesn't have.
 *
 * Game state is intentionally unmounted on exit — leaving a mode ends the
 * round, which is the behaviour a group expects when someone hits back.
 */
/** Launch animation. Tuned to iOS sheet motion: decisive, then a long settle. */
const LAUNCH_MS = 520;
const LAUNCH_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

interface Launch {
  id: ModeId;
  /** Where on screen the tapped card was, in viewport pixels. */
  rect: { top: number; left: number; right: number; bottom: number };
}

export default function App() {
  const [screen, setScreen] = useState<ModeId | null>(null);
  const [launch, setLaunch] = useState<Launch | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const goHome = useCallback(() => setScreen(null), []);

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
    case "truth-or-dare":
      return <TruthOrDare mode={mode} onBack={goHome} />;
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
    case "imposter":
      return <Imposter mode={mode} onBack={goHome} />;
  }
}
