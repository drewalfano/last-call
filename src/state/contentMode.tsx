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

export type ContentMode = "safe" | "night";

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
  isNight: boolean;
  /** Flip between Safe and 19+. Switches immediately. */
  toggle: () => void;
}

const ContentModeContext = createContext<ContentModeValue | null>(null);

export function ContentModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ContentMode>(() =>
    readStored<ContentMode>(MODE_KEY, ["safe", "night"], "safe"),
  );
  useEffect(() => {
    writeStored(MODE_KEY, mode);
  }, [mode]);

  const toggle = useCallback(
    () => setMode((m) => (m === "night" ? "safe" : "night")),
    [],
  );

  const value = useMemo<ContentModeValue>(
    () => ({ mode, isNight: mode === "night", toggle }),
    [mode, toggle],
  );

  return <ContentModeContext.Provider value={value}>{children}</ContentModeContext.Provider>;
}

export function useContentMode(): ContentModeValue {
  const ctx = useContext(ContentModeContext);
  if (!ctx) throw new Error("useContentMode must be used inside <ContentModeProvider>");
  return ctx;
}
