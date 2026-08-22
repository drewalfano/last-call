import { useMemo } from "react";
import { CONTENT_TIERS, type ContentMode } from "../state/contentMode";

/**
 * CONTENT POOL PLUMBING
 * ---------------------------------------------------------------
 * Every prompt-based game ships up to three pools, and raising the content
 * mode ADDS the next one. It never takes a lower one away.
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
  /**
   * Optional, deliberately. A game with nothing written at this tier simply
   * plays the two below it — which is what lets the tier ship one game at a
   * time instead of all eleven at once.
   */
  filthy?: readonly T[];
}

/**
 * ROUND-ROBIN, NOT A HIERARCHY.
 *
 * With two tiers this was `lead(night, safe)`: night in front, one safe entry
 * sprinkled every two. That was already a compromise — it put Countries and
 * Foods two thirds of the way down a list people browse — and nesting it for a
 * third tier makes it worse twice over, because safe then sits below night
 * which sits below filthy.
 *
 * These lists are the games that are NOT drinking games at heart. Colours,
 * Cities and Animals are the best thing in them at every level, and a player
 * who turned Filthy on did not stop wanting to play Animals. So the tiers deal
 * one each, top down, and repeat: the tier you just unlocked is on top, and
 * nothing you already had drops out of reach behind it.
 *
 * Whatever runs out first stops being dealt; the rest carry on in order. So a
 * short filthy pool seasons the top of the list rather than monopolising it,
 * which is exactly what a four-category tier should do to a forty-category one.
 */
function roundRobin<T>(tiers: readonly (readonly T[])[]): T[] {
  const out: T[] = [];
  const longest = Math.max(0, ...tiers.map((t) => t.length));
  for (let i = 0; i < longest; i++) {
    for (const tier of tiers) if (i < tier.length) out.push(tier[i]);
  }
  return out;
}

/**
 * The tiers at or below `mode`, in order, skipping any the game has not
 * written. Everything else here is a decision about how to lay them out.
 */
function tiersFor<T>(pools: Pools<T>, mode: ContentMode): (readonly T[])[] {
  const all: (readonly T[] | undefined)[] = [pools.safe, pools.night, pools.filthy];
  return all.slice(0, CONTENT_TIERS.indexOf(mode) + 1).filter(Boolean) as (readonly T[])[];
}

export function resolvePool<T>(
  pools: Pools<T>,
  mode: ContentMode,
  policy: PoolPolicy = "supplement",
): readonly T[] {
  const tiers = tiersFor(pools, mode);
  if (tiers.length === 1) return tiers[0];
  // Dealt blind: order is never seen, and every consumer shuffles anyway.
  if (policy === "supplement") return tiers.flat();
  // Browsed: spiciest first, but one of each, so nothing is buried.
  return roundRobin([...tiers].reverse());
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
