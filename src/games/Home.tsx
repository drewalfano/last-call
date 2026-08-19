import { useCallback, useRef, useState } from "react";
import { MODES, type ModeId } from "../data/modes";
import { SettingsButton, SettingsSheet } from "../components/Settings";
import { RosterBar } from "../components/RosterBar";
import { categoryStyle } from "../lib/style";

interface HomeProps {
  /** The rect lets App expand the mode's color out from the card you tapped. */
  onPick: (id: ModeId, rect?: { top: number; left: number; right: number; bottom: number }) => void;
}

/** How long the chosen card sits highlighted before it opens. */
const REVEAL_MS = 480;

/**
 * Whether the deck has already dealt itself out this session.
 *
 * Module scope, not state: Home is unmounted every time you open a mode and
 * remounted every time you come back, so component state would call every
 * return a first open. The deal is the app's opening flourish — paying it on
 * every back press would turn it into a toll.
 */
let dealt = false;

/**
 * The whole app's table of contents, dealt as a stack of overlapping cards.
 * Every mode is one tap away — no menus, no settings page.
 */
export function Home({ onPick }: HomeProps) {
  /** True only on the first Home of the session. Claims it as it reads it. */
  const [dealing] = useState(() => {
    const first = !dealt;
    dealt = true;
    return first;
  });
  const [picked, setPicked] = useState<ModeId | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const deckRef = useRef<HTMLElement>(null);
  const timer = useRef<number>(undefined);

  const openCard = useCallback(
    (id: ModeId, el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      onPick(id, { top: r.top, left: r.left, right: r.right, bottom: r.bottom });
    },
    [onPick],
  );

  /**
   * Picks a mode at random, brings its card into view and lifts it, then opens
   * it with the same expansion a tap gives. The pause is the point — you see
   * which card was chosen before its color takes the screen.
   */
  const pickForMe = useCallback(() => {
    if (picked) return;
    const mode = MODES[Math.floor(Math.random() * MODES.length)];
    const el = deckRef.current?.querySelector<HTMLElement>(`[data-mode="${mode.id}"]`);
    if (!el) {
      onPick(mode.id);
      return;
    }
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    setPicked(mode.id);
    timer.current = window.setTimeout(() => openCard(mode.id, el), REVEAL_MS);
  }, [picked, onPick, openCard]);

  return (
    <div className="screen home">
      <header className="home__head">
        <div>
          <h1 className="home__wordmark">Last Call</h1>
          <p className="home__tagline">11 games. No wifi. Just play.</p>
        </div>
        <SettingsButton onOpen={() => setSettingsOpen(true)} />
      </header>

      <RosterBar />

      <button className="pick-me" onClick={pickForMe} disabled={!!picked}>
        {picked ? "Dealing…" : "Pick a game for me"}
      </button>

      <nav
        className={dealing ? "home__deck home__deck--dealing" : "home__deck"}
        aria-label="Game modes"
        ref={deckRef}
      >
        {MODES.map((mode, i) => (
          <button
            key={mode.id}
            data-mode={mode.id}
            data-picked={picked === mode.id || undefined}
            className="deck-card"
            /* Counted from the BOTTOM of the deck, so the deal runs upward —
               see .home__deck--dealing. */
            style={{
              ...categoryStyle(mode.color),
              zIndex: i + 1,
              ["--i" as string]: MODES.length - 1 - i,
            }}
            onClick={(e) => openCard(mode.id, e.currentTarget)}
          >
            <span className="deck-card__title">
              {mode.title}
              {mode.signature && (
                <span className="deck-card__star" aria-label="the namesake mode">
                  ★
                </span>
              )}
            </span>
            <span className="deck-card__tagline">{mode.tagline}</span>
          </button>
        ))}
      </nav>

      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
