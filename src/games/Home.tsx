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
 * The ramp spans the WHOLE perimeter now — one piece per unit, all the way
 * round — because the line no longer travels as a fixed-length streak. It
 * draws itself: each piece lights in turn, so the line grows out of one point,
 * runs the full ring, and retracts back into the same point. See
 * .pick-me__ring for the timing that produces it.
 *
 * It used to be half the perimeter, slid round by an animated offset. That
 * can only ever FADE a half-ring into view — there is no point for it to come
 * out of, because at the moment it becomes visible it already covers half the
 * button.
 *
 * Spread over the whole ring, each pack holds ~80px, which is more than
 * enough for the dark ones — Imposter's teal, Kings Cup's navy, Hot Seat's
 * near-black brown — to arrive as part of a ramp rather than as a gap. That
 * was the problem when the line was a third of the perimeter and each pack
 * had ~26px: the eleven swing hard in lightness, so the line crossed a full
 * dark-to-light cycle every ~50px and read as blotchy however finely it was
 * cut. Room, not resolution, was the fix.
 */
const RING_SPAN = 1;

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
 * Thirty-two, and the number is set by the WORST pair rather than the
 * average one. Most of the ten transitions are smooth by sixteen; Ride the
 * Bus to Same Page is not, because gold and light blue sit almost opposite
 * each other on the hue wheel. Going round between them is ~180 degrees
 * however you go, so at sixteen steps each piece turned 11 degrees of hue at
 * full chroma — measured as a 55-point rgb jump between two neighbours, which
 * is a visible edge no matter how narrow the piece is. Doubling halves it.
 *
 * The count is nearly free in the way that matters — see .pick-me__ring,
 * where the whole ramp moves on ONE animation rather than one each — so the
 * cost is DOM nodes and per-frame style recalc, not animation objects.
 * Dropping this to 1 is the whole way back to eleven hard bands: the same
 * design with the blending turned off.
 */
const RING_STEPS = 32;

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
        // oklch, and the CH is the whole point: it is polar, so the mix walks
        // hue ROUND the wheel at full chroma instead of cutting across the
        // middle of it. srgb was the first attempt and dips through grey;
        // oklab was the second and dips just as hard — measured, every one of
        // the ten pairs lost most of its colour at the midpoint, worst of them
        // Kings Cup to Ride the Bus at chroma 176 down to 24. That is what a
        // straight line between two saturated colours does: it passes near the
        // achromatic axis. Eleven bright packs separated by ten grey sags is
        // exactly what "I can see the steps" looks like, and no number of
        // extra steps fixes it, because the sag is IN the ramp rather than
        // between its pieces.
        //
        // Going round keeps the chroma up the whole way. The hues it passes
        // through are the short way between two packs, which on this palette
        // is mostly other packs' hues — navy to gold goes purple, magenta,
        // red, orange rather than through mud.
        `color-mix(in oklch, var(${mode.color}) ${
          100 - (step * 100) / RING_STEPS
        }%, var(${MODES[i + 1].color}))`,
    ),
  ),
  // Lands on the last pack itself rather than stopping just short of it.
  `var(${MODES[MODES.length - 1].color})`,
];

const RING_PATH = RING_RAMP.length * RING_SPAN;

/**
 * How brightly each piece is allowed to burn, by how close it sits to the
 * point the line is born and dies.
 *
 * Both ends of the ramp meet at the bottom midpoint, so without this the line
 * springs into existence already at full strength and is cut off at full
 * strength — a bright nick appearing and vanishing on one spot. Holding the
 * pieces nearest each end below full turns that into a swell: the line
 * gathers as it leaves the bottom and thins back out as it returns.
 *
 * EDGE_FLOOR is why it does not go all the way to zero, and it is not a
 * softening of the softening. At zero the bottom midpoint is the one place on
 * the button that NEVER takes colour — not dim at the start and bright later,
 * but permanently unlit, because the ceiling is a property of where a piece
 * is rather than of when. A dead notch, sitting exactly where the eye is
 * drawn to watch the line arrive.
 *
 * Sliding the birth point sideways does not fix that: the dim stretch is
 * centred on wherever the birth point is, so it slides with it. Only lifting
 * the floor fixes it. At EDGE_FLOOR the midpoint is lit enough to read as
 * part of the line — the bloom carries it further — while still arriving far
 * below the body's full strength, which is all the softness was ever for.
 *
 * The two numbers pull against each other and are worth tuning as a pair.
 * The floor is how lit the midpoint gets; the length is how gently the line
 * reaches full strength. Raising the floor colours the midpoint better and
 * makes the arrival abrupter, because there is less climb left to do —
 * shortening the ramp does the same thing twice over. Both were moved at
 * once in the commit before this and the entrance came out harder than it
 * had ever been: 0.35 appearing over only 58px is close to a pop.
 *
 * So the length goes past where it started rather than back to it, and the
 * floor comes down to the least that still reads: ~116px to climb, from a
 * fifth of full. Smoothstep rather than a straight ramp, so the brightness
 * eases off its ceiling instead of turning a corner — a linear taper still
 * reads as an edge, just a slanted one.
 */
const EDGE_PIECES = 64;
const EDGE_FLOOR = 0.22;

function edgeOpacity(i: number): number {
  const t = Math.min(1, Math.min(i, RING_RAMP.length - 1 - i) / EDGE_PIECES);
  const eased = t * t * (3 - 2 * t);
  return +(EDGE_FLOOR + (1 - EDGE_FLOOR) * eased).toFixed(3);
}

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
          {/* Sweeps once when the deck deals itself in, once more when you
              tap, and holds still the rest of the time — see .pick-me__ring.
              Undefined is the resting state, not a third animation. */}
          <g
            data-sweep={picked ? "pick" : dealing ? "deal" : undefined}
            filter="url(#pick-me-glow)"
            mask="url(#pick-me-outside)"
          >
            {RING_RAMP.map((colour, i) => (
              <rect
                key={i}
                pathLength={RING_PATH}
                style={{
                  stroke: colour,
                  ["--seg" as string]: i,
                  ["--edge" as string]: edgeOpacity(i),
                }}
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
