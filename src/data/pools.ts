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
 * Night prompts are written as different questions, not as vulgar
 * rewrites of the Safe ones.
 */
export type PoolPolicy = "replace" | "supplement";

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
  return policy === "supplement" ? [...pools.safe, ...pools.night] : pools.night;
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
