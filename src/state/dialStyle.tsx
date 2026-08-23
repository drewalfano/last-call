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
 * WHICH INSTRUMENT BALLPARK DRAWS
 * ---------------------------------------------------------------
 * A judging control, not a preference. The dial that shipped is a semicircle
 * capped at 300px inside a card that is 353 wide, which puts a quarter of the
 * card's width into margin around the only object in the mode — and the two
 * ways out of that are not comparable on a desktop preview. One makes the arc
 * bigger by taking the card away; the other stops being an arc at all.
 *
 * So both are built and the phone decides. This lives in Settings for the
 * length of that decision and comes out with the loser.
 *
 *   card   the semicircle on white stock, exactly as it ships
 *   wide   no card, 260 degrees, arc inset to the app's own gutter
 *   meter  no card, a vertical bar with the ends stacked above and below
 *
 * `card` leads because it is what the app currently does, so a phone that has
 * never opened this control plays the shipped mode.
 */

export const DIAL_STYLES = ["card", "wide", "meter"] as const;
export type DialStyle = (typeof DIAL_STYLES)[number];

const KEY = "lastcall.dialstyle";

function read(): DialStyle {
  try {
    const raw = window.localStorage.getItem(KEY);
    return DIAL_STYLES.includes(raw as DialStyle) ? (raw as DialStyle) : "card";
  } catch {
    return "card";
  }
}

interface DialStyleValue {
  style: DialStyle;
  setStyle: (s: DialStyle) => void;
}

const DialStyleContext = createContext<DialStyleValue | null>(null);

export function DialStyleProvider({ children }: { children: ReactNode }) {
  const [style, setStyleState] = useState<DialStyle>(read);

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, style);
    } catch {
      /* storage unavailable — the choice still holds for this session */
    }
  }, [style]);

  const setStyle = useCallback((s: DialStyle) => setStyleState(s), []);
  const value = useMemo<DialStyleValue>(() => ({ style, setStyle }), [style, setStyle]);

  return <DialStyleContext.Provider value={value}>{children}</DialStyleContext.Provider>;
}

export function useDialStyle(): DialStyleValue {
  const ctx = useContext(DialStyleContext);
  if (!ctx) throw new Error("useDialStyle must be used inside <DialStyleProvider>");
  return ctx;
}
