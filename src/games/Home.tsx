import { useCallback, useEffect, useRef, useState } from "react";
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
 * the perimeter — 2 is half the way round.
 *
 * This is a legibility number, not a taste one. The eleven packs are not
 * merely many, they swing hard in LIGHTNESS: Imposter's dark teal, Kings
 * Cup's navy and Hot Seat's near-black brown sit between eight bright ones.
 * At a third of the perimeter each pack held ~26px, so the line crossed a
 * full dark-to-light cycle every ~50px and read as blotchy however many
 * blend steps it was cut into — the roughness was the palette, not the
 * resolution. Half the perimeter gives each pack ~40px, which is enough for
 * a dark one to arrive as part of a ramp rather than as a gap in the line.
 *
 * The other lever, if this ever needs to be short again, is evening out the
 * lightness of the ramp — but that stops the colours being the packs, which
 * is the entire point of it.
 */
const RING_SPAN = 2;

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
 * Sixteen, which is more than it sounds. A third of a ~870px perimeter is
 * ~290px of line: at six steps each piece was ~4px and the ramp still read as
 * a row of tiny flat bands rather than a blend. At sixteen they are ~1.6px,
 * under the width at which the eye separates them.
 *
 * The count is free in the way that matters — see .pick-me__ring, where the
 * whole ramp moves on ONE animation rather than one each — so the only real
 * cost is DOM nodes. Dropping this to 1 is the whole way back to eleven hard
 * bands: the same design with the blending turned off.
 */
const RING_STEPS = 16;

/**
 * The eleven packs blended into each other, in the order they sit on Home —
 * Last Call's red at one end, Hot Seat's brown at the other.
 *
 * Ten transitions, NOT eleven. It used to wrap the last pack back round to
 * the first so the streak had no ends, which sounds tidy and puts a colour on
 * the line that is not in the app: brown mixed toward red lands on a dark
 * muddy red, sitting after the brown as if there were a twelfth game. The
 * line has ends now. They are the first and last cards of the deck.
 */
const RING_RAMP = [
  ...MODES.slice(0, -1).flatMap((mode, i) =>
    Array.from(
      { length: RING_STEPS },
      (_, step) =>
        // oklab, not srgb: mixing saturated hues in srgb dips through grey at
        // the midpoint, which put a dull band between every pair.
        `color-mix(in oklab, var(${mode.color}) ${
          100 - (step * 100) / RING_STEPS
        }%, var(${MODES[i + 1].color}))`,
    ),
  ),
  // Lands on the last pack itself rather than stopping just short of it.
  `var(${MODES[MODES.length - 1].color})`,
];

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
  const ringRef = useRef<SVGGElement>(null);
  const timer = useRef<number>(undefined);

  /**
   * The line winds up while the deck is dealing.
   *
   * `playbackRate` rather than a shorter `animation-duration` under
   * `:disabled`, which was the obvious way and is wrong: duration is what
   * maps elapsed time onto progress, so changing it re-maps where the
   * animation already IS and the line teleports to a different point on the
   * loop at the exact moment you are watching it. Setting the rate keeps the
   * current time and only changes what happens next, so it reads as the thing
   * accelerating from wherever it had got to.
   *
   * Nothing to clean up: the element unmounts with Home, and it is set back
   * to 1 rather than left fast in case a deal is ever cancelled.
   */
  useEffect(() => {
    const spin = ringRef.current?.getAnimations()[0];
    // Absent under prefers-reduced-motion, where the line does not run at all.
    if (spin) spin.playbackRate = picked ? 8 : 1;
  }, [picked]);

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
                second blurred copy of the line — another 176 rects to light
                the first 176 is a lot of machinery for a soft edge. feMerge
                lays the blur down twice under the sharp original, which is
                what gives it a centre bright enough to read as a glow rather
                than as the line being out of focus.

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

            {/* OUTSIDE ONLY. The bloom is a blur, so half of it lands inside
                the pill, where it washes across the label and reads as the
                button being lit from within rather than as an edge that
                glows. This punches the button's own interior out of it.

                The hole is the PADDING box — the pill inset by the 2px
                border. The sharp line sits in that border band, so it comes
                through untouched; everything the blur threw further inward
                is cut at the inner edge of the stroke. Masking cannot soften
                that boundary, but it does not need to: the line's own colour
                sits right on it.

                userSpaceOnUse with a region to match the filter's — a mask
                defaults to a box 10% around the object, which would crop the
                outward bloom the filter just drew. */}
            <mask
              id="pick-me-outside"
              maskUnits="userSpaceOnUse"
              x="-25%"
              y="-150%"
              width="150%"
              height="400%"
            >
              <rect className="pick-me__mask-all" />
              <rect className="pick-me__mask-hole" />
            </mask>
          </defs>
          <g ref={ringRef} filter="url(#pick-me-glow)" mask="url(#pick-me-outside)">
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
