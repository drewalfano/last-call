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
    /* Only the white-ink packs define one; everything else falls through to
       transparent and carries no edge at all. See .btn--float. */
    ["--category-edge" as keyof CSSProperties]: `var(${colorVar}-edge, transparent)`,
    ...extra,
  } as CSSProperties;
}
