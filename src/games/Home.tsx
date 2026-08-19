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
 * How much of the button's edge the travelling line covers, as a divisor of
 * the perimeter — 3 is a third of the way round.
 */
const RING_SPAN = 3;

/**
 * Sub-segments per pack. This is what turns eleven flat colours into a
 * gradient that follows the path.
 *
 * An svg stroke CAN take a gradient, but a `linearGradient` maps to the
 * bounding box rather than along the stroke: the line would be one colour on
 * the left cap, a sweep across the top, and mirrored on the way back. There
 * is no paint server that runs along a path. So the ramp is built out of
 * abutting pieces instead, each a `color-mix` between the pack it is leaving
 * and the pack it is heading for — enough of them that the steps close up and
 * read as a blend.
 *
 * Six is the number where banding stops being visible at the size this
 * actually draws: a third of a ~870px perimeter is ~290px, over 66 pieces,
 * so each is ~4px. Dropping this to 1 is the whole way back to eleven hard
 * bands, which is the same design with the blending turned off.
 */
const RING_STEPS = 6;

/**
 * The eleven packs in dealing order, blended into each other and closing the
 * loop back onto the first — so the streak has no seam at either end.
 */
const RING_RAMP = MODES.flatMap((mode, i) => {
  const next = MODES[(i + 1) % MODES.length];
  return Array.from(
    { length: RING_STEPS },
    (_, step) =>
      // oklab, not srgb: mixing saturated hues in srgb dips through grey at
      // the midpoint, which on this ramp put a dull band between every pair.
      `color-mix(in oklab, var(${mode.color}) ${
        100 - (step * 100) / RING_STEPS
      }%, var(${next.color}))`,
  );
});

const RING_PATH = RING_RAMP.length * RING_SPAN;

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
        {/* One line running round the button's grey edge, a third of the way
            round, graded through all eleven packs — see .pick-me__ring. The
            grey stroke is the button's own border and stays put; this only
            travels over it. */}
        <svg
          className="pick-me__ring"
          style={{ ["--path" as string]: RING_PATH }}
          aria-hidden="true"
        >
          <defs>
            {/* The bloom, done as ONE filter on the whole group rather than a
                second blurred copy of the line — 66 more rects and 66 more
                animations to light the first 66 is a lot of machinery for a
                soft edge. feMerge lays the blur down twice under the sharp
                original, which is what gives it a centre bright enough to
                read as a glow rather than as the line being out of focus.

                The region is generous on purpose: a filter clips to its own
                box, and a stdDeviation of 4 carries roughly 12px, which is
                well outside a 60px-tall bounding box. Cropping it would put
                a straight edge across the bloom. */}
            <filter
              id="pick-me-glow"
              x="-25%"
              y="-150%"
              width="150%"
              height="400%"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur stdDeviation="4" result="bloom" />
              <feMerge>
                <feMergeNode in="bloom" />
                <feMergeNode in="bloom" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g filter="url(#pick-me-glow)">
            {RING_RAMP.map((colour, i) => (
              <rect
                key={i}
                pathLength={RING_PATH}
                style={{ stroke: colour, ["--seg" as string]: i }}
              />
            ))}
          </g>
        </svg>
        <span className="pick-me__label">
          {picked ? "Dealing…" : "Pick a game for me"}
        </span>
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
