import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { MODE_BY_ID, type ModeId } from "./data/modes";
import { SHELL_TOKEN, useAppBackground } from "./lib/appBackground";
import { categoryStyle } from "./lib/style";
import { DeckFace } from "./components/DeckFace";
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
 * HOW LONG THE CARD'S WRITING STAYS AT FULL STRENGTH ON THE WAY IN, and
 * how long it then takes to clear.
 *
 * The close has the mirror of this pair — FACE_FROM_MS — and the two are
 * deliberately not symmetrical, because the jobs are not. Closing, the
 * writing ARRIVES: it is absent for most of the contraction and comes up
 * at the end, on the card, so there is something for the colour to hand
 * over to. Opening, it LEAVES: it is there from the first frame, because
 * the whole fault being fixed is that it used to be gone from the first
 * frame.
 *
 * So it holds through most of the expansion and clears near the end.
 * 340ms is about 65% of the way, by which point the clip has passed well
 * beyond the card's rect and the writing is a small label in a large
 * field of colour rather than a card's title — which is the moment it
 * stops meaning anything and starts being a thing left behind.
 *
 * The 150ms it takes to go is longer than it looks. It is spent while
 * the colour is still growing, so what the eye follows is the expansion,
 * not the fade; a shorter clear reads as the title being snatched.
 *
 * It is gone by 490ms, leaving 30ms of flat colour before the screen
 * swaps underneath. That gap is deliberate — the swap should land on a
 * plain field, not on the tail of something still clearing.
 */
const FACE_HOLD_MS = 340;
const FACE_FADE_MS = 150;

/**
 * CLOSING GOES BACK INTO THE CARD IT CAME OUT OF.
 *
 * The colour contracts to the rect of that mode's card on Home, which is the
 * launch run the other way — and the reason it can be is that the rect is
 * MEASURED rather than remembered.
 *
 * That distinction is the whole trick. A remembered rectangle is worthless
 * here: Home is unmounted for as long as a mode is up, and the deck it comes
 * back with may sit at a different scroll offset than the one you left. But
 * the close already swaps the screen back to Home underneath an opaque
 * overlay — so by the time this animation is set up, the real card is in the
 * real DOM, at its real position, with nothing visible yet. Ask it where it
 * is. See the effect on `closing`.
 *
 * IT IS SHORTER THAN THE WAY IN, AND THAT ASYMMETRY IS THE POINT. Opening is
 * an invitation and can afford 520ms. The X is a reflex — pressed to get out,
 * by someone who opened the wrong mode or whose round has just ended — and
 * every pass-the-phone handoff in this app already spends --dur-slow on a card
 * flip. Long enough to read as travel, quick enough to agree with you.
 *
 * Not a token: this is the launch's own pair of numbers, and like LAUNCH_MS it
 * describes one animation that lives here and nowhere else.
 */
const CLOSE_MS = 320;

/**
 * AND IT DOES NOT TAKE THE LAUNCH'S CURVE, WHICH IS THE THING THAT MADE THE
 * FIRST VERSION OF THIS FEEL BROKEN.
 *
 * LAUNCH_EASE is decisive-then-a-long-settle, and that is right for opening:
 * the settle is a field of colour arriving at the edges of the screen, where
 * there is nothing to look at and a soft landing costs nothing.
 *
 * Contracting, the settle lands on a 124px card in the middle of the deck —
 * exactly where the eye is. Measured on the first build: 48% of the distance
 * covered by 60ms, 85% by 120ms, and then 260ms spent crawling the last 15%
 * at about two pixels a frame. The movement was over in a third of the
 * duration and the rest was a stationary block slowly fading, which is what
 * "janky" turned out to mean — not dropped frames, a budget spent on nothing.
 *
 * --ease-glide is the token for this and says so in tokens.css: for motion
 * that should read as TRAVEL rather than as arrival, where --ease-out is
 * "~95% done by the halfway point, so the movement itself is over before you
 * have seen it". A contraction is travel. Written out rather than read from
 * the custom property because this is driven from the Web Animations API,
 * which takes a string; it is the same curve.
 */
const CLOSE_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

/**
 * WHEN THE COLOUR STARTS CLEARING, so that it has finished by the time the
 * contraction has.
 *
 * The close is two movements and they do not overlap. First the colour
 * contracts onto the card where it is HELD — raised out of the stack, as
 * though it had been drawn and were being put back — and clears as it lands.
 * Then, and only then, the card drops into the slot.
 *
 * THIS WINDOW IS THE GHOST, which is why it is short. For as long as the
 * colour is partly transparent it is sitting exactly on the card, so what you
 * see through it is that card's own writing at reduced contrast — white text
 * read through half a card's worth of its own colour comes out grey. It looks
 * like a smear left behind by the movement and it is nothing of the kind; it
 * is a cross-fade between two things that occupy the same rectangle. The only
 * cure is to spend less time in the middle of it.
 *
 * 55ms, down from 120. Long enough that the card is not revealed in a single
 * frame — which is a pop, and worse — and short enough that the ghost is over
 * before it registers as a state the screen was in.
 *
 * The drop itself is not timed here. It is the card's, and the card is
 * Home's — .deck-card[data-settling] owns how it falls, and Home releases it
 * on the same signal that retires this overlay.
 */
const DISSOLVE_FROM_MS = 265;

/**
 * AND IT HOLDS ITS COLOUR RATHER THAN COASTING DOWN THROUGH THE MIDDLE.
 *
 * Linear spends the same time at every alpha, so half the window is spent
 * somewhere around half transparent — which is precisely where the writing
 * underneath reads worst. Weighted to the end, the field stays near solid for
 * most of the window and then goes, so the values that ghost are passed
 * through quickly instead of being sat in.
 *
 * Not a token: --ease-in is the app's `cubic-bezier(0.65, 0, 0.35, 1)`, which
 * is symmetrical and eases out again at the end — the opposite of what this
 * needs.
 */
const DISSOLVE_EASE = "cubic-bezier(0.7, 0, 1, 1)";

/**
 * THE CARD'S WRITING, CARRIED ON THE COLOUR.
 *
 * The overlay is a flat field, and for most of the way in that is all it needs
 * to be. At the end it is sitting exactly where a card is, and a card has
 * writing on it — so the last stretch shows the name and the tagline coming up
 * ON the colour rather than through it.
 *
 * ON, and that is the whole point of doing it this way. Fading the REAL card's
 * text underneath means reading white type through a half-transparent field of
 * its own colour, which is what greys it out; the earlier passes at this spent
 * their time tuning how briefly that happened rather than avoiding it. Put the
 * writing above the colour and it is never seen through anything.
 *
 * It is a CHILD of the overlay, so when the colour goes it goes too — and that
 * is the hand-off, not a fault. The real card underneath is identical, in the
 * same place, already at full strength: the copy fades out as the colour does
 * and what is left is the card itself. Nothing appears, and nothing pops.
 *
 * 240ms, where the clip is about 96% of the way home — near enough that the
 * writing arrives on something the size and shape of a card rather than
 * floating in a large field of colour.
 */
const FACE_FROM_MS = 240;

/**
 * How long the overlay is given before it is retired regardless.
 *
 * The animation's `onfinish` is the ordinary path; this is the guarantee. A
 * stalled contraction would otherwise leave an opaque sheet of pack colour
 * over the entire app with nothing left to dismiss it — the same failure the
 * live line's exit and Letter Rip's board are both written to avoid, and worse
 * here, because there is no screen underneath to press.
 */
const CLOSE_FAILSAFE_MS = CLOSE_MS + 120;

interface Launch {
  id: ModeId;
  /** Where on screen the tapped card was, in viewport pixels. */
  rect: { top: number; left: number; right: number; bottom: number };
}

export default function App() {
  const [screen, setScreen] = useState<ModeId | null>(null);
  const [launch, setLaunch] = useState<Launch | null>(null);
  /** The mode whose colour is still on screen, contracting, after it closed. */
  const [closing, setClosing] = useState<ModeId | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLDivElement>(null);
  const faceRef = useRef<HTMLDivElement>(null);
  /** The writing riding the expansion out of the card. See FACE_HOLD_MS. */
  const faceInRef = useRef<HTMLDivElement>(null);
  /**
   * WHERE HOME'S DECK WAS STANDING WHEN YOU LEFT IT.
   *
   * Home is unmounted for as long as a mode is up, and .screen.home is the
   * scroller, so it comes back at nought every time — the deck is at the top
   * however far down it you were. What used to put the card back on screen was
   * the contraction's own `scrollIntoView`, and that only ever promised the
   * card would be VISIBLE, not that it would be where you left it: `nearest`
   * scrolls the least it can, which parks the card against whichever edge it
   * came in from. Open Kings Cup from the middle of the screen and closing it
   * returned the deck to nought with the card down at the bottom, 344px from
   * where you tapped it.
   *
   * One number, read as you leave and written back before the first frame of
   * Home is painted. It is a remembered offset rather than a measured one, and
   * that is safe in a way a remembered RECT is not — see CLOSE_MS. A rect is a
   * claim about where something is on screen, and the screen has changed
   * underneath it. This is a claim about how far down a list you were, which
   * is still true when you come back to the same list.
   */
  const homeScroll = useRef(0);
  const closeTimer = useRef<number>(undefined);
  const failsafe = useRef<number>(undefined);
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
   * IT IS NOT HELD THROUGH THE CLOSE, and it was once — `screen ?? closing`,
   * so the pack colour stayed until the overlay had gone. That was correct
   * when closing was a full-screen fade: the display was pack-coloured the
   * whole way out, and a status bar that snapped to the shell early left a
   * band of the wrong colour across the top of a screen that was still red.
   *
   * The contraction inverted it. The colour is off most of the display within
   * a couple of frames now, so holding this pins a strip of mode colour above
   * a Home that is already white — and under `black-translucent` the page
   * paints right up under the status bar, so that strip is the first thing
   * you see. On a device it reads as a gradient bleeding down from the top.
   *
   * Keyed to `screen` alone, the shell lands on the frame the swap happens —
   * underneath an overlay that is still opaque and still covering everything,
   * including that strip, because it is `inset: 0` and above the frame. So it
   * is once again a colour change made where nothing can see it, which is the
   * same argument as the launch's, arrived at from the other side.
   */
  useAppBackground(screen ? MODE_BY_ID[screen].color : SHELL_TOKEN, theme);

  /**
   * Leaving a mode puts its colour over the whole screen and shrinks it back
   * into the card it came from — the launch's own sequence, with the two steps
   * swapped. The overlay is opaque and covering from the frame it appears, so
   * the screen can go back to Home immediately, underneath it: the unmount is
   * as invisible on the way out as the mount is on the way in.
   *
   * Only the state is set here. WHERE it contracts to cannot be known yet,
   * because Home has not mounted — that is the effect below.
   *
   * Under reduced motion there is no overlay at all, which is the same check
   * the launch makes, so both directions answer the question once each.
   */
  const goHome = useCallback(() => {
    if (screen === null) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) setClosing(screen);
    setScreen(null);
  }, [screen]);

  /**
   * PUT THE DECK BACK BEFORE ANYTHING IS PAINTED.
   *
   * A layout effect, which is the whole reason this works: it runs after React
   * has put Home in the DOM and before the browser paints, so the deck is never
   * seen at nought on its way to where it belongs. The contraction below is a
   * passive effect and runs after this, which is what leaves its
   * `scrollIntoView` free to stay as the safety net it should always have been
   * — with the offset already restored the card is in view, and `nearest` does
   * nothing at all when that is true.
   */
  useLayoutEffect(() => {
    if (screen !== null) return;
    const deck = document.querySelector(".screen.home");
    if (deck) deck.scrollTop = homeScroll.current;
  }, [screen]);

  /**
   * THE CONTRACTION, ONCE HOME IS BACK AND BEFORE ANY OF IT IS VISIBLE.
   *
   * This runs after React has committed Home under the overlay, which is the
   * only moment the destination exists: the card is in the DOM, laid out, and
   * covered. So the rect is measured rather than remembered — see CLOSE_MS.
   *
   * THE DECK HAS ALREADY BEEN PUT BACK by the layout effect above, so by here
   * the card is where you left it and this `scrollIntoView` is a safety net
   * rather than the mechanism. `block: "nearest"` is what makes it free: it
   * does nothing at all when the card is already visible, which is now the
   * ordinary case, and the least it can when something has moved.
   *
   * It used to be the mechanism, and that was the bug: it only ever promised
   * the card would be on screen, never that it would be where you tapped it.
   *
   * If the card cannot be found the overlay just fades. Nothing should be able
   * to strand a full-screen field of colour over the app.
   */
  useEffect(() => {
    if (!closing) return;
    const el = closeRef.current;
    if (!el) {
      setClosing(null);
      return;
    }

    const card = document.querySelector<HTMLElement>(`[data-mode="${closing}"]`);
    card?.scrollIntoView({ block: "nearest", behavior: "auto" });

    const done = () => setClosing(null);
    let anim: Animation | undefined;

    /* ONE FRAME OF NOTHING FIRST.
       Swapping a mode out and Home in is the most expensive thing this app
       does, and it lands on the frame the overlay appears — measured at 16.5ms
       against a steady 8.3. Starting the contraction in that same frame spends
       the hitch on the animation's opening, where it is exactly as visible as
       a dropped frame can be. A frame's wait puts the whole cost under a field
       of colour that is not moving yet, which is the launch's own argument for
       swapping under its overlay rather than before it. */
    const raf = requestAnimationFrame(() => {
      if (card) {
        /* WHERE THE CARD WILL BE, AND ONLY THE PART OF IT YOU CAN SEE.

           Three corrections, all of them things a plain getBoundingClientRect
           gets wrong here:

           DRIFT. Home has only just mounted, so `.screen` is part-way through
           `screen-in` — a 10px translate — and the rect reads the card
           mid-slide. Measured on Last Call that aimed the landing 4.6px low,
           by a different amount on every close depending on which frame this
           ran. screen-in only moves Y, so undoing its translate gives the
           resting position — the same thing the OPEN path reads off a Home
           that is standing still.

           THE TAIL. The deck overlaps: a card's box is 124px but only 87 of
           it is on screen, the rest tucked behind the card in front. Landing
           on the full box painted the pack colour over the top 37px of its
           neighbour for the last frames of the contraction — a slab of the
           wrong colour arriving on the wrong card. Clamped to the next card's
           top, so the overlay lands on the part you can actually see.

           THE CORNERS. Deck cards are rounded at the top only — `28px 28px 0
           0` — so a contraction ending on `round 22px` finished with rounded
           bottom corners over a card that has square ones. Wearing the card's
           own radius is also what makes the LAST card work, which is the one
           card in the deck rounded on all four. */
        const slide = card.closest(".screen");
        const drift = slide ? new DOMMatrix(getComputedStyle(slide).transform).m42 : 0;
        const r = card.getBoundingClientRect();
        const under = card.nextElementSibling?.getBoundingClientRect().top;
        const bottom = Math.min(r.bottom, under ?? r.bottom) - drift;
        /* ROUNDED ON ALL FOUR, THE WHOLE WAY, AND IT NEVER SQUARES OFF.

           The card's own radius is `28px 28px 0 0` — square at the bottom —
           and contracting to that value was the obvious thing to do. It is
           wrong, and it took a while to see why it had ever looked right: the
           earlier build hid it. A gradient was dissolving the bottom edge
           away before the radius had finished squaring, so the sharp corners
           were never on screen. Take the gradient out and there they are.

           Nothing has to square off, because nothing is ever seen. The
           overlay's bottom edge is clamped to where the NEXT card covers this
           one, so a rounded bottom corner opens a notch onto the target card
           itself — the same colour, at the same moment. The card's square
           corners are hidden behind its neighbour in exactly the same way,
           which is what .deck-card's own comment is about.

           It also removes a moving part. The radius was interpolating from
           28px to 0 on two corners across the contraction, which is one more
           thing changing on one more clock in an animation that already has
           too many. A constant is not a simplification here, it is the
           correct value.

           And it is right for the last card in the deck too, which is rounded
           on all four and has nothing in front of it.
           --------------------------------------------------------------- */
        const radius = "28px";

        /* The card is RAISED right now — Home lifted it on mount, without a
           transition, precisely so this measurement is of where the colour
           has to land rather than of a card still on its way up. */
        const sides = `${window.innerWidth - r.right}px ${
          window.innerHeight - bottom
        }px ${r.left}px round ${radius}`;
        const onRaised = `inset(${r.top - drift}px ${sides})`;

        /* SOFT CORNERS THE WHOLE WAY DOWN.
           It starts `round 28px` rather than square. A sharp-cornered
           rectangle shrinking across the deck reads as a cut-out sliding
           over the cards; the same shape with its corners eased reads as an
           object. 28px is --radius-xl, which is the deck card's own top
           radius, so the corners are already the right shape when they
           arrive and only the two at the bottom have to square off — and
           they do it over the whole contraction rather than at the end. */
        anim = el.animate([{ clipPath: "inset(0px round 28px)" }, { clipPath: onRaised }], {
          duration: CLOSE_MS,
          easing: CLOSE_EASE,
          fill: "forwards",
        });

        /* ---------------------------------------------------------------
           AND THEN IT GOES DOWN WITH THE CARD, DISSOLVING.

           This is the half that makes the close work, and it took three
           failed versions to find. The overlay is a flat field of the pack
           colour: no title, no tagline, no stroke. That costs nothing on the
           way IN, because it leaves the card on the first frame and the two
           are never on screen together. Contracting, it is the same object
           with the fault inverted — it arrives exactly on the card and stops,
           so the writing has nothing to arrive WITH and can only appear.
           Fading it earlier only moved the appearing earlier.

           So the card moves, and the writing arrives on the movement. Home
           drops it out of the raise the moment the contraction ends, and this
           runs on the same clock: the clip's top edge follows the card down
           while the colour dissolves off it, and the title and tagline come up
           underneath on their own matching fade. Source and destination
           cross-fading through one continuous movement, which is the only part
           of the zoom transition this app was missing.

           ONLY THE TOP EDGE MOVES. A translate was the obvious way to follow
           the card and it is wrong: it carries the whole clipped shape down,
           including the bottom, which pushes the pack colour 14px into the
           card underneath — a band of red over the top of the green one for
           the length of the drop. The real card does not do that. Its top
           descends and its visible bottom stays exactly where the next card
           covers it, because the next card has not moved. Animating the inset
           rather than the element is what makes the overlay behave like the
           thing it is standing in for.

           `--ease-spring` and not the contraction's curve, because this is no
           longer the colour's movement — it is the card's, and the card is
           already dropping on the spring that .deck-card[data-picked] uses.
           Two clocks in one beat is the thing that reads as choppy.
           --------------------------------------------------------------- */
        /* ---------------------------------------------------------------
           THE COLOUR IS GONE BEFORE THE CARD MOVES.

           These are two beats and they used to be one. The overlay followed
           the card down while dissolving, and the writing came up underneath
           it on a third clock — so the arrival and the settle were happening
           at the same time, on top of each other, and neither read as a
           thing in its own right.

           Now the fade finishes exactly when the contraction does. At
           CLOSE_MS the colour has landed and cleared, and what is on screen
           is the card, held up out of the deck, with its writing already on
           it. Only then does it drop.

           So: the mode closes into a raised card. The raised card sits down.
           One after the other, with nothing shared between them.

           It also takes the count of things happening at once from five to
           three, and the two that are left never overlap. */
        el.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: CLOSE_MS - DISSOLVE_FROM_MS,
          delay: DISSOLVE_FROM_MS,
          easing: DISSOLVE_EASE,
          fill: "forwards",
        });

        /* The writing, pinned to the rect the colour is landing on so that the
           card underneath is already carrying it in exactly that place when
           the overlay goes. Its own left/width rather than the clip's, because
           a clip cuts a shape out of a full-screen element and gives a child
           nothing to lay itself out against. */
        const face = faceRef.current;
        if (face) {
          face.style.top = `${r.top - drift}px`;
          face.style.left = `${r.left}px`;
          face.style.width = `${r.right - r.left}px`;
          face.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: CLOSE_MS - FACE_FROM_MS,
            delay: FACE_FROM_MS,
            easing: "cubic-bezier(0.16, 1, 0.3, 1)",
            fill: "forwards",
          });
        }
      } else {
        anim = el.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: CLOSE_MS,
          easing: CLOSE_EASE,
          fill: "forwards",
        });
      }
      /* Retired with the contraction. The drop that follows is the card's
         own, and Home owns it — see `settleAfter`. */
      anim.onfinish = done;
      anim.oncancel = done;
      closeTimer.current = window.setTimeout(done, CLOSE_MS);
    });

    // The guarantee, not the ordinary path. See CLOSE_FAILSAFE_MS.
    failsafe.current = window.setTimeout(done, CLOSE_FAILSAFE_MS);

    return () => {
      cancelAnimationFrame(raf);
      if (anim) {
        anim.onfinish = null;
        anim.oncancel = null;
      }
      window.clearTimeout(closeTimer.current);
      window.clearTimeout(failsafe.current);
    };
  }, [closing]);

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
    /* A close leaves Home live under a contracting overlay for 380ms, which is
       long enough to tap a card in. Retire it here, or the two overlays stack
       and the one going out paints over the one coming in. */
    setClosing(null);
    /* Before anything swaps. Both paths below unmount Home, and the pick-for-me
       flourish has already scrolled the deck by the time it calls this, so what
       gets caught is the deck as the player last saw it either way. */
    homeScroll.current = document.querySelector(".screen.home")?.scrollTop ?? 0;
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

    /* The writing clears while the colour is still growing. Its own clock
       rather than a keyframe on the overlay, because the two are different
       shapes: the clip runs the whole duration on LAUNCH_EASE, this waits
       and then goes. --ease-glide, because a fade that is ~95% done by its
       own halfway point (which is what --ease-out would give) reads as the
       title being snatched rather than released. */
    faceInRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: FACE_FADE_MS,
      delay: FACE_HOLD_MS,
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
      fill: "forwards",
    });

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
      <div className="app__frame">{renderScreen(screen, open, goHome, closing)}</div>
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
        >
          {/* THE CARD'S OWN WRITING, CARRIED OUT OF THE DECK.

              The overlay used to be a bare field of colour on the way in,
              and that is what emptied the card on frame one: an opaque
              rectangle lands exactly on the card you tapped, so the title
              and tagline you were reading are covered before anything has
              moved. What grew from there read as a blank surface loading,
              not as the card opening.

              Pinned to the same rect the clip starts from, at the card's
              own inset, so on the first frame this copy sits exactly on
              the pixels the real writing occupies. Nothing appears and
              nothing moves; the overlay simply arrives already carrying
              what the card was carrying, and the title stays legible while
              the colour grows out around it.

              Opacity is inline rather than left to the stylesheet for the
              same reason the clip is: the effect that animates this runs
              after the first paint, and .launch__face rests at 0 for the
              CLOSE direction. Without a value here the writing would be
              absent for exactly one frame, which is the bug this is
              fixing, one frame shorter. */}
          <div
            className="launch__face"
            data-open
            ref={faceInRef}
            style={{
              top: launch.rect.top,
              left: launch.rect.left,
              width: launch.rect.right - launch.rect.left,
              opacity: 1,
            }}
          >
            <DeckFace mode={MODE_BY_ID[launch.id]} />
          </div>
        </div>
      )}
      {/* The colour on its way back into its card. Covering on the first
          frame — which is what lets the screen swap underneath it — and
          contracted to the card by the effect above. Same element, same
          class and the same inline starting clip as the launch; only the
          direction differs. */}
      {closing && (
        <div
          ref={closeRef}
          className="launch"
          style={{
            ...categoryStyle(MODE_BY_ID[closing].color),
            /* Rounded, not the launch's square. The contraction below starts
               from a rounded clip, so a square one here is a different shape
               for the frame between this painting and the animation taking
               over — one frame of hard corners before they round off. The
               launch ENDS at full screen, so square is right for that one. */
            clipPath: "inset(0px round 28px)",
          }}
          aria-hidden="true"
        >
          <div className="launch__face" ref={faceRef}>
            <DeckFace mode={MODE_BY_ID[closing]} />
          </div>
        </div>
      )}
    </div>
  );
}

function renderScreen(
  screen: ModeId | null,
  open: (id: ModeId, rect?: Launch["rect"]) => void,
  goHome: () => void,
  closing: ModeId | null,
) {
  if (screen === null) {
    return <Home onPick={open} returning={closing} />;
  }

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
