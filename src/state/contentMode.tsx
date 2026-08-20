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
 * GLOBAL CONTENT MODE
 *
 * Surfaced in Settings as "Safe" and "19+". The internal value stays `night`
 * because it names the `night:` key every data file is keyed on — renaming it
 * would churn nine content files for no behavioural gain. Appearance is a
 * separate setting entirely; see state/theme.tsx.
 * ---------------------------------------------------------------
 * One mode for the entire app. There are deliberately NO per-game
 * Safe/Night (or Chill/Chaotic) toggles anywhere — switching here
 * immediately re-points every game at the matching content pool.
 *
 * The selected rating persists. Game state intentionally does not — a refresh
 * mid-party should drop you back on Home, not resurrect a half-played round.
 */

/**
 * THREE TIERS, AND THE KEYS ARE NOT THE LABELS.
 *
 * `safe` and `night` keep their names because every content file is keyed on
 * them and renaming would churn ten files for no behavioural gain. What the
 * player sees is Mild / Spicy / Filthy, decided in Settings — so the wording
 * can change forever without a data edit.
 *
 * The axis is WHO IS AT THE TABLE, not how rude the words are:
 *   safe    plays sober, with anyone
 *   night   friends at a bar you are not especially close to
 *   filthy  people who will not repeat it
 *
 * Ordered, and the order is the whole contract: a tier ADDS the ones below it.
 * See data/pools.ts.
 */
export const CONTENT_TIERS = ["safe", "night", "filthy"] as const;
export type ContentMode = (typeof CONTENT_TIERS)[number];

const MODE_KEY = "lastcall.contentMode";

/** localStorage can throw in private mode / embedded webviews. Never let it break the party. */
function readStored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return allowed.includes(raw as T) ? (raw as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — mode still works for this session */
  }
}

interface ContentModeValue {
  mode: ContentMode;
  /** Position in CONTENT_TIERS — what "adds the ones below it" is measured on. */
  tier: number;
  setMode: (m: ContentMode) => void;
}

const ContentModeContext = createContext<ContentModeValue | null>(null);

export function ContentModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ContentMode>(() =>
    readStored<ContentMode>(MODE_KEY, CONTENT_TIERS, "safe"),
  );
  useEffect(() => {
    writeStored(MODE_KEY, mode);
  }, [mode]);

  const setMode = useCallback((m: ContentMode) => setModeState(m), []);

  const value = useMemo<ContentModeValue>(
    () => ({ mode, tier: CONTENT_TIERS.indexOf(mode), setMode }),
    [mode, setMode],
  );

  return <ContentModeContext.Provider value={value}>{children}</ContentModeContext.Provider>;
}

export function useContentMode(): ContentModeValue {
  const ctx = useContext(ContentModeContext);
  if (!ctx) throw new Error("useContentMode must be used inside <ContentModeProvider>");
  return ctx;
}
