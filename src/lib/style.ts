import type { CSSProperties } from "react";

/**
 * Carries a mode's category color into a subtree as `--category`, plus the
 * ink paired with it as `--category-ink`.
 *
 * The palette runs from near-black brown to pale periwinkle, so there is no
 * single foreground that reads on all eleven cards — each color ships with the
 * ink that clears contrast on it (see tokens.css). Components reference
 * var(--category) / var(--category-ink) and never know which mode they're in.
 */
export function categoryStyle(colorVar: string, extra?: CSSProperties): CSSProperties {
  return {
    ["--category" as keyof CSSProperties]: `var(${colorVar})`,
    ["--category-ink" as keyof CSSProperties]: `var(${colorVar}-ink)`,
    ...extra,
  } as CSSProperties;
}
