import type { CSSProperties } from "react";

/**
 * Carries a mode's category color into a subtree as `--category`, plus the
 * ink paired with it as `--category-ink`.
 *
 * The palette runs from near-black brown to pale periwinkle, so there is no
 * single foreground that reads on all eleven cards — each color ships with the
 * ink that clears contrast on it (see tokens.css). Components reference
 * var(--category) / var(--category-ink) and never know which mode they're in.
 *
 * `--category-edge` comes with them and is usually nothing: it is defined only
 * for the packs whose ink is white, which are the only ones where a floating
 * button needs an outline to stay off the card stock behind it.
 */
export function categoryStyle(colorVar: string, extra?: CSSProperties): CSSProperties {
  return {
    ["--category" as keyof CSSProperties]: `var(${colorVar})`,
    ["--category-ink" as keyof CSSProperties]: `var(${colorVar}-ink)`,
    /* Only the white-ink packs define these; everything else falls through to
       the defaults. See .btn--float and .lw__letter. */
    ["--category-edge" as keyof CSSProperties]: `var(${colorVar}-edge, transparent)`,
    /* The letter bank's chip and its letter. Defaults are the dark chip and
       white letter the bank had before this was a token — which is the right
       answer on every pale pack and the wrong one on every dark pack, which
       is exactly why the pack gets to say. */
    ["--category-key" as keyof CSSProperties]: `var(${colorVar}-key, #141414)`,
    ["--category-key-ink" as keyof CSSProperties]: `var(${colorVar}-key-ink, #FFFFFF)`,
    ...extra,
  } as CSSProperties;
}
