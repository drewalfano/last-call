import { useCallback, useEffect, useRef, useState } from "react";
import { buzz } from "../lib/useCountdown";
import { audio } from "../lib/audio";
import { ZONES } from "../data/ballpark";

/**
 * THE DIAL
 * ---------------------------------------------------------------
 * An arc, flat side down, that the table drags a needle across. It is the
 * whole of Ballpark: the prompt is two words and the clue is spoken out loud,
 * so this is the only thing the app actually gives the group to do.
 *
 * Everything here is in the viewBox's own units and scaled by CSS, so the
 * geometry below is fixed and readable rather than recomputed per breakpoint.
 *
 * THE VIEWBOX IS TIGHT TO THE PAINT, and that is worth 37% of the instrument.
 *
 * It used to be 320 wide for an arc that paints 278 of them — 21 units of
 * empty either side, inside a card that then adds 16px of padding of its own.
 * Between the two, and a `width: min(100%, 300px)` cap on top, the drawn arc
 * came to 261px in a 353px card: a quarter of the card was margin around the
 * only object in the mode. The box is now exactly the ink, so a width given
 * to the dial is a width the arc actually gets.
 */
/** The track's centreline. Every other length here is derived from it. */
const R = 132;
const TRACK = 14;
/** Half the track's stroke, which is how far the round cap reaches past R. */
const PAD = TRACK / 2;
/**
 * The hub, which is also the box's own centre horizontally and its top-left
 * inset vertically. Constant across every sweep — only the height below it
 * changes — so the CSS can name one transform-origin and be right for all of
 * them. See --hub in games.css.
 */
const CX = R + PAD;
const CY = R + PAD;
const VB_W = 2 * (R + PAD);

/**
 * THE NEEDLE RUNS TO THE MIDDLE OF THE TRACK AND STOPS THERE.
 *
 * Not short of it, and not across it. R is the track's own centreline, so a
 * needle drawn to exactly R lands its rounded cap inside the bar's 14 units
 * of width — the point reads as sitting IN the track rather than pointing at
 * it from underneath or crossing over the top of it.
 *
 * It had a ball on the end instead, a filled circle at R - 16. That is a
 * different instrument: a ball reads as a bead threaded on the arc, and a
 * bead is a thing you drag, so it invited exactly the grab-the-handle
 * interaction this dial deliberately does not require. A tapered line with a
 * round cap is a needle, and a needle points.
 */
const NEEDLE_R = R;

/**
 * WHERE VALUE 0 SITS, IN MATHS DEGREES, FOR A GIVEN SWEEP.
 *
 * A sweep of 180 puts it due left and 100 due right, which is the dial as it
 * shipped. Anything wider is centred on the same vertical, so the two ends
 * drop below the horizontal by equal amounts and the instrument stays
 * symmetrical about the value it is nowhere near — the middle.
 */
const startAngle = (sweep: number) => 90 + sweep / 2;

/** How far the arc's ends hang below the hub, in user units. 0 at 180. */
const belowHub = (sweep: number) => Math.max(0, -R * Math.cos((sweep * Math.PI) / 360));

const viewBoxHeight = (sweep: number) => CY + belowHub(sweep) + PAD;

function pointOnArc(value: number, sweep: number, radius = R): { x: number; y: number } {
  const a = ((startAngle(sweep) - (sweep * value) / 100) * Math.PI) / 180;
  return { x: CX + radius * Math.cos(a), y: CY - radius * Math.sin(a) };
}

/**
 * An arc path between two values at a given radius, clockwise on screen —
 * which for a y-down coordinate system means the sweep flag is 1.
 *
 * The large-arc flag is COMPUTED rather than nailed to 0. At a sweep of 180
 * nothing drawn here could span more than a semicircle, so it never mattered;
 * a wider dial makes the full track itself the counter-example, and an arc
 * asked to go the long way round with the flag clear silently goes the short
 * way instead — it does not fail, it draws the complement.
 */
function arcPath(from: number, to: number, sweep: number, radius = R): string {
  const a = pointOnArc(from, sweep, radius);
  const b = pointOnArc(to, sweep, radius);
  const large = (Math.abs(to - from) / 100) * sweep > 180 ? 1 : 0;
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${radius} ${radius} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

/**
 * WHERE A CUT WEDGE STARTS, as a fraction of the radius.
 *
 * The number is set by what it has to leave alone rather than by taste: both
 * needles run from the hub to the track, and the reveal is READ as the gap
 * between them, so the inner run of that gap has to stay on clean stock. Just
 * under half gets the hub, the pivot and the first stretch of both needles
 * clear while still leaving the wedge two thirds of its length.
 */
const STUB_INNER = 0.46;

/** A filled sector from the hub out to the track. */
function wedgePath(from: number, to: number, sweep: number): string {
  const a = pointOnArc(from, sweep);
  const b = pointOnArc(to, sweep);
  const large = (Math.abs(to - from) / 100) * sweep > 180 ? 1 : 0;
  return `M ${CX} ${CY} L ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)} Z`;
}

/**
 * The same sector with its inner end cut off — an annular one.
 *
 * The inner arc is traced BACKWARDS, which is what the 0 sweep flag is doing:
 * the path runs up the leading edge, round the outside, down the trailing
 * edge and then has to come home the other way. Give it the same flag as the
 * outer arc and it doubles back over itself, which fills as an hourglass.
 */
function stubPath(from: number, to: number, sweep: number): string {
  const ri = R * STUB_INNER;
  const ao = pointOnArc(from, sweep);
  const bo = pointOnArc(to, sweep);
  const ai = pointOnArc(from, sweep, ri);
  const bi = pointOnArc(to, sweep, ri);
  const large = (Math.abs(to - from) / 100) * sweep > 180 ? 1 : 0;
  return [
    `M ${ai.x.toFixed(2)} ${ai.y.toFixed(2)}`,
    `L ${ao.x.toFixed(2)} ${ao.y.toFixed(2)}`,
    `A ${R} ${R} 0 ${large} 1 ${bo.x.toFixed(2)} ${bo.y.toFixed(2)}`,
    `L ${bi.x.toFixed(2)} ${bi.y.toFixed(2)}`,
    `A ${ri.toFixed(2)} ${ri.toFixed(2)} 0 ${large} 0 ${ai.x.toFixed(2)} ${ai.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export type ZoneShape = "bar" | "wedge" | "stub";

interface DialProps {
  /** Where the needle sits. */
  value: number;
  /** Omit to make the dial a read-only picture of a value. */
  onChange?: (value: number) => void;
  left: string;
  right: string;
  /** Draws the answer needle. Null until the reveal, or on the Reader's screen. */
  target?: number | null;
  /**
   * Paints the three proximity zones out from `target`.
   *
   * On the reveal, where they say how close the group got — and on the
   * Reader's clue card, where they say the same thing before the fact. A
   * needle alone tells the Reader a point, and a point is not what they have
   * to clue: they have to clue a REGION, and how wide that region is before
   * the table stops calling it close is exactly what the bands draw.
   */
  showZones?: boolean;
  /** Marks where the group locked in, alongside the answer. Reveal only. */
  lockedGuess?: number | null;
  /** Runs the reveal sequence's entrance on the bands and the answer needle. */
  revealing?: boolean;
  /**
   * Total arc, in degrees. 180 is the semicircle the mode shipped with.
   *
   * Widening it is the one way to buy scale that width cannot: the radius is
   * capped by the column either way, so past 180 the extra length comes out
   * of the empty bottom corners a semicircle can never reach into.
   */
  sweep?: number;
  /**
   * Drawn straight onto the pack colour rather than onto white card stock.
   *
   * Only the palette changes — the track goes to a wash of white and the ink
   * stays black, which is the same pairing the other way up. The geometry is
   * identical, because the card was never what limited it.
   */
  bare?: boolean;
  /** How the zones are drawn. See ZONE_SHAPES in state/dialStyle. */
  zoneShape?: ZoneShape;
  /**
   * Strip the instrument back to the zones and the two ends.
   *
   * For the Reader's clue card under the `zone` setting: no track to read a
   * position along and no needle to read it with, because the Reader is not
   * being asked for a position. The zone's own centre IS the answer, and how
   * far it spreads is the slack they have to clue inside.
   */
  zonesOnly?: boolean;
}

/**
 * THE AMBIENT DRIFT, AND WHY IT IS A ROTATION RATHER THAN A VALUE.
 *
 * Before the first touch the needle sways about a degree and a half, which is
 * the only thing on the screen saying it can be grabbed. It is a CSS rotate
 * on a wrapper group, NOT an animated `value` — because value is the group's
 * answer. Drifting the real number would mean the dial reports a position
 * nobody chose, and `hasMovedDial` would have to start distinguishing motion
 * the app invented from motion a player made. A transform touches the picture
 * and leaves the state alone.
 */
export function Dial({
  value,
  onChange,
  left,
  right,
  target = null,
  showZones = false,
  lockedGuess = null,
  revealing = false,
  sweep = 180,
  bare = false,
  zoneShape = "bar",
  zonesOnly = false,
}: DialProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragging, setDragging] = useState(false);
  /** Latched on the first pointerdown and never cleared: kills the drift. */
  const [touched, setTouched] = useState(false);
  /** Which multiple of 5 the value last sat in, for the tick. */
  const lastNotch = useRef(Math.floor(value / 5));
  /**
   * THE LIVE VALUE, FOR THE KEYBOARD TO STEP FROM.
   *
   * An arrow key reads the current position and commits one more than it. Read
   * from the `value` PROP that is the position as of the last render, so two
   * key events arriving before React has re-rendered both step from the same
   * number and the second overwrites the first instead of adding to it. Key
   * repeat on a held arrow is comfortably slower than a render, so this does
   * not bite in normal use — but a burst of events in one tick silently
   * collapses to a single step, which is the kind of fault that only ever
   * shows up somewhere inconvenient. The ref is written on every render and
   * on every commit, so it is current within the tick as well as across it.
   */
  const valueRef = useRef(value);
  valueRef.current = value;

  const interactive = typeof onChange === "function";

  /**
   * A tick every five units, on the way past.
   *
   * Both the buzz and the blip hang off the same crossing so they cannot
   * drift apart, and both are deliberately absent from the keyboard path's
   * larger jumps — shift-arrow crosses two notches at once and firing twice
   * in a frame is a rattle, not a detent.
   */
  const notch = useCallback((next: number) => {
    const n = Math.floor(next / 5);
    if (n === lastNotch.current) return;
    lastNotch.current = n;
    buzz(8);
    audio.play("dial", n);
  }, []);

  const commit = useCallback(
    (next: number, withTick = true) => {
      if (!onChange) return;
      const v = Math.round(clamp(next, 0, 100) * 10) / 10;
      valueRef.current = v;
      if (withTick) notch(v);
      onChange(v);
    },
    [onChange, notch],
  );

  /**
   * Pointer position to value.
   *
   * THE DEAD WEDGE IS RESOLVED BY WHICH END IS NEARER, not by squeezing the
   * angle into range. Below the flat edge of a semicircle `atan2` goes
   * negative, and forcing that into [0, PI] with a min/max sends everything
   * under the line to 0 radians — the RIGHT-hand end — so a drag that
   * wanders off the bottom-left corner throws the needle across the whole
   * dial to 100.
   *
   * Written as a full turn's worth of value and then bisected, so the same
   * reasoning holds for a wider sweep, where the wedge is narrower and no
   * longer symmetrical about straight down in value terms.
   */
  const valueAt = useCallback(
    (clientX: number, clientY: number): number | null => {
      const svg = svgRef.current;
      const ctm = svg?.getScreenCTM();
      if (!svg || !ctm) return null;
      const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());

      const dx = p.x - CX;
      const dy = CY - p.y; // invert: screen y grows downward
      let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
      const a0 = startAngle(sweep);
      /* Into the half-open turn that ends at value 0, so the whole dial plus
         its wedge is one monotonic run of value rather than two branches. */
      while (deg > a0) deg -= 360;
      while (deg <= a0 - 360) deg += 360;

      const v = ((a0 - deg) / sweep) * 100;
      if (v <= 100) return v;
      /* In the wedge. Its far side is 0 and its near side 100, so the
         midpoint in value terms is the watershed. */
      const wedge = ((360 - sweep) / sweep) * 100;
      return v > 100 + wedge / 2 ? 0 : 100;
    },
    [sweep],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!interactive) return;
      setTouched(true);
      setDragging(true);
      /* Throws NotFoundError if the pointer is already gone by the time this
         runs — a flick that lands and lifts inside one frame, and anything
         synthesising events. The capture is an optimisation for the drag that
         follows, so losing it must not cost the tap that started it. */
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* no capture; pointermove on the element still tracks the drag */
      }
      const v = valueAt(e.clientX, e.clientY);
      if (v !== null) commit(v);
    },
    [interactive, valueAt, commit],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!dragging) return;
      const v = valueAt(e.clientX, e.clientY);
      if (v !== null) commit(v);
    },
    [dragging, valueAt, commit],
  );

  const endDrag = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      /* already released — the drag is over either way */
    }
    setDragging(false);
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!interactive) return;
      const step = e.shiftKey ? 10 : 1;
      const from = valueRef.current;
      let next: number | null = null;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") next = from + step;
      else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = from - step;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = 100;
      if (next === null) return;
      e.preventDefault();
      setTouched(true);
      commit(next);
    },
    [interactive, commit],
  );

  /* The notch reference has to follow a value the dial did not set — a new
     round resets the guess, and without this the first drag of round two
     ticks off the last round's position. */
  useEffect(() => {
    if (!dragging) lastNotch.current = Math.floor(value / 5);
  }, [value, dragging]);

  /**
   * THE LIVE NEEDLE IS THE GROUP'S POSITION, so it only belongs on a screen
   * where the group has one.
   *
   * The Reader's clue card draws an answer by passing it as BOTH `value` and
   * `target`, which is the shortest way to put a needle at a point — and it
   * used to put two there, one on top of the other. Invisible while the card
   * showed a bare needle on white; not invisible once the card started
   * showing the zones underneath it, because the answer needle carries a
   * casing to survive crossing the darkest band and the live one does not. It
   * sat on top in flat black and ate the edge the casing exists to give.
   */
  const showLiveNeedle =
    !zonesOnly && lockedGuess === null && (interactive || target === null);

  const shown = Math.round(value);
  const targetPoint = target === null ? null : pointOnArc(target, sweep, R);
  const vbH = viewBoxHeight(sweep);
  /**
   * The two numbers the stylesheet needs to place a needle at a value: where
   * value 0 points once the line has been drawn due left, and how far a
   * single unit turns it. At 180 they come out 0 and 1.8, which is what the
   * three rotate rules said in longhand before the sweep could vary.
   */
  const geometry = {
    ["--start-deg" as string]: `${(90 - sweep / 2).toFixed(3)}deg`,
    ["--per-deg" as string]: `${(sweep / 100).toFixed(4)}deg`,
    /* How far the painted ends of the track are inset from the box's own
       edge, as a percentage of its width, so the labels under the arc can
       line up with the ends of the ink at any sweep. */
    ["--end-inset" as string]: `${((pointOnArc(0, sweep).x - PAD) / VB_W) * 100}%`,
  };

  /**
   * Reads as a POSITION, not a number. "62" tells a screen reader nothing
   * about a spectrum whose two ends are the entire content of the round.
   */
  const valueText =
    shown <= 2
      ? `All the way at ${left}`
      : shown >= 98
        ? `All the way at ${right}`
        : shown >= 45 && shown <= 55
          ? `Halfway between ${left} and ${right}`
          : `${shown}% of the way from ${left} to ${right}`;

  return (
    <div className="dial" data-bare={bare || undefined} style={geometry}>
      <svg
        ref={svgRef}
        className="dial__svg"
        viewBox={`0 0 ${VB_W} ${vbH.toFixed(2)}`}
        role={interactive ? "slider" : "img"}
        aria-label={interactive ? `Dial between ${left} and ${right}` : `${left} to ${right}`}
        aria-valuenow={interactive ? shown : undefined}
        aria-valuemin={interactive ? 0 : undefined}
        aria-valuemax={interactive ? 100 : undefined}
        aria-valuetext={interactive ? valueText : undefined}
        tabIndex={interactive ? 0 : undefined}
        data-dragging={dragging || undefined}
        data-interactive={interactive || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
      >
        {/* THE TRACK AND THE HUB STAY IN `zonesOnly`. ONLY THE NEEDLE GOES.

            Taking the track out too was the first attempt and it was wrong in
            a way that is obvious once drawn: the zone had nothing to be
            positioned AGAINST, so the fan floated in white pointing
            somewhere, and a third of the way along could not be told from a
            quarter without mentally rebuilding the arc that had been removed.
            Then a hairline version of it, which is the same mistake at a
            lower weight — a spectrum you have to squint at is not a spectrum.

            The needle is the whole of what is being removed, and it is enough,
            because the needle is the part that reports a VALUE. Without it the
            card says here is your region and how much room it gives you; with
            it the card says you are at seventy-one. */}
        <path className="dial__track" d={arcPath(0, 100, sweep)} />

        {/* THE THREE ZONES. Widest first in document order so the tighter
            ones paint over them; the entrance stagger runs the other way,
            from the innermost outward, which is what makes them read as
            growing out of the answer rather than closing in on it. */}
        {showZones && target !== null && targetPoint && (
          <g
            className="dial__zones"
            data-shape={zoneShape}
            data-revealing={revealing || undefined}
          >
            {[...ZONES.keys()].reverse().map((i) => {
              const from = clamp(target - ZONES[i].within, 0, 100);
              const to = clamp(target + ZONES[i].within, 0, 100);
              return (
                <path
                  key={ZONES[i].within}
                  className="dial__zone"
                  data-zone={i}
                  style={{
                    ["--zone-i" as string]: i,
                    /* A bar grows out of its own point on the arc, because
                       that is where it lives. A wedge is already anchored at
                       the hub and has to grow from there, or it swings in
                       from the side like a door. */
                    ["--ox" as string]:
                      zoneShape === "bar" ? `${targetPoint.x}px` : `${CX}px`,
                    ["--oy" as string]:
                      zoneShape === "bar" ? `${targetPoint.y}px` : `${CY}px`,
                  }}
                  d={
                    zoneShape === "wedge"
                      ? wedgePath(from, to, sweep)
                      : zoneShape === "stub"
                        ? stubPath(from, to, sweep)
                        : arcPath(from, to, sweep)
                  }
                />
              );
            })}
          </g>
        )}

        {/* THE ANSWER, drawn out from the hub.
            A stroke-dashoffset draw rather than a fade, because the needle
            arriving along its own length is the thing that points — a fade
            puts it on screen without ever having travelled to where it is. */}
        {target !== null && !zonesOnly && (
          <g
            className="dial__target"
            data-revealing={revealing || undefined}
            style={{ ["--v" as string]: target }}
          >
            {/* A CASING UNDER THE NEEDLE, in the card's own white.
                The answer sits by definition at the dead centre of the
                innermost zone, which is the darkest thing on the dial — so
                the one place this needle is guaranteed to cross is the one
                place its own colour has the least to work with. A wider
                stroke of the card colour underneath gives it an edge there
                and is invisible everywhere else, since everywhere else IS
                the card. Drawn first so the needle proper sits on top, and
                it inherits the same draw-on so the two arrive as one line. */}
            <line className="dial__target-casing" x1={CX} y1={CY} x2={CX - R} y2={CY} />
            <line x1={CX} y1={CY} x2={CX - R} y2={CY} />
          </g>
        )}

        {/* Where the group landed. Already on screen at the locked position —
            this only settles. */}
        {lockedGuess !== null && (
          <g
            className="dial__guess"
            data-revealing={revealing || undefined}
            style={{ ["--v" as string]: lockedGuess }}
          >
            <line x1={CX} y1={CY} x2={CX - NEEDLE_R} y2={CY} />
          </g>
        )}

        {/* The live needle, absent once the guess is locked — the marker above
            is the same position drawn as a result.

            ROTATED, NOT REPOSITIONED. A <line>'s x1/y1/x2/y2 are attributes
            and not CSS geometry properties, so nothing can transition them
            and the drift would have to be recomputed per frame in JS. Drawn
            once pointing at 0 and turned by --per-deg per unit, the needle's
            position, its easing and the ambient sway are all one property
            that composes for free. */}
        {showLiveNeedle && (
          <g className="dial__drift" data-drift={interactive && !touched && !dragging ? "" : undefined}>
            <g className="dial__needle" style={{ ["--v" as string]: value }}>
              <line x1={CX} y1={CY} x2={CX - NEEDLE_R} y2={CY} />
            </g>
          </g>
        )}

        <circle className="dial__hub" cx={CX} cy={CY} r={7} />
      </svg>

      <div className="dial__ends" aria-hidden="true">
        <span className="dial__end">{left}</span>
        <span className="dial__end dial__end--right">{right}</span>
      </div>
    </div>
  );
}
