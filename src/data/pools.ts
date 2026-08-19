import { useMemo } from "react";
import type { ContentMode } from "../state/contentMode";

/**
 * CONTENT POOL PLUMBING
 * ---------------------------------------------------------------
 * Every prompt-based game ships two pools. Flipping the content mode
 * ADDS the other one. It never takes the first one away.
 *
 *   "supplement" Night is Safe plus the adult cards. The order is left to
 *                whatever deals it — every consumer of this shuffles.
 *
 *   "lead"       Night LEADS Safe — in front, but interleaved rather than
 *                stacked. Same contents as supplement; this one also makes
 *                a claim about ORDER, so it is for the pools a player
 *                READS: Imposter's, Last Word's, Rank It's and Say the Same
 *                Thing's pickers.
 *
 *                A straight concatenation put every adult entry above every
 *                ordinary one, so the top of a 19+ list was a solid block of
 *                the same register — you scrolled past a wall of hookups and
 *                exes before reaching Foods. Leading breaks that up without
 *                burying the adult entries, which are still what the table
 *                switched the mode on for.
 *
 * There is deliberately no third option that drops the Safe pool.
 *
 * It used to exist, as "replace", and it was the default: Night swapped Safe
 * out entirely, on the reasoning that a blind draw never shows you the card
 * it did not deal, so nothing visibly disappeared. That reasoning was wrong
 * about what a table wants and only ever looked right because the loss was
 * invisible. Nothing about a rowdy crowd makes "Countries", "Fast food" or a
 * warm-up question unsuitable — a Night deck that threw out the entire Safe
 * pool halved the material available to a mode on the longest night of the
 * week, to make room for cards it could simply have had as well.
 *
 * It went wrong visibly in Say the Same Thing, where the same pool gained a
 * picker: flipping to 19+ deleted forty-four openers in front of the table to
 * add thirty-two. The bug was never the picker. It was the policy.
 *
 * So: two policies, both additive, and no way to spell the third. A mode
 * chooses between them on one question — does a player read this list, or is
 * it dealt blind?
 *
 * Night prompts are written as different questions, not as vulgar
 * rewrites of the Safe ones.
 */
export type PoolPolicy = "supplement" | "lead";

export interface Pools<T> {
  safe: readonly T[];
  night: readonly T[];
}

/**
 * Night in front, with Safe entries sprinkled through it.
 *
 * One safe entry every `every` night ones, which is what keeps the top of the
 * list from reading as a solid block of one register.
 *
 * Deterministic, deliberately. This is a list people browse and come back to;
 * shuffling it would move an option someone was reaching for, and useDeck
 * shuffles anyway wherever the order is actually dealt from.
 */
export function lead<T>(night: readonly T[], safe: readonly T[], every = 2): T[] {
  const out: T[] = [];
  let s = 0;
  night.forEach((item, i) => {
    out.push(item);
    if ((i + 1) % every === 0 && s < safe.length) out.push(safe[s++]);
  });
  return out.concat(safe.slice(s));
}

export function resolvePool<T>(
  pools: Pools<T>,
  mode: ContentMode,
  policy: PoolPolicy = "supplement",
): readonly T[] {
  if (mode === "safe") return pools.safe;
  return policy === "lead" ? lead(pools.night, pools.safe) : [...pools.safe, ...pools.night];
}

/**
 * Memoized pool for the active content mode. The stable array identity
 * matters: `useDeck` rebuilds its deck whenever the pool identity changes,
 * so an unstable reference here would reshuffle on every render.
 */
export function usePool<T>(
  pools: Pools<T>,
  mode: ContentMode,
  policy: PoolPolicy = "supplement",
): readonly T[] {
  return useMemo(() => resolvePool(pools, mode, policy), [pools, mode, policy]);
}
