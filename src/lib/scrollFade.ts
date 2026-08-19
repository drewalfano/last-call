import type { UIEvent } from "react";

/** How far you scroll before the top fade is at full depth. */
const FADE_IN_PX = 56;
/** How deep the fade goes once it is fully in. */
const FADE_MAX_PX = 26;

/**
 * Ramps the top fade on a scroller in proportion to how far it has scrolled,
 * so the first row of content is untouched at rest and only dissolves once it
 * is actually passing under the top edge.
 *
 * Written straight to a custom property rather than through state: this fires
 * on every scroll frame and has no business causing a React render. The
 * property drives a mask — see `.picker__scroll` in games.css.
 */
export function fadeOnScroll(e: UIEvent<HTMLDivElement>): void {
  const t = Math.min(1, e.currentTarget.scrollTop / FADE_IN_PX);
  e.currentTarget.style.setProperty("--fade-ramp", `${(t * FADE_MAX_PX).toFixed(1)}px`);
}
