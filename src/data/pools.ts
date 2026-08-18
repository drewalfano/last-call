import { useMemo } from "react";
import type { ContentMode } from "../state/contentMode";

/**
 * CONTENT POOL PLUMBING
 * ---------------------------------------------------------------
 * Every prompt-based game ships two pools. How Night relates to Safe
 * is a per-game decision, documented at the top of each data file:
 *
 *   "replace"    Night swaps the Safe pool out entirely. Used where the
 *                adult version of the game is a genuinely different set
 *                of questions rather than a spicier phrasing of the same
 *                ones — which is most modes.
 *
 *   "supplement" Night is Safe plus extra cards. Used where the Safe
 *                material is still perfectly good with a rowdier crowd
 *                and the Night cards are additive.
 *
 *   "lead"       Night is Safe with the Night entries in FRONT. This is
 *                the policy for CATEGORIES, in every mode that has them.
 *
 *                Replacing a category list is wrong: flipping to 19+ made
 *                every familiar category disappear, so a table that wanted
 *                a couple of rowdier options lost Foods, Countries and
 *                Animals to get them — categories nothing about a rowdy
 *                table makes unsuitable, and ones a long night runs out of
 *                material without. Leading keeps the whole list and puts
 *                the adult categories where they are seen first.
 *
 *                The ordering only shows where the player reads the list —
 *                Imposter's and Last Word's pickers. The Number Game draws
 *                its category blind from a shuffled deck, so there it is
 *                the KEEPING that matters, not the order.
 *
 *                Prompts are not categories and still replace. You never
 *                see the card you did not draw, so a swapped deck costs a
 *                blind draw nothing.
 *
 * Night prompts are written as different questions, not as vulgar
 * rewrites of the Safe ones.
 */
export type PoolPolicy = "replace" | "supplement" | "lead";

export interface Pools<T> {
  safe: readonly T[];
  night: readonly T[];
}

export function resolvePool<T>(
  pools: Pools<T>,
  mode: ContentMode,
  policy: PoolPolicy = "replace",
): readonly T[] {
  if (mode === "safe") return pools.safe;
  switch (policy) {
    case "supplement":
      return [...pools.safe, ...pools.night];
    case "lead":
      return [...pools.night, ...pools.safe];
    default:
      return pools.night;
  }
}

/**
 * Memoized pool for the active content mode. The stable array identity
 * matters: `useDeck` rebuilds its deck whenever the pool identity changes,
 * so an unstable reference here would reshuffle on every render.
 */
export function usePool<T>(
  pools: Pools<T>,
  mode: ContentMode,
  policy: PoolPolicy = "replace",
): readonly T[] {
  return useMemo(() => resolvePool(pools, mode, policy), [pools, mode, policy]);
}
