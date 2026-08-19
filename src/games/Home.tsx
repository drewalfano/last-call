import { useCallback, useEffect, useRef, useState } from "react";
import { MODES, type ModeId } from "../data/modes";
import { SettingsButton, SettingsSheet } from "../components/Settings";
import { RosterBar } from "../components/RosterBar";
import { categoryStyle } from "../lib/style";

interface HomeProps {
  /** The rect lets App expand the mode's color out from the card you tapped. */
  onPick: (id: ModeId, rect?: { top: number; left: number; right: number; bottom: number }) => void;
  /**
   * A mode that is closing back into its card, which arrives RAISED.
   *
   * Home mounts underneath the closing overlay, so this happens with nothing
   * visible: the card is already lifted out of the stack by the time the
   * colour has finished contracting onto it. App measures that lifted rect —
   * which is why the raise carries no transition of its own, see
   * .deck-card[data-returning]. A card easing upward while it is being
   * measured is a moving target.
   */
  returning?: ModeId | null;
  /**
   * How long the colour takes to contract, so the card knows when to drop.
   *
   * Passed rather than shared through a module, because the number belongs to
   * the animation App is running and Home only has to agree with it. A
   * constant in a third file would be a third place to change.
   */
  settleAfter?: number;
}


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
 * Picking for you happens in two beats, and the first one exists so you can
 * see the app decide.
 *
 * RING_MS is that beat: the button says "Picking…", the line races round it,
 * and NOTHING else moves. It has to come first because the reveal scrolls the
 * chosen card into view, and on a deck eleven cards long that carries the
 * button off the top of the screen — so the flourish that says the app is
 * choosing used to be dragged out of sight the instant it started.
 *
 * REVEAL_MS is a hold AFTER the scroll has stopped, not a guess at how long
 * the scroll takes. That distinction is the whole of the second beat: the
 * launch reads the chosen card's rect to expand its colour from, and a smooth
 * scroll of unknown length was still moving when it did. The overlay grew from
 * where the card had been while the card carried on — and a scroll animation
 * and a 520ms clip-path ran against each other for the overlap. Tapping a card
 * directly has neither problem, which is exactly why it felt better.
 *
 * So the open is no longer at a fixed fraction of the lap. It cannot be: it
 * waits on a scroll whose length depends on how far down the deck the pick
 * landed. Near the top it opens around three quarters through, at the bottom
 * nearer the end. The line is still running either way, which was the point of
 * asking for it.
 */
const RING_MS = 603;
const REVEAL_MS = 240;

/**
 * The two sweeps. Both reach the stylesheet as custom properties, so this file
 * is the only place the flourish is described and the two cannot drift.
 */
const DEAL_DELAY_MS = 420;
const DEAL_STEP_MS = 4;
const DEAL_LIFE_MS = 515;
const DEAL_SWEEP_MS = (RING_RAMP.length - 1) * DEAL_STEP_MS + DEAL_LIFE_MS;

const PICK_STEP_MS = 3;
const PICK_LIFE_MS = 340;
const PICK_SWEEP_MS = (RING_RAMP.length - 1) * PICK_STEP_MS + PICK_LIFE_MS;

/**
 * THE GLOW IS FED A COARSER LINE THAN THE ONE YOU SEE.
 *
 * All 321 pieces used to sit inside the filter, so every frame rasterised 321
 * full-perimeter dashed paths into an offscreen buffer before blurring them.
 * An svg filter is not GPU-accelerated on iOS; that was the stutter.
 *
 * The blur is still a real blur, just given less to chew on: a coarse copy
 * drawn from every HALO_EVERY-th piece goes through the filter, and the sharp
 * line is drawn separately, outside it. What coarseness costs is colour detail
 * inside a bloom, and destroying that detail is what blurring IS.
 */
const HALO_EVERY = 8;
const HALO_RAMP = RING_RAMP.filter((_, i) => i % HALO_EVERY === 0);

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
 * How long the returning card takes to lower itself into the slot.
 *
 * Matches --dur-base, which is what .deck-card[data-settling] transitions on.
 * A number here because a timeout cannot read a custom property, and the two
 * only have to agree to the frame.
 */
const SETTLE_MS = 260;

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
export function Home({ onPick, returning, settleAfter = 0 }: HomeProps) {
  /** True only on the first Home of the session. Claims it as it reads it. */
  const [dealing] = useState(() => {
    const first = !dealt;
    dealt = true;
    return first;
  });
  const [picked, setPicked] = useState<ModeId | null>(null);
  /**
   * Which card has been LIFTED, which is not the same question as which one
   * has been picked.
   *
   * `picked` has to be set the instant you tap: it disables the button, turns
   * the label to "Dealing…" and starts the ring. The lift must not be, and
   * sharing the one flag is why it was — the chosen card rose out of the deck
   * immediately, giving the answer away while the ring was still supposedly
   * working it out, and leaving the delay before the mode opened looking like
   * lag rather than deliberation.
   *
   * Set with the scroll instead, on the second beat, so the sequence reads:
   * the app thinks, the card comes up, the mode opens.
   */
  const [revealed, setRevealed] = useState<ModeId | null>(null);
  /**
   * The ring is in the DOM only while it has something to do.
   *
   * This is the difference between an animation costing something and a
   * SCREEN costing something. Left mounted, several hundred stroked paths sit
   * on Home for the rest of the session, and every repaint pays for them —
   * scrolling the deck, and the launch expansion that plays while Home is
   * still mounted underneath it. That is why the lag was never confined to
   * the button: the button was making the whole screen expensive to draw.
   *
   * Unmounted once the sweep is spent, Home costs exactly what it did before
   * any of this existed.
   */
  const [sweeping, setSweeping] = useState(dealing);
  const [settingsOpen, setSettingsOpen] = useState(false);
  /**
   * THE CARD COMING BACK, AND WHETHER IT IS STILL HELD UP.
   *
   * True from the moment Home mounts under a closing overlay until the colour
   * has finished contracting onto the card, at which point the card drops into
   * the slot and takes its writing with it — see .deck-card[data-returning].
   *
   * Home times this rather than App, because the card is Home's. App owns the
   * overlay and tells Home how long it will be; the two only have to agree on
   * one number, which is why it arrives as a prop.
   */
  const [held, setHeld] = useState<ModeId | null>(returning ?? null);
  /**
   * The card on its way DOWN, which is a different state from being held up.
   *
   * It exists only so the fall can have a transition of its own. Without it
   * the card takes `.deck-card`'s, which is the press — 120ms on a curve
   * built to be over before you see it — and the drop snapped rather than
   * settled. See .deck-card[data-settling].
   */
  const [settling, setSettling] = useState<ModeId | null>(null);
  const deckRef = useRef<HTMLElement>(null);
  const timer = useRef<number>(undefined);
  const raf = useRef<number>(undefined);

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
    setPicked(mode.id);

    /**
     * BOTH BEATS ARE THE FLOURISH, SO BOTH GO WITH IT.
     *
     * The two waits below exist to be watched: RING_MS is how long the line
     * takes to run round the button, and REVEAL_MS is a hold so you can see
     * which card came up before its colour takes the screen. Neither is doing
     * anything a player needs — the mode opens on exactly the same card either
     * way.
     *
     * Under reduced motion the stylesheet has already frozen the ring
     * (.pick-me__ring in games.css), so the waits were being spent on a still
     * image: about 850ms of a dead button reading "Picking…", which reads as
     * the app having hung rather than as it deciding.
     *
     * The scroll goes instant too, and that is what lets the settle poll go
     * entirely. The poll exists to find the end of a SMOOTH scroll; with no
     * animation to outlast, the rect is right on the next line.
     *
     * Same question, same answer as App's launch overlay — see the check in
     * App.tsx, which this deliberately mirrors rather than inventing a second
     * mechanism for.
     */
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(mode.id);
      el.scrollIntoView({ block: "center", behavior: "auto" });
      openCard(mode.id, el);
      return;
    }

    // Beat one: the ring, on a screen that is holding still.
    timer.current = window.setTimeout(() => {
      setRevealed(mode.id);
      el.scrollIntoView({ block: "center", behavior: "smooth" });

      /**
       * Beat two waits for the scroll to actually stop before it opens.
       *
       * Polled rather than listening for `scrollend`, which does not fire at
       * all when the card was already in view — the common case near the top
       * of the deck, and one that would then sit on a fallback timeout for no
       * reason. Three unchanged frames settles that case in ~50ms and a long
       * scroll whenever it genuinely finishes.
       */
      const scroller = el.closest(".screen");
      const startedAt = performance.now();
      let last = -1;
      let still = 0;
      let moved = false;
      const settled = () => {
        const top = scroller?.scrollTop ?? 0;
        if (top === last) {
          still += 1;
        } else {
          if (last !== -1) moved = true;
          still = 0;
          last = top;
        }
        /**
         * Three unchanged frames is not enough on its own: a smooth scroll can
         * take a frame or two to START, and "has not begun" looks exactly like
         * "has finished". So either it has moved and then stopped, or enough
         * time has passed that it was never going to move — which is the
         * ordinary case for a card already in view near the top of the deck,
         * and one that must not sit on a timeout waiting for a scroll that is
         * not coming.
         */
        if (still < 3 || !(moved || performance.now() - startedAt > 140)) {
          raf.current = requestAnimationFrame(settled);
          return;
        }
        // Only now is the rect the launch reads the one the card is at.
        timer.current = window.setTimeout(() => openCard(mode.id, el), REVEAL_MS);
      };
      raf.current = requestAnimationFrame(settled);
    }, RING_MS);
  }, [picked, onPick, openCard]);

  /**
   * Whichever beat is pending when Home goes, goes with it. Both share the one
   * ref, so clearing it once is enough — and it matters more now the wait is a
   * chain: a timer that outlived the screen would open a mode nobody asked for.
   */
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      if (raf.current) cancelAnimationFrame(raf.current);
    },
    [],
  );

  /**
   * Drop the returning card once the colour has finished arriving on it.
   *
   * The whole point of the hold is that the card is still MOVING when its
   * title, tagline and stroke come up — the overlay dissolves on this same
   * beat, so the writing cross-fades in rather than appearing on something
   * that has already stopped. That was the fault with every version of this
   * before the card was allowed to move at all.
   */
  useEffect(() => {
    if (!held) return;
    const t = window.setTimeout(() => {
      setHeld(null);
      setSettling(held);
    }, settleAfter);
    return () => window.clearTimeout(t);
  }, [held, settleAfter]);

  /* And released again once it is down, so the card goes back to carrying
     nothing but its press. SETTLE_MS is --dur-base; the two only have to
     agree to the frame, and the attribute outstaying the transition by a
     little costs nothing while ending early would cut the fall short. */
  useEffect(() => {
    if (!settling) return;
    const t = window.setTimeout(() => setSettling(null), SETTLE_MS);
    return () => window.clearTimeout(t);
  }, [settling]);

  // Retire the ring the moment its last piece has gone out.
  useEffect(() => {
    if (!sweeping) return;
    // A margin past the last frame, so the unmount can never be what ends the
    // animation. Landing on the same millisecond is a race the fade can lose.
    const t = window.setTimeout(() => setSweeping(false), DEAL_DELAY_MS + DEAL_SWEEP_MS + 250);
    return () => window.clearTimeout(t);
  }, [sweeping]);

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
        {(picked || sweeping) && (
          <svg
            className="pick-me__ring"
            style={{
              ["--deal-step" as string]: DEAL_STEP_MS,
              ["--deal-life" as string]: DEAL_LIFE_MS,
              ["--deal-total" as string]: DEAL_SWEEP_MS,
              ["--pick-step" as string]: PICK_STEP_MS,
              ["--pick-life" as string]: PICK_LIFE_MS,
              ["--pick-total" as string]: PICK_SWEEP_MS,
            }}
            aria-hidden="true"
          >
            <defs>
              {/* Blur only — no SourceGraphic in the merge, because the sharp
                  line is no longer inside this filter. Laid down twice for a
                  centre bright enough to read as light rather than as
                  something out of focus.

                  The region is sized to the blur and not a pixel further, and
                  that is a frame-rate decision rather than a tidiness one: an
                  svg filter is not GPU-accelerated on iOS and its cost tracks
                  the AREA it recomputes every frame. It was -25%/-150%/150%/
                  400%, about 537x240 on a 358x60 button — six times what a
                  stdDeviation of 4 needs, whose bloom reaches roughly 12px.
                  Trim it below that and the blur meets the edge of its own
                  box, which draws a straight line across the glow. */}
              <filter
                id="pick-me-glow"
                x="-5%"
                y="-28%"
                width="110%"
                height="156%"
                colorInterpolationFilters="sRGB"
              >
                <feGaussianBlur stdDeviation="4" result="bloom" />
                <feMerge>
                  <feMergeNode in="bloom" />
                  <feMergeNode in="bloom" />
                </feMerge>
              </filter>

              {/* The bloom is a blur, so half of it lands inside the pill,
                  where it washes over the label and reads as the button lit
                  from within. This punches the interior out of it. The hole is
                  the PADDING box, so the 2px band the line occupies survives
                  and only what the blur threw further in is cut. */}
              <mask
                id="pick-me-outside"
                maskUnits="userSpaceOnUse"
                x="-5%"
                y="-28%"
                width="110%"
                height="156%"
              >
                <rect className="pick-me__mask-all" />
                <rect className="pick-me__mask-hole" />
              </mask>
            </defs>

            {/* Into the filter: a coarse copy, one piece per HALO_EVERY. */}
            <g
              className="pick-me__halo"
              data-sweep={picked ? "pick" : "deal"}
              style={{
                ["--path" as string]: HALO_RAMP.length,
                ["--step" as string]: HALO_EVERY,
                ["--stroke" as string]: 3,
              }}
              filter="url(#pick-me-glow)"
              mask="url(#pick-me-outside)"
            >
              {HALO_RAMP.map((colour, j) => (
                <rect
                  key={j}
                  pathLength={HALO_RAMP.length}
                  style={{
                    stroke: colour,
                    ["--seg" as string]: j,
                    ["--edge" as string]: edgeOpacity(j * HALO_EVERY),
                  }}
                />
              ))}
            </g>

            {/* Outside it: the line you actually read, at full resolution and
                costing nothing but its own paint. */}
            <g
              className="pick-me__line"
              data-sweep={picked ? "pick" : "deal"}
              style={{ ["--path" as string]: RING_PATH }}
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
        )}
        <span className="pick-me__label">
          {picked ? "Picking…" : "Pick a game for me"}
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
            data-picked={revealed === mode.id || undefined}
            /* Held up while the closing colour lands on it, then dropped —
               and the fall is its own state, because it needs its own
               transition. See .deck-card[data-settling]. */
            data-returning={held === mode.id || undefined}
            data-settling={settling === mode.id || undefined}
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
