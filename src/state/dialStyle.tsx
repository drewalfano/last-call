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

/**
 * HOW THE PROXIMITY ZONES ARE DRAWN.
 *
 *   bar    a thick segment of the track itself, as it ships
 *   wedge  a filled sector from the hub out to the track
 *   stub   the same sector with its inner half cut away
 *
 * The argument for a wedge is that it is anchored at the HUB, so it shares an
 * origin with the needle and reads as an angle — which is the unit the reveal
 * already reports. It also has area, so the outermost step registers at all;
 * on a 14-unit rim it is a sliver.
 *
 * The argument against is the reveal, where the subject is the GAP between
 * two needles and a wedge fills exactly the space that gap lives in. `stub`
 * exists because that is a solvable problem: keep the angular anchoring and
 * the area, give the inner run of both needles clean stock to cross.
 */
export const ZONE_SHAPES = ["bar", "wedge", "stub"] as const;
export type ZoneShape = (typeof ZONE_SHAPES)[number];

/**
 * WHAT THE READER'S CLUE CARD PUTS IN FRONT OF THEM.
 *
 *   dial   the whole instrument — track, zones, answer needle
 *   zone   the scoring zone alone, with the two ends for reference
 *
 * The case for `zone`: the dial is the GROUP'S tool. It is a track you drag
 * between two ends you argue about, and the Reader drags nothing. Handing
 * them the instrument invites a positional reading — "about seventy" — when
 * what the clue needs is a felt one, just past the middle and toward Good.
 *
 * The case against is fairness: a Reader looking at exactly the geometry the
 * table will drag on knows precisely what they are asking for, and a second
 * object means translating between two pictures of the same thing.
 */
export const CLUE_MODES = ["dial", "zone"] as const;
export type ClueMode = (typeof CLUE_MODES)[number];

const KEY = "lastcall.dialstyle";
const ZONE_KEY = "lastcall.zoneshape";
const CLUE_KEY = "lastcall.cluemode";

function read(): DialStyle {
  try {
    const raw = window.localStorage.getItem(KEY);
    return DIAL_STYLES.includes(raw as DialStyle) ? (raw as DialStyle) : "card";
  } catch {
    return "card";
  }
}

function readZone(): ZoneShape {
  try {
    const raw = window.localStorage.getItem(ZONE_KEY);
    return ZONE_SHAPES.includes(raw as ZoneShape) ? (raw as ZoneShape) : "bar";
  } catch {
    return "bar";
  }
}

function readClue(): ClueMode {
  try {
    const raw = window.localStorage.getItem(CLUE_KEY);
    return CLUE_MODES.includes(raw as ClueMode) ? (raw as ClueMode) : "dial";
  } catch {
    return "dial";
  }
}

interface DialStyleValue {
  style: DialStyle;
  setStyle: (s: DialStyle) => void;
  zone: ZoneShape;
  setZone: (z: ZoneShape) => void;
  clue: ClueMode;
  setClue: (c: ClueMode) => void;
}

const DialStyleContext = createContext<DialStyleValue | null>(null);

export function DialStyleProvider({ children }: { children: ReactNode }) {
  const [style, setStyleState] = useState<DialStyle>(read);
  const [zone, setZoneState] = useState<ZoneShape>(readZone);
  const [clue, setClueState] = useState<ClueMode>(readClue);

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, style);
      window.localStorage.setItem(ZONE_KEY, zone);
      window.localStorage.setItem(CLUE_KEY, clue);
    } catch {
      /* storage unavailable — the choices still hold for this session */
    }
  }, [style, zone, clue]);

  const setStyle = useCallback((s: DialStyle) => setStyleState(s), []);
  const setZone = useCallback((z: ZoneShape) => setZoneState(z), []);
  const setClue = useCallback((c: ClueMode) => setClueState(c), []);
  const value = useMemo<DialStyleValue>(
    () => ({ style, setStyle, zone, setZone, clue, setClue }),
    [style, setStyle, zone, setZone, clue, setClue],
  );

  return <DialStyleContext.Provider value={value}>{children}</DialStyleContext.Provider>;
}

export function useDialStyle(): DialStyleValue {
  const ctx = useContext(DialStyleContext);
  if (!ctx) throw new Error("useDialStyle must be used inside <DialStyleProvider>");
  return ctx;
}
