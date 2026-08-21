/**
 * READING THE MOTION TOKENS FROM SCRIPT.
 *
 * Most of this app's motion is CSS, and CSS reads tokens for free. The two
 * transitions that are not — the launch and the close — are driven on the
 * Web Animations API, because only script can know where a card is on
 * screen, and script cannot read a custom property by writing `var()`.
 *
 * That gap is why the delay axis went uncentralised for so long: any value
 * a timeout or an `animate()` call needed had to be a literal, and a
 * literal beside the code that uses it is where a number goes to stop
 * being a token. This closes it in the one direction that matters — the
 * stylesheet stays the single place the value is written down, and script
 * asks it rather than restating it.
 *
 * It does NOT exist to drag the launch's own constants out of App.tsx.
 * Those carry the reasoning for why they are what they are, and that prose
 * is worth more than the tidiness of moving the numbers; see LAUNCH_MS and
 * the block above CLOSE_MS. This is for values that genuinely belong to
 * the shared system and are needed on both sides of it.
 */

/**
 * A duration token in milliseconds.
 *
 * Accepts either unit CSS allows in a <time>, because a token written as
 * `0.07s` is as correct as `70ms` and the next person to edit tokens.css
 * should not have to know which one script can parse.
 *
 * The fallback is not decoration. A custom property can come back empty —
 * a typo'd name, a stylesheet that has not applied yet on a cold start, a
 * token deleted without its readers being updated — and returning NaN from
 * here would feed NaN to a timeout, which fires immediately, or to
 * `animate()`, which throws. Falling back means the worst case is motion
 * at the wrong speed rather than motion that has broken.
 */
export function motionMs(name: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  if (!raw) return fallback;
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) return fallback;
  return raw.endsWith("ms") ? n : raw.endsWith("s") ? n * 1000 : fallback;
}
