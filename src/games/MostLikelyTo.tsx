import { useCallback, useState } from "react";
import { CardBody, GameScreen } from "../components/GameScreen";
import { PromptCard } from "../components/PromptCard";
import { Countdown } from "../components/Countdown";
import { useDeck } from "../lib/deck";
import { buzz } from "../lib/useCountdown";
import { usePool } from "../data/pools";
import { MOST_LIKELY_TO } from "../data/mostLikelyTo";
import { useContentMode } from "../state/contentMode";
import type { ModeDef } from "../data/modes";

/**
 * MOST LIKELY TO
 *
 * Deliberately NOT an on-screen ballot. The whole point is that everyone
 * physically points at someone on the same beat — the arms going up around the
 * table is the game, and a grid of names to tap replaces that with people
 * looking at a phone.
 *
 * So the app does the one thing a room can't do reliably for itself: count
 * everyone in at exactly the same moment.
 */

type Phase = "prompt" | "counting" | "pointed";

interface Props {
  mode: ModeDef;
  onBack: () => void;
}

export function MostLikelyTo({ mode, onBack }: Props) {
  const { mode: contentMode } = useContentMode();
  const pool = usePool(MOST_LIKELY_TO, contentMode);
  const deck = useDeck(pool);
  const [phase, setPhase] = useState<Phase>("prompt");

  const next = useCallback(() => {
    deck.draw();
    setPhase("prompt");
  }, [deck]);

  const pointed = useCallback(() => {
    // The landing beat: a longer, heavier pattern than the ticks before it.
    buzz([120, 60, 120]);
    setPhase("pointed");
  }, []);

  return (
    <GameScreen
      mode={mode}
      subtitle={phase === "counting" ? "Get ready" : "Most likely to…"}
      onBack={onBack}
    >
      {/* The count-in takes the card's slot rather than the whole screen, so
          the numbers land on the same spot the prompt just left. */}
      {phase === "counting" ? (
        <CardBody card={<Countdown key={deck.drawCount} action="Point" onDone={pointed} />} />
      ) : (
        <CardBody
          card={
            <PromptCard eyebrow="Most likely to…" dealKey={deck.drawCount}>
              {deck.current ?? "No cards in this deck."}
            </PromptCard>
          }
        >
          {phase === "pointed" ? (
            <>
              <p className="mlt__verdict">Most fingers drinks.</p>
              <div className="actions">
                <button className="btn btn--lg btn--block" onClick={next}>
                  Next prompt
                </button>
              </div>
            </>
          ) : (
            <div className="actions">
              <button
                className="btn btn--lg btn--block"
                onClick={() => setPhase("counting")}
                disabled={!deck.current}
              >
                Everyone ready
              </button>
            </div>
          )}
        </CardBody>
      )}
    </GameScreen>
  );
}
