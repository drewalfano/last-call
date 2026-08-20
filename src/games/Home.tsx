import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { MODES, type ModeId } from "../data/modes";
import { SettingsButton, SettingsSheet } from "../components/Settings";
import { RosterBar } from "../components/RosterBar";
import { categoryStyle } from "../lib/style";
import { DeckFace } from "../components/DeckFace";

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
 * THE RING'S OWN ORDER, WHICH IS NOT THE DECK'S, AND IS SOLVED RATHER THAN
 * CHOSEN.
 *
 * It used to be the order the cards sit in on Home. That reads as the tidy
 * answer and it is picked for a different job: the deck is ordered by how much
 * replay a pack has, which has nothing to do with what its colour does next to
 * another pack's. The ring is a gradient. What it wants is neighbours that are
 * near each other.
 *
 * So this is a bottleneck tour: of every way of arranging the eleven into a
 * loop, the one whose WORST neighbouring pair is as good as possible. Measured
 * as the largest single rgb step between two abutting sub-segments once the
 * pair is blended over RING_STEPS, which is what "I can see a band" actually
 * is. The deck order's worst pair steps 36.2; this one steps 10.1, and the
 * average step falls from 8.4 to about 5. That is the whole of the smoothness
 * and it costs nothing — no extra sub-segments, no extra nodes, just a better
 * route through the same eleven colours.
 *
 * The loop is CUT at Ride the Bus, and the cut is the only free choice left
 * once the tour is fixed — every adjacency is already decided, so all it picks
 * is which pack sits on the seam. Ride the Bus is the lightest pack in the
 * app, and the seam is the bottom midpoint, where the line is dimmest as it
 * gathers and thins. Its two neighbours round the loop step 8.1 and 6.4, so
 * the roughest joins are nowhere near the place the eye is waiting.
 *
 * Sorting by lightness was the version before this and it was the wrong
 * objective. It put the two brightest packs on the ends, which mattered while
 * the ends were permanently dim — and once the sweep started overshooting the
 * midpoint (see RING_SWEEP) they are not. What it also did was strand Same
 * Page next to Ride the Bus at the seam, and gold to pale blue is the worst
 * pair in the palette: near enough opposite on the hue wheel, 36.2 a step, sat
 * exactly on the start line. Solving for the wrong thing put the palette's
 * roughest join in its most-watched spot.
 */
const RING_ORDER: ModeId[] = [
  "ride-the-bus",
  "the-number-game",
  "last-call",
  "most-likely-to",
  "kings-cup",
  "last-word",
  "drink-if",
  "say-the-same-thing",
  "imposter",
  "hot-seat",
  "rank-it",
  // Closed: back onto the pack it started from. ELEVEN transitions now, not
  // ten, and the wrap is the whole point rather than an oversight. The line is
  // born and dies at the same spot on the pill, so with an open ramp those two
  // points are different colours butted against each other — a hue seam
  // sitting exactly where the eye is waiting for the line to arrive. Ending
  // where it began leaves only a difference in brightness there, which is what
  // the softening was always meant to be.
  //
  // The old comment here warned that wrapping invents a twelfth colour, and it
  // was right about the ORDER it was describing: brown mixed toward red lands
  // on a dark muddy red that is in no pack. Gold back to gold mixes with
  // itself.
  "ride-the-bus",
];

const RING_COLOURS = RING_ORDER.map(
  (id) => MODES.find((mode) => mode.id === id)!.color,
);

/**
 * The packs blended into each other along that order.
 */
const RING_RAMP = [
  ...RING_COLOURS.slice(0, -1).flatMap((colour, i) =>
    Array.from(
      { length: RING_STEPS },
      (_, step) =>
        // oklch, and the CH is the whole point: it is polar, so the mix walks
        // hue ROUND the wheel at full chroma instead of cutting across the
        // middle of it. srgb was the first attempt and dips through grey;
        // oklab was the second and dips just as hard — measured, every one of
        // the pairs lost most of its colour at the midpoint, worst of them
        // Kings Cup to Ride the Bus at chroma 176 down to 24. That is what a
        // straight line between two saturated colours does: it passes near the
        // achromatic axis. Bright packs separated by grey sags is exactly what
        // "I can see the steps" looks like, and no number of extra steps fixes
        // it, because the sag is IN the ramp rather than between its pieces.
        //
        // Going round keeps the chroma up the whole way. The hues it passes
        // through are the short way between two packs, which on this palette
        // is mostly other packs' hues — navy to gold goes purple, magenta,
        // red, orange rather than through mud.
        `color-mix(in oklch, var(${colour}) ${
          100 - (step * 100) / RING_STEPS
        }%, var(${RING_COLOURS[i + 1]}))`,
    ),
  ),
  // Lands on the last pack itself rather than stopping just short of it.
  `var(${RING_COLOURS[RING_COLOURS.length - 1]})`,
];

const RING_PATH = RING_RAMP.length * RING_SPAN;

/**
 * THE SWEEP IS LONGER THAN THE RING, AND THAT IS THE WHOLE FIX.
 *
 * Every version of this before now ran exactly one lap: the line was born at
 * the bottom midpoint and died there, so the softening at each end had nowhere
 * to be except ON that point. That is what made the patch unkillable rather
 * than merely badly tuned — the ceiling was a property of WHERE a piece sat, so
 * the pieces at the midpoint were dim at the start, dim in the middle and dim
 * at the end. Moving the floor, the curve or the length all move the same
 * problem around. The place the eye is waiting is the one place the line could
 * never be bright.
 *
 * So the line starts EDGE_PIECES before the midpoint and finishes EDGE_PIECES
 * after it. It gathers on the approach, crosses the midpoint at full strength,
 * runs the ring, comes back round and crosses at full strength a second time,
 * and only then thins out. The runway is before the start line going in and
 * after it coming out, which is what a runway is.
 *
 * The stretch either side of the midpoint is therefore drawn TWICE — once dim
 * as the line is born or dying, once bright as it passes through — and the two
 * visits are a lap apart, so nothing composites. Position and time have come
 * apart, which is why a piece now carries both: `--seg` is where it sits and
 * `--beat` is when it lights. They used to be the same number.
 *
 * It costs the extra travel, honestly: the sweep is a lap plus two runways, so
 * the flourish runs longer than a lap by exactly the amount it overshoots.
 */
const EDGE_ARC = 0.04;
const EDGE_PIECES = Math.round(RING_RAMP.length * EDGE_ARC);
const RING_SWEEP = RING_RAMP.length + EDGE_PIECES * 2;

/**
 * How brightly each beat is allowed to burn, by how near it is to the start or
 * the end of the SWEEP — not by where it sits on the ring. Nothing at the
 * first beat, full by the end of the runway, and the same in reverse coming
 * out: the line fades up out of the ring and back down into it.
 *
 * Without it the line springs into existence at full strength and is cut off
 * at full strength: a bright nick appearing on one spot. Holding the beats
 * nearest each end below full turns that into a swell, the line gathering as
 * it comes up on the midpoint and thinning out after it has gone past.
 *
 * THE CURVE IS EASE-OUT, NOT SMOOTHSTEP. Smoothstep is flat at BOTH ends, and
 * the flat end that mattered was the one nobody was looking at: at the foot the
 * ceiling left the floor so slowly that the first few beats ran 0.220 → 0.229
 * and never climbed at all. Only the top of the ramp needs easing, where it
 * meets full brightness and a corner would read as an edge. The foot is the
 * birth of the line, where it is honestly a dot — there is nothing there to
 * ease into.
 *
 * IT GOES ALL THE WAY TO NOTHING, and there is no floor under it any more.
 *
 * There used to be an EDGE_FLOOR of 0.22, and it was never about how the fade
 * should look — it was a brace against the sweep running exactly one lap. With
 * one lap the ceiling was a property of WHERE a piece sat, so a floor of zero
 * did not mean "the line fades in", it meant the bottom midpoint was the one
 * place on the button that never took colour at all: a permanent dead notch
 * rather than a soft arrival. The floor held it just barely lit to hide that.
 *
 * Overshooting the midpoint removed the thing the floor was bracing. Every
 * seat is now crossed at full strength during the lap, the run-up included, so
 * zero at the first beat costs nothing — the line simply is not there yet, and
 * the ring it is not-there-on gets painted brightly a moment later anyway. A
 * workaround outliving its problem is worth deleting rather than tuning, so
 * the constant is gone and the curve is the whole of it: 0 to 1, ease-out.
 *
 * EDGE_ARC is the only number left here. It is how far the line travels
 * appearing and disappearing — and now also how far before the
 * midpoint it starts and how far past it it runs on. A fraction of the
 * perimeter rather than a count of pieces, because a count silently changed
 * length when the colour order gained a transition: 64 pieces of 321 is 146px
 * of arc and 64 pieces of 353 is 132px. The runway is the thing the eye reads
 * directly, so it is written as arc and the count follows.
 *
 * 0.04 is ~29px of run-up and the same of run-out. It reads as much longer
 * than the number suggests, because none of it is shared with the lap any
 * more: it used to be a fade laid ON the ring's first and last stretch, and it
 * is now travel the line does before the start line and after it. A short
 * gather is enough to close the loop in the head — the swell was never the
 * point, only the fact that the line does not begin at a hard edge.
 *
 * 0.09 is the CEILING on this rather than a suggestion, and the palette sets
 * it. At 0.09 the run-up exactly fills Rank It's yellow, the pack before Ride
 * the Bus on the seam. Past that the first beats — the dimmest ones — reach
 * back into Hot Seat's brown, the darkest pack in the app, and the birth stops
 * reading at all: the same fault the old order had at the death end, arriving
 * from the other side.
 */
function edgeOpacity(beat: number): number {
  const t = Math.min(1, Math.min(beat, RING_SWEEP - 1 - beat) / EDGE_PIECES);
  return +(1 - (1 - t) * (1 - t)).toFixed(3);
}

/**
 * Where a beat sits on the ring. Beat EDGE_PIECES is the bottom midpoint —
 * everything before it is the run-up, everything past the lap is the run-out,
 * and both wrap round to seats that the middle of the sweep also visits.
 */
function ringSeat(beat: number): number {
  const n = RING_RAMP.length;
  return (((beat - EDGE_PIECES) % n) + n) % n;
}

/** The sweep as it is drawn: one rect per beat, each seated on the ring. */
const RING_BEATS = Array.from({ length: RING_SWEEP }, (_, beat) => ({
  beat,
  seat: ringSeat(beat),
  edge: edgeOpacity(beat),
}));


/**
 * THE GLOW IS FED A COARSER LINE THAN THE ONE YOU SEE.
 *
 * All 353 beats used to sit inside the filter, so every frame rasterised that
 * many full-perimeter dashed paths into an offscreen buffer before blurring
 * them. An svg filter is not GPU-accelerated on iOS; that was the stutter.
 *
 * The blur is still a real blur, just given less to chew on: a coarse copy
 * drawn from every HALO_EVERY-th beat goes through the filter, and the sharp
 * line is drawn separately, outside it. What coarseness costs is colour detail
 * inside a bloom, and destroying that detail is what blurring IS.
 *
 * A coarse beat is one dash EIGHT units long standing where its eight sharp
 * ones stand, rather than one unit on a path measured in eighths. Those are
 * the same picture only when the ramp divides by eight, which 353 does not —
 * the old halo tiled 45 units over a 353-unit ring and crept a little further
 * out of register with every pack. Same units for both copies, no drift, and
 * `--step` is gone with it: each beat now carries the beat number it is timed
 * to, so the coarse copy cannot race the line it stands for.
 */
const HALO_EVERY = 8;
const HALO_BEATS = RING_BEATS.filter((_, beat) => beat % HALO_EVERY === 0);

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
 *
 * THE LAP IS THE TUNED NUMBER, AND THE PER-PIECE STEP FOLLOWS FROM IT. It used
 * to be the other way round — a step of 4ms written down, and the lap whatever
 * that came to. That is fine until the ramp changes length: closing the order
 * back onto its first pack added a transition, 321 pieces became 353, and a
 * fixed step would have quietly slowed the line by 7% and stretched the sweep
 * past the timeout that retires the ring. Nothing about how the flourish reads
 * is a property of one piece. It is how long the line takes to run the ring,
 * which is 1280ms dealt and 960ms tapped either way. The SWEEP is longer than
 * the lap, because the line overshoots the midpoint at both ends — see
 * RING_SWEEP — so the two are no longer the same duration and the timeout that
 * retires the ring waits on the sweep.
 */
/**
 * How long the deck takes to finish dealing itself out.
 *
 * `deck-deal` is 620ms and each card is held back by 46ms times its `--i`,
 * which counts DOWN the deck — the bottom card leaves first so that every
 * card's bottom edge is already covered when it lands. Last Call is therefore
 * the LAST one to arrive, not the first, at 10 x 46 + 620.
 *
 * A number here because the beat below is measured from the end of the deal
 * and a timeout cannot read a stylesheet. It has to agree with
 * .home__deck--dealing to the frame.
 */
const DECK_DEAL_MS = (MODES.length - 1) * 46 + 620;

/**
 * The beat of stillness before the line runs, measured FROM THE END OF THE
 * DEAL rather than from the screen mounting.
 *
 * It used to be a flat 720ms from mount, which put the ring's first piece 360ms
 * before the last card had landed — the beat was not a beat at all, it was an
 * overlap, and the two events read as one thing arriving on top of itself.
 * Three quarters of a second after the deck has actually settled is what makes
 * it a beat: the cards land, everything stops, and only then does the button
 * offer. The number is short enough to feel like a pause rather than a wait,
 * and it is measured from the deal so it stays that way if the deal is retimed.
 *
 * A number here rather than `--dur-slow + --dur-base` in the stylesheet, which
 * is what it used to be. Those two happened to add to 720 and had nothing to
 * do with each other or with this: one is how long `screen-in` takes and the
 * other is longer than that on purpose, so the ring starts once the screen has
 * visibly SETTLED rather than as the title lands. Spelling it as a sum of two
 * unrelated tokens meant the delay moved whenever either was tuned, and meant
 * this constant — which is also what retires the ring from the DOM — had to be
 * kept in step by hand. It reaches the stylesheet as `--deal-delay` now, like
 * every other number in the flourish.
 */
const DEAL_DELAY_MS = DECK_DEAL_MS + 750;
const DEAL_LAP_MS = 1280;
const DEAL_LIFE_MS = 515;
const DEAL_STEP_MS = DEAL_LAP_MS / RING_RAMP.length;
const DEAL_SWEEP_MS = (RING_SWEEP - 1) * DEAL_STEP_MS + DEAL_LIFE_MS;

const PICK_LAP_MS = 960;
const PICK_LIFE_MS = 340;
const PICK_STEP_MS = PICK_LAP_MS / RING_RAMP.length;
const PICK_SWEEP_MS = (RING_SWEEP - 1) * PICK_STEP_MS + PICK_LIFE_MS;


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
export function Home({ onPick, returning }: HomeProps) {
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
  /** The card that is on its way DOWN — see .deck-card[data-settling]. */
  const [settling, setSettling] = useState<ModeId | null>(null);
  const wasReturning = useRef<ModeId | null>(null);
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
  /**
   * THE CARD FALLS WHEN THE COLOUR GOES, ON THE SAME SIGNAL.
   *
   * Home used to time this itself: App said how long the contraction would
   * take and a timeout here dropped the card when it was up. Two independent
   * clocks aimed at the same instant, which is a race — a frame either way
   * and you get the card sitting raised with nothing over it, or starting to
   * fall while the colour is still on it. Right on the seam between the two
   * halves, which is the one place it shows.
   *
   * There is no second clock now. App retires the overlay and `returning`
   * goes null in the same commit, so the colour leaving and the card being
   * released are not two events that agree — they are one event.
   *
   * AND IT IS A LAYOUT EFFECT, WHICH IS THE DIFFERENCE BETWEEN THE CARD BEING
   * LOWERED AND BEING DROPPED. A plain effect runs after the browser has
   * painted, so the order was: `data-returning` comes off, the browser starts
   * the transform transition — finding nothing but `.deck-card`'s own rule,
   * which is var(--dur-press), the BUTTON PRESS — and only then does
   * `data-settling` arrive to say how the fall should go. The card was
   * launching on a 120ms press curve and being corrected mid-flight. That is
   * the slam. Running before paint, the attribute is there when the
   * transition is computed, so it never starts on the wrong one.
   */
  useLayoutEffect(() => {
    const previous = wasReturning.current;
    wasReturning.current = returning ?? null;
    if (previous && !returning) setSettling(previous);
  }, [returning]);

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
              ["--deal-delay" as string]: DEAL_DELAY_MS,
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
                ["--path" as string]: RING_PATH,
                ["--dash" as string]: HALO_EVERY,
                ["--stroke" as string]: 3,
              }}
              filter="url(#pick-me-glow)"
              mask="url(#pick-me-outside)"
            >
              {HALO_BEATS.map(({ beat, seat, edge }) => (
                <rect
                  key={beat}
                  pathLength={RING_PATH}
                  style={{
                    stroke: RING_RAMP[seat],
                    ["--seg" as string]: seat,
                    ["--beat" as string]: beat,
                    ["--edge" as string]: edge,
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
              {RING_BEATS.map(({ beat, seat, edge }) => (
                <rect
                  key={beat}
                  pathLength={RING_PATH}
                  style={{
                    stroke: RING_RAMP[seat],
                    ["--seg" as string]: seat,
                    ["--beat" as string]: beat,
                    ["--edge" as string]: edge,
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
            data-returning={returning === mode.id || undefined}
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
            <DeckFace mode={mode} />
          </button>
        ))}
      </nav>

      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
