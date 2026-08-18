import { useEffect } from "react";

/**
 * THE STATUS BAR IS PART OF THE SCREEN.
 * ---------------------------------------------------------------
 * Installed on iOS the app is full-bleed: `viewport-fit=cover` plus
 * `apple-mobile-web-app-status-bar-style: black-translucent` in index.html
 * means the web view runs under the status bar and iOS draws no chrome of its
 * own there — the page's own paint shows through, with light status icons.
 *
 * Except that `theme-color` outranks it. On iOS 16.4+ an installed web app
 * paints `theme-color` behind the status bar, so a meta pinned to the SHELL
 * colour puts a near-black (or, in light appearance, a WHITE) band above a
 * screen flooded with a pack colour. That band was the frosted strip over
 * Kings Cup's green: not iOS refusing to cooperate, just two colours being
 * asked for at once.
 *
 * So there is exactly one owner of "what colour is the app right now", and it
 * writes that answer to three places at once:
 *
 *   1. `--app-bg` on the root element, which html / body / #root paint, so no
 *      layer underneath the flooded `.app` can ever expose a different colour
 *      through the safe-area strips or an overscroll bounce.
 *   2. the `theme-color` meta, so iOS's status-bar band is the same colour.
 *   3. nothing else. `.app` already floods from `--category`.
 *
 * `--app-bg` is stored as the `var()` REFERENCE rather than a resolved hex, so
 * flipping appearance re-resolves `--shell-bg` for free. The meta needs a real
 * colour, so that one is resolved through `getComputedStyle` — which keeps
 * tokens.css the single source of truth for the value either way.
 */

/** The token every screen falls back to: Home, and anything not in a mode. */
export const SHELL_TOKEN = "--shell-bg";

function resolveToken(token: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim();
}

/**
 * @param token A custom-property NAME from tokens.css (`--cat-kings-cup`),
 *   not a colour. Pass the mode's own `color` field straight through.
 * @param themeKey Anything that changes when the palette does. Appearance
 *   flips what `--shell-bg` resolves to without changing the token name, so
 *   the meta has to be recomputed even though the token is identical.
 */
export function useAppBackground(token: string, themeKey: string): void {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--app-bg", `var(${token})`);

    const meta = document.querySelector('meta[name="theme-color"]');
    // Resolved after the property is set, so a token that references another
    // token still lands on a literal colour.
    const color = resolveToken(token);
    if (meta && color) meta.setAttribute("content", color);
  }, [token, themeKey]);
}
