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
 * APPEARANCE
 * ---------------------------------------------------------------
 * Light or dark, and nothing else. This used to be welded to the content
 * rating — turning on adult content also turned the app dark — which meant
 * you couldn't have one without the other. They're separate settings now:
 * this file owns how the app *looks*, `contentMode` owns what it *says*.
 *
 * Two values, deliberately: what the user ASKED for (which can be "device")
 * and what that currently RESOLVES to. Storing only the resolved value would
 * freeze the choice the first time the device flipped.
 */

export type ThemePreference = "device" | "dark" | "light";
export type ResolvedTheme = "dark" | "light";

const KEY = "lastcall.theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function readPreference(): ThemePreference {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw === "light" || raw === "dark" || raw === "device" ? raw : "dark";
  } catch {
    return "dark";
  }
}

function deviceTheme(): ResolvedTheme {
  return window.matchMedia?.(DARK_QUERY).matches === false ? "light" : "dark";
}

interface ThemeValue {
  /** What the user chose, including "device". */
  preference: ThemePreference;
  /** What that resolves to right now. */
  theme: ResolvedTheme;
  setPreference: (p: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference);
  const [deviceIsDark, setDeviceIsDark] = useState<ResolvedTheme>(deviceTheme);

  // Follow the device live — someone's phone flipping to dark at sunset should
  // take the app with it, not wait for a restart.
  useEffect(() => {
    const mq = window.matchMedia?.(DARK_QUERY);
    if (!mq) return;
    const onChange = () => setDeviceIsDark(deviceTheme());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const theme: ResolvedTheme = preference === "device" ? deviceIsDark : preference;

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, preference);
    } catch {
      /* storage unavailable — the choice still holds for this session */
    }
  }, [preference]);

  // Appearance sets the attribute and stops there. The `theme-color` meta used
  // to be written here too, from a hard-coded pair of hexes — which pinned the
  // status bar to the SHELL while the screen behind it was flooded with a pack
  // colour, and duplicated two values that already live in tokens.css. It has a
  // single owner now: `useAppBackground`, which knows which screen is open.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setPreference = useCallback((p: ThemePreference) => setPreferenceState(p), []);

  const value = useMemo<ThemeValue>(
    () => ({ preference, theme, setPreference }),
    [preference, theme, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
