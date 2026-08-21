import { useMemo, type ReactNode } from "react";
import { CardBody, GameScreen } from "../components/GameScreen";
import { PromptCard } from "../components/PromptCard";
import { useDeck } from "../lib/deck";
import { usePool, type PoolPolicy, type Pools } from "../data/pools";
import type { ModeDef } from "../data/modes";
import { useContentMode } from "../state/contentMode";
import { useRoster } from "../state/roster";
import { fillPrompt } from "../lib/prompts";
import { DRINK_IF } from "../data/drinkIf";

/**
 * One screen, one mode — for now.
 * Would You Rather, Drink If… and Most Likely To share the same base loop —
 * reveal a card, draw the next — so they share this component and differ by
 * config below.
 *
 * This registry used to hold five. Never Have I Ever and Happy Hour Qs were
 * retired as modes precisely because sharing this loop was all they did.
 *
 * It also used to have an `afterCard` slot, for a mechanic between the card
 * and the primary action. Drink If was the only config that ever filled it,
 * with an elimination tracker, and that is gone — so the slot went with it
 * rather than sitting here as an extension point with nothing on the other
 * end. It is a small component and a config field; if a mode ever needs one
 * again it comes back in the shape that mode actually wants.
 */
export interface DeckGameConfig<T> {
  pools: Pools<T>;
  policy?: PoolPolicy;
  /** Uppercase line above the prompt on the card. */
  eyebrow?: string;
  /**
   * Renders one drawn item into the card body. `fill` resolves the {name} /
   * {other} / {left} tokens a prompt may carry against the current roster,
   * falling back to generic wording when nobody entered names.
   */
  render: (item: T, fill: (text: string) => string) => ReactNode;
  /** Primary action label. */
  nextLabel: string;
}

/** Deck configs, keyed by mode id. Adding a plain deck mode is a config entry. */
export const DECK_GAMES = {
  "drink-if": {
    pools: DRINK_IF,
    eyebrow: "Drink if…",
    render: (p: string, fill) => fill(p),
    nextLabel: "Next",
  } satisfies DeckGameConfig<string>,

} as const;

export type DeckGameId = keyof typeof DECK_GAMES;

export function isDeckGame(id: string): id is DeckGameId {
  return id in DECK_GAMES;
}

interface DeckGameProps {
  mode: ModeDef;
  config: DeckGameConfig<never>;
  onBack: () => void;
}

export function DeckGame({ mode, config, onBack }: DeckGameProps) {
  const { mode: contentMode } = useContentMode();
  const { currentPlayer, otherPlayer } = useRoster();
  const pool = usePool(config.pools, contentMode, config.policy ?? "supplement");
  const deck = useDeck(pool);

  // Resolved once per card, not per render — otherPlayer() picks at random, so
  // recomputing on every render would make the name flicker mid-prompt.
  const fill = useMemo(() => {
    const ctx = { name: currentPlayer, other: otherPlayer() };
    return (text: string) => fillPrompt(text, ctx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer, deck.drawCount]);

  return (
    <GameScreen mode={mode} onBack={onBack}>
      <CardBody
        card={
          <PromptCard eyebrow={config.eyebrow} dealKey={deck.drawCount}>
            {deck.current === undefined
              ? "No cards in this deck."
              : config.render(deck.current, fill)}
          </PromptCard>
        }
      >
        <p className="counter">
          {deck.position} of {deck.total}
          {deck.cycle > 0 && " · reshuffled"}
        </p>
        <div className="actions">
          <button
            className="btn btn--lg btn--block"
            onClick={deck.draw}
            disabled={!deck.current}
          >
            {config.nextLabel}
          </button>
        </div>
      </CardBody>
    </GameScreen>
  );
}
