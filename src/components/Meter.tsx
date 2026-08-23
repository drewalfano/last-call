import { useCallback, useEffect, useRef, useState } from "react";
import { buzz } from "../lib/useCountdown";
import { audio } from "../lib/audio";
import { ZONES } from "../data/ballpark";

/**
 * THE METER
 * ---------------------------------------------------------------
 * Ballpark's other instrument: a vertical bar with one end of the spectrum
 * above it and the other below, drawn straight onto the pack colour.
 *
 * It exists to be judged against the Dial rather than to replace it, and the
 * comparison is not close on the numbers — see the note in state/dialStyle.
 * A bar in this frame travels around 450px where a 260-degree arc of the same
 * width travels 765, because an arc folds a long line into a short box and a
 * bar cannot. What it buys back is TYPE: each end label gets the full column
 * instead of half of it, so they run at 34px against the arc's 28.
 *
 * The other thing it costs is neutrality, and that one may be decisive. Up
 * reads as more, and roughly a third of the pairs in data/ballpark.ts run the
 * other way or are not value axes at all — "Sandwich / Not a sandwich",
 * "Breakfast food / Dinner food". The file says the order inside a pair is
 * deliberately not regularised so the table cannot read the dial instead of
 * the clue; a vertical axis regularises it whatever the data does.
 *
 * Geometry is in the viewBox's own units, scaled by CSS off the HEIGHT — the
 * one difference from the Dial, which is bound by width.
 */
const VB_W = 66;
/** The needle's travel, top to bottom, in user units. */
const TRAVEL = 400;
const TRACK = 26;
const PAD = TRACK / 2;
const VB_H = TRAVEL + TRACK;
const CX = VB_W / 2;
/** Value 0 sits at the bottom of the travel, value 100 at the top. */
const Y0 = VB_H - PAD;

const yFor = (value: number) => Y0 - (TRAVEL * value) / 100;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

interface MeterProps {
  value: number;
  /** Omit to make the meter a read-only picture of a value. */
  onChange?: (value: number) => void;
  /** Value 0, at the bottom. */
  left: string;
  /** Value 100, at the top. */
  right: string;
  target?: number | null;
  showZones?: boolean;
  lockedGuess?: number | null;
  revealing?: boolean;
}

export function Meter({
  value,
  onChange,
  left,
  right,
  target = null,
  showZones = false,
  lockedGuess = null,
  revealing = false,
}: MeterProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [touched, setTouched] = useState(false);
  const lastNotch = useRef(Math.floor(value / 5));
  const valueRef = useRef(value);
  valueRef.current = value;

  const interactive = typeof onChange === "function";

  const notch = useCallback((next: number) => {
    const n = Math.floor(next / 5);
    if (n === lastNotch.current) return;
    lastNotch.current = n;
    buzz(8);
    audio.play("dial", n);
  }, []);

  const commit = useCallback(
    (next: number) => {
      if (!onChange) return;
      const v = Math.round(clamp(next, 0, 100) * 10) / 10;
      valueRef.current = v;
      notch(v);
      onChange(v);
    },
    [onChange, notch],
  );

  /**
   * Pointer to value, and there is no dead zone to resolve — every point on
   * the screen has a y, so the whole plane maps somewhere sensible and the
   * clamp is the entire story. This is the one place the bar is simpler than
   * the arc.
   */
  const valueAt = useCallback((clientY: number): number | null => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const p = new DOMPoint(0, clientY).matrixTransform(ctm.inverse());
    return clamp(((Y0 - p.y) / TRAVEL) * 100, 0, 100);
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!interactive) return;
      setTouched(true);
      setDragging(true);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* no capture; pointermove on the element still tracks the drag */
      }
      const v = valueAt(e.clientY);
      if (v !== null) commit(v);
    },
    [interactive, valueAt, commit],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!dragging) return;
      const v = valueAt(e.clientY);
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
      if (e.key === "ArrowUp" || e.key === "ArrowRight") next = from + step;
      else if (e.key === "ArrowDown" || e.key === "ArrowLeft") next = from - step;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = 100;
      if (next === null) return;
      e.preventDefault();
      setTouched(true);
      commit(next);
    },
    [interactive, commit],
  );

  useEffect(() => {
    if (!dragging) lastNotch.current = Math.floor(value / 5);
  }, [value, dragging]);

  const shown = Math.round(value);
  const valueText =
    shown <= 2
      ? `All the way at ${left}`
      : shown >= 98
        ? `All the way at ${right}`
        : shown >= 45 && shown <= 55
          ? `Halfway between ${left} and ${right}`
          : `${shown}% of the way from ${left} to ${right}`;

  /** Half the needle's overhang either side of the bar, so it reads as a
      cursor ON the track rather than a segment of it. */
  const arm = TRACK * 1.05;

  return (
    <div className="meter">
      <span className="meter__end">{right}</span>

      <svg
        ref={svgRef}
        className="meter__svg"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        role={interactive ? "slider" : "img"}
        aria-label={interactive ? `Meter between ${left} and ${right}` : `${left} to ${right}`}
        aria-orientation="vertical"
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
        <line className="meter__track" x1={CX} y1={Y0} x2={CX} y2={yFor(100)} />

        {/* Widest first so the tighter ones paint over them, exactly as the
            arc's do; the stagger runs the other way so they read as growing
            out of the answer. */}
        {showZones && target !== null && (
          <g className="meter__zones" data-revealing={revealing || undefined}>
            {[...ZONES.keys()].reverse().map((i) => (
              <line
                key={ZONES[i].within}
                className="meter__zone"
                data-zone={i}
                style={{
                  ["--zone-i" as string]: i,
                  ["--oy" as string]: `${yFor(target)}px`,
                }}
                x1={CX}
                y1={yFor(clamp(target - ZONES[i].within, 0, 100))}
                x2={CX}
                y2={yFor(clamp(target + ZONES[i].within, 0, 100))}
              />
            ))}
          </g>
        )}

        {target !== null && (
          <g
            className="meter__target"
            data-revealing={revealing || undefined}
            style={{ ["--v" as string]: target }}
          >
            {/* The same casing the arc's answer needle carries, and for the
                same reason: the answer is by definition at the centre of the
                darkest zone on the track. */}
            <line className="meter__target-casing" x1={CX - arm} y1={Y0} x2={CX + arm} y2={Y0} />
            <line x1={CX - arm} y1={Y0} x2={CX + arm} y2={Y0} />
          </g>
        )}

        {lockedGuess !== null && (
          <g
            className="meter__guess"
            data-revealing={revealing || undefined}
            style={{ ["--v" as string]: lockedGuess }}
          >
            <line x1={CX - arm} y1={Y0} x2={CX + arm} y2={Y0} />
          </g>
        )}

        {/* TRANSLATED, NOT REPOSITIONED — the same reasoning as the dial's
            rotation. y1/y2 are attributes and nothing can transition them, so
            the cursor is drawn once at value 0 and moved by a CSS translate
            that the easing and the drift both compose onto. */}
        {lockedGuess === null && (
          <g className="meter__drift" data-drift={interactive && !touched && !dragging ? "" : undefined}>
            <g className="meter__needle" style={{ ["--v" as string]: value }}>
              <line x1={CX - arm} y1={Y0} x2={CX + arm} y2={Y0} />
            </g>
          </g>
        )}
      </svg>

      <span className="meter__end">{left}</span>
    </div>
  );
}
