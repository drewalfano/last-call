import { useCallback, useEffect, useMemo, useState } from "react";
import { CardBody, GameScreen } from "../components/GameScreen";
import { PromptCard } from "../components/PromptCard";
import { shuffle, useDeck } from "../lib/deck";
import { usePool } from "../data/pools";
import type { ModeDef } from "../data/modes";
import { useContentMode } from "../state/contentMode";
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
  const pool = usePool(LAST_CALL, contentMode, "supplement");
  const deck = useDeck<Wildcard>(pool, escalating);
  const card = deck.current;

  // A tier change is the point of this mode, and until now it was invisible —
  // announce it once, on the card that crosses over.
  const [lastTier, setLastTier] = useState<number | null>(null);
  const [crossing, setCrossing] = useState(false);
  /** The pass is spent. The round ends on a card rather than reshuffling. */
  const [finished, setFinished] = useState(false);

  /**
   * How many cards each tier holds, and how many sit before it.
   *
   * The deck-wide "12 of 56" could not say where a level ended, and the
   * levels are not even thirds: safe runs 27 / 31 / 18 and 19+ runs
   * 19 / 17 / 20. So the counter reads within the level instead, which is
   * the only number that tells a table how much of THIS level is left.
   */
  const tiers = useMemo(() => {
    const size = [1, 2, 3].map((t) => pool.filter((c) => c.intensity === t).length);
    return { size, before: [0, size[0], size[0] + size[1]] };
  }, [pool]);

  useEffect(() => {
    if (!card) return;
    if (lastTier !== null && card.intensity > lastTier) setCrossing(true);
    setLastTier(card.intensity);
  }, [card, lastTier]);

  const draw = useCallback(() => {
    if (deck.atEnd) {
      setFinished(true);
      return;
    }
    advance();
    deck.draw();
  }, [advance, deck]);

  /**
   * Leave this level early. Forward only: the mode exists to escalate, and a
   * table that has gone chaotic does not want the warm-up prompts back.
   */
  const nextTier = card && card.intensity < 3 ? card.intensity + 1 : null;
  const skipLevel = useCallback(() => {
    if (nextTier === null) return;
    advance();
    deck.skipTo((c) => c.intensity === nextTier);
  }, [advance, deck, nextTier]);

  const newRound = useCallback(() => {
    deck.reset();
    setFinished(false);
    setLastTier(null);
    setCrossing(false);
  }, [deck]);

  if (finished) {
    return (
      <GameScreen mode={mode} onBack={onBack}>
        <CardBody
          card={
            <div className="card">
              <span className="card__eyebrow">That's the round</span>
              <p className="card__prompt">No cards left.</p>
              <p className="card__meta">
                {"Pour another and go again — it deals from the top."}
              </p>
            </div>
          }
        >
          <div className="actions">
            <button className="btn btn--lg btn--block" onClick={newRound}>
              New round
            </button>
          </div>
        </CardBody>
      </GameScreen>
    );
  }

  return (
    <GameScreen
      mode={mode}
      subtitle={
        card
          ? hasRoster
            ? `${currentPlayer} · ${TIER_LABEL[card.intensity - 1]}`
            : TIER_LABEL[card.intensity - 1]
          : undefined
      }
      /* ------------------------------------------------------------
         THE INTENSITY PIPS BELONG TO THE LEVEL, NOT THE CARD.

         They sat in the card's footer, under the prompt, which made
         them read as a property of that one card — and at board size,
         three 3px dashes at the foot of a 64px prompt are the smallest
         thing on the screen carrying some of the most useful state.

         What they actually qualify is the live line directly above:
         WARMING UP, GETTING PERSONAL, LAST CALL. This is the status
         strip's exact job — see .gheader__aside — and it hangs 20px
         under the live line without being part of what centres it, so
         adding them cannot move the line off the position every other
         mode shares.
         ------------------------------------------------------------ */
      aside={
        card ? (
          <span className="heat" aria-label={`Intensity ${card.intensity} of 3`}>
            {[1, 2, 3].map((n) => (
              <span key={n} className="heat__pip" data-lit={n <= card.intensity || undefined} />
            ))}
          </span>
        ) : undefined
      }
      onBack={onBack}
    >
      <CardBody
        card={
          /* The tier interstitial covers the card and nothing else. It lives
             in the slot because the slot is the positioned box it sizes
             itself against — and the card's own radius is the one it wears. */
          <>
            {crossing && card && (
              <button className="lc-tier" onClick={() => setCrossing(false)}>
                <span className="lc-tier__label">{TIER_LABEL[card.intensity - 1]}</span>
                <span className="lc-tier__hint">Tap to carry on</span>
              </button>
            )}
            <PromptCard
              eyebrow={card ? WILDCARD_LABEL[card.kind] : undefined}
              dealKey={deck.drawCount}
              /* A vote card says how it settles, and then the table settles
                 it. See the note on the pad below. */
              footer={card?.kind === "vote" ? "Most votes drinks." : undefined}
            >
              {card
                ? fillPrompt(card.text, { name: currentPlayer, other: otherPlayer() })
                : "No cards in this deck."}
            </PromptCard>
          </>
        }
      >
        {/* No vote pad. A vote card used to deal a roster of tappable
            names, a reveal button and a running tally under the prompt —
            three controls and a hidden state machine for something a
            table does in two seconds by pointing at each other, stacked
            between the card and the primary action. The card carries the
            outcome instead: the prompt says who to vote on, the footer
            says most votes drinks, and Next player is the only thing to
            press. */}
        {card && (
          <p className="counter">
            {deck.position - tiers.before[card.intensity - 1]} of{" "}
            {tiers.size[card.intensity - 1]}
          </p>
        )}
        {/* Both actions go dead behind the interstitial.

            The level card covers the prompt and says "Tap to carry on", which
            is the only thing that should be pressable while it is up — a live
            Next player underneath it lets a table skip past the one moment
            this mode exists to announce, and worse, spend a card without ever
            seeing it. Disabled rather than hidden: the row keeps its shape, so
            nothing moves when the level card goes and the buttons come back. */}
        <div className="actions">
          <button
            className="btn btn--lg btn--block"
            onClick={draw}
            disabled={!card || crossing}
          >
            Next player
          </button>
          {/* Named by destination, not by direction. The jump is forward only
              and the cards in between do not come back, so the table should
              see what it is committing to before it commits. */}
          {nextTier !== null && (
            <button
              className="btn btn--ghost btn--block"
              onClick={skipLevel}
              disabled={crossing}
            >
              Skip to {TIER_LABEL[nextTier - 1]}
            </button>
          )}
        </div>
      </CardBody>
    </GameScreen>
  );
}
