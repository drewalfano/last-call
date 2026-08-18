import { useMemo, type ReactNode } from "react";
import { GameHeader } from "../components/GameHeader";
import { PromptCard } from "../components/PromptCard";
import { useDeck } from "../lib/deck";
import { categoryStyle } from "../lib/style";
import { usePool, type PoolPolicy, type Pools } from "../data/pools";
import type { ModeDef } from "../data/modes";
import { VotePad } from "../components/VotePad";
import { SplitVote, SurvivorTracker } from "../components/Mechanics";
import { useContentMode } from "../state/contentMode";
import { useRoster } from "../state/roster";
import { fillPrompt } from "../lib/prompts";
import { DRINK_IF } from "../data/drinkIf";
import { MOST_LIKELY_TO } from "../data/mostLikelyTo";
import { WOULD_YOU_RATHER, type WyrPrompt } from "../data/wouldYouRather";

/**
 * One screen, three modes.
 * Would You Rather, Drink If… and Most Likely To share the same base loop —
 * reveal a card, draw the next — so they share this component and differ by
 * config below. Each layers its own mechanic on top via `afterCard`.
 *
 * This registry used to hold five. Never Have I Ever and Happy Hour Qs were
 * retired as modes precisely because sharing this loop was all they did.
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
  /** Small print under the card. */
  hint: string;
  /**
   * Optional mechanic rendered between the card and the primary action —
   * a vote pad, a split, an elimination tracker. Receives a key that changes
   * on every draw so the mechanic can reset itself.
   */
  afterCard?: (item: T, round: number) => ReactNode;
}

/** Deck configs, keyed by mode id. Adding a plain deck mode is a config entry. */
export const DECK_GAMES = {
  "would-you-rather": {
    pools: WOULD_YOU_RATHER,
    eyebrow: "Would you rather…",
    render: (p: WyrPrompt, fill) => (
      <span className="wyr">
        <span className="wyr__option">{fill(p.a)}</span>
        <span className="wyr__or">or</span>
        <span className="wyr__option">{fill(p.b)}</span>
      </span>
    ),
    nextLabel: "Next",
    hint: "Everyone picks. No abstaining.",
    // The split IS the game; printing the pair and moving on wasted it.
    afterCard: (p: WyrPrompt, round: number) => (
      <SplitVote a={p.a} b={p.b} round={round} />
    ),
  } satisfies DeckGameConfig<WyrPrompt>,

  "drink-if": {
    pools: DRINK_IF,
    eyebrow: "Drink if…",
    render: (p: string, fill) => fill(p),
    nextLabel: "Next",
    hint: "No turns. If it's you, drink.",
    // Optional elimination layer — hidden entirely without a roster.
    afterCard: () => <SurvivorTracker />,
  } satisfies DeckGameConfig<string>,

  "most-likely-to": {
    pools: MOST_LIKELY_TO,
    eyebrow: "Most likely to…",
    render: (p: string, fill) => fill(p),
    nextLabel: "Next",
    hint: "Count down from three, then point.",
    // The whole game is the vote; until now the app only printed the sentence.
    afterCard: (_p: string, round: number) => (
      <VotePad round={round} verdict={(w) => `${w} drinks.`} />
    ),
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
  const pool = usePool(config.pools, contentMode, config.policy ?? "replace");
  const deck = useDeck(pool);

  // Resolved once per card, not per render — otherPlayer() picks at random, so
  // recomputing on every render would make the name flicker mid-prompt.
  const fill = useMemo(() => {
    const ctx = { name: currentPlayer, other: otherPlayer() };
    return (text: string) => fillPrompt(text, ctx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer, deck.drawCount]);

  return (
    <div className="screen" style={categoryStyle(mode.color)}>
      <GameHeader title={mode.title} subtitle={config.hint} onBack={onBack} />
      <div className="focal">
        <PromptCard
          eyebrow={config.eyebrow}
          dealKey={deck.drawCount}
        >
          {deck.current === undefined ? "No cards in this deck." : config.render(deck.current, fill)}
        </PromptCard>
        {deck.current !== undefined && config.afterCard?.(deck.current, deck.drawCount)}
        <p className="counter">
          {deck.position} of {deck.total}
          {deck.cycle > 0 && " · reshuffled"}
        </p>
        <div className="actions">
          <button className="btn btn--lg btn--block" onClick={deck.draw} disabled={!deck.current}>
            {config.nextLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
