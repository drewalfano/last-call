import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A SHEET THAT LEAVES AS WELL AS ARRIVES.
 *
 * The component that knows it is leaving holds itself on screen for the exit,
 * then tells its owner. Lifted out of Settings so the side panel leaves the
 * same way — see the note there for why the hold is a timeout and not
 * `animationend`, and why a second dismiss is ignored.
 *
 * Escape closes it, as it always has.
 */
export function useSheetExit(onClose: () => void, ms: number) {
  const [leaving, setLeaving] = useState(false);
  const exit = useRef<number>(undefined);

  const close = useCallback(() => {
    if (exit.current !== undefined) return;
    setLeaving(true);
    exit.current = window.setTimeout(onClose, ms);
  }, [onClose, ms]);

  useEffect(() => () => window.clearTimeout(exit.current), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  return { leaving, close };
}
