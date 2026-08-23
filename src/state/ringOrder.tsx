import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * WHICH TOUR OF THE PALETTE THE PICK-ME RING SWEEPS
 * ---------------------------------------------------------------
 * A judging control, and a temporary one. Both orders walk the same eleven
 * packs and return to the start; they are solved for different things, and
 * the difference is not settleable by argument because it is a question about
 * what the line LOOKS like:
 *
 *   tour      maximum bottleneck. The tour whose most-similar neighbouring
 *             pair is as distinct as possible — 0.317 at its weakest join,
 *             nothing under 0.3. Every pack on the line reads as its own
 *             colour. Costs 1115 degrees of hue travel: the sweep crosses
 *             every hue on the wheel three times over, and most of what it
 *             paints belongs to no pack.
 *
 *   spectrum  minimum travel, with the bottleneck held near where it was.
 *             674 degrees against 1115 — under two laps rather than over
 *             three — for a weakest join of 0.281 against 0.317.
 *
 * `tour` leads because it is what ships, so a phone that never opens this
 * control sees the ring exactly as it was.
 *
 * See RING_ORDER and RING_ORDER_SPECTRUM in games/Home.tsx for the routes
 * themselves and how each seam was placed.
 */

export const RING_STYLES = ["tour", "spectrum"] as const;
export type RingStyle = (typeof RING_STYLES)[number];

const KEY = "lastcall.ringstyle";

function read(): RingStyle {
  try {
    const raw = window.localStorage.getItem(KEY);
    return RING_STYLES.includes(raw as RingStyle) ? (raw as RingStyle) : "tour";
  } catch {
    return "tour";
  }
}

interface RingStyleValue {
  ring: RingStyle;
  setRing: (r: RingStyle) => void;
}

const RingStyleContext = createContext<RingStyleValue | null>(null);

export function RingStyleProvider({ children }: { children: ReactNode }) {
  const [ring, setRingState] = useState<RingStyle>(read);

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, ring);
    } catch {
      /* storage unavailable — the choice still holds for this session */
    }
  }, [ring]);

  const setRing = useCallback((r: RingStyle) => setRingState(r), []);
  const value = useMemo<RingStyleValue>(() => ({ ring, setRing }), [ring, setRing]);

  return <RingStyleContext.Provider value={value}>{children}</RingStyleContext.Provider>;
}

export function useRingStyle(): RingStyleValue {
  const ctx = useContext(RingStyleContext);
  if (!ctx) throw new Error("useRingStyle must be used inside <RingStyleProvider>");
  return ctx;
}
