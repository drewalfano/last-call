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
 *
 * `data-fading` is what actually switches the mask on, and it exists because a
 * mask that fades NOTHING is not free. At rest the ramp is 0, which makes the
 * gradient's two stops land on the same pixel — mathematically a no-op, so the
 * rule looked harmless and stayed on permanently. But a masked element is a
 * composited element whatever the mask says, and iOS rasterises that layer
 * separately: the result was a hairline of softening along the top edge of
 * every picker and the Kings Cup rules sheet, on screens that were not being
 * scrolled and had nothing to fade. Off at rest, the layer does not exist.
 *
 * Clamped at the bottom too. iOS reports a NEGATIVE scrollTop through an
 * elastic overscroll, which drove the ramp negative and inverted the gradient
 * — a stop before the origin, which is the one arrangement that can make the
 * mask do something visible at the exact moment the content is bouncing.
 */
export function fadeOnScroll(e: UIEvent<HTMLDivElement>): void {
  const el = e.currentTarget;
  const t = Math.min(1, Math.max(0, el.scrollTop / FADE_IN_PX));
  const ramp = t * FADE_MAX_PX;
  el.style.setProperty("--fade-ramp", `${ramp.toFixed(1)}px`);
  el.toggleAttribute("data-fading", ramp > 0);
}
