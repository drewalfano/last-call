import { useEffect, useRef } from "react";

/**
 * SOMETHING PRIVATE IS ON SCREEN, AND THE SCREEN JUST STOPPED BEING LOOKED AT.
 * ---------------------------------------------------------------
 * The one leak pass-the-phone cannot police by hand: the card is face up,
 * the phone locks or the app is switched away from, and it wakes on the table
 * showing the answer. Nobody let go of anything; the page simply stopped
 * being visible. So visibility itself turns the card back over.
 *
 * `visibilitychange` is the event that fires when an app is backgrounded or
 * the screen locks; `pagehide` covers the tab being frozen or navigated. What
 * neither promises is anything about the operating system's app switcher —
 * the thumbnail iOS takes on the way out is the OS's business, and this hook
 * makes no claim about it.
 *
 * The callback is read through a ref, so the caller can pass an inline arrow
 * without re-binding the listeners on every render.
 */
export function useWhenHidden(active: boolean, onHide: () => void): void {
  const cb = useRef(onHide);
  cb.current = onHide;
  useEffect(() => {
    if (!active) return;
    const hide = () => {
      if (document.visibilityState === "hidden") cb.current();
    };
    const gone = () => cb.current();
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", gone);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", gone);
    };
  }, [active]);
}
