import { useCallback, useEffect, useState } from "react";
import { GameHeader } from "../components/GameHeader";
import { PromptCard } from "../components/PromptCard";
import { shuffle, useDeck } from "../lib/deck";
import { categoryStyle } from "../lib/style";
import { usePool } from "../data/pools";
import type { ModeDef } from "../data/modes";
import { useContentMode } from "../state/contentMode";
import { VotePad } from "../components/VotePad";
import { useRoster } from "../state/roster";
import { fillPrompt } from "../lib/prompts";
import { LAST_CALL, WILDCARD_LABEL, type Wildcard } from "../data/lastCall";

interface Props {
  mode: ModeDef;
  onBack: () => void;
}

/**
 * Deals every intensity-1 card, then every 2, then every 3 — shuffled
 * within each tier. That's what makes a round *escalate*: the table warms
 * up on social prompts and only gets to the chaotic ones once it's ready,
 * rather than opening on a card that kills the mood.
 */
function escalating(pool: readonly Wildcard[]): Wildcard[] {
  return [
    ...shuffle(pool.filter((c) => c.intensity === 1)),
    ...shuffle(pool.filter((c) => c.intensity === 2)),
    ...shuffle(pool.filter((c) => c.intensity === 3)),
  ];
}

const TIER_LABEL = ["Warming up", "Getting personal", "Last call"] as const;

export function LastCallGame({ mode, onBack }: Props) {
  const { mode: contentMode } = useContentMode();
  const { currentPlayer, otherPlayer, advance, hasRoster } = useRoster();
  const pool = usePool(LAST_CALL, contentMode);
  const deck = useDeck<Wildcard>(pool, escalating);
  const card = deck.current;

  // A tier change is the point of this mode, and until now it was invisible —
  // announce it once, on the card that crosses over.
  const [lastTier, setLastTier] = useState<number | null>(null);
  const [crossing, setCrossing] = useState(false);

  useEffect(() => {
    if (!card) return;
    if (lastTier !== null && card.intensity > lastTier) setCrossing(true);
    setLastTier(card.intensity);
  }, [card, lastTier]);

  const draw = useCallback(() => {
    advance();
    deck.draw();
  }, [advance, deck]);

  return (
    <div className="screen" style={categoryStyle(mode.color)}>
      <GameHeader
        title={mode.title}
        subtitle={
          card
            ? hasRoster
              ? `${currentPlayer} · ${TIER_LABEL[card.intensity - 1]}`
              : TIER_LABEL[card.intensity - 1]
            : undefined
        }
        onBack={onBack}
      />
      <div className="focal focal--overlay">
        {crossing && card && (
          <button className="lc-tier" onClick={() => setCrossing(false)}>
            <span className="lc-tier__label">{TIER_LABEL[card.intensity - 1]}</span>
            <span className="lc-tier__hint">Tap to carry on</span>
          </button>
        )}
        <PromptCard
          eyebrow={card ? WILDCARD_LABEL[card.kind] : undefined}
          dealKey={deck.drawCount}
          footer={
            card && (
              <span className="heat" aria-label={`Intensity ${card.intensity} of 3`}>
                {[1, 2, 3].map((n) => (
                  <span key={n} className="heat__pip" data-lit={n <= card.intensity || undefined} />
                ))}
              </span>
            )
          }
        >
          {card
            ? fillPrompt(card.text, { name: currentPlayer, other: otherPlayer() })
            : "No cards in this deck."}
        </PromptCard>
        {/* Vote cards get the real mechanic; every other kind is unchanged. */}
        {card?.kind === "vote" && (
          <VotePad round={deck.drawCount} verdict={(w) => `${w} drinks.`} />
        )}
        <p className="counter">
          {deck.position} of {deck.total}
          {deck.cycle > 0 && " · new round"}
        </p>
        <div className="actions">
          <button className="btn btn--lg btn--block" onClick={draw} disabled={!card}>
            Next player
          </button>
        </div>
      </div>
    </div>
  );
}
