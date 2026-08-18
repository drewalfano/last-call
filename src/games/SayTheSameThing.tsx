import { useCallback, useMemo, useState } from "react";
import { CardBody, GameScreen } from "../components/GameScreen";
import { Countdown } from "../components/Countdown";
import { useDeck, shuffle } from "../lib/deck";
import { buzz } from "../lib/useCountdown";
import { usePool } from "../data/pools";
import { SAY_THE_SAME_THING } from "../data/sayTheSameThing";
import { useContentMode } from "../state/contentMode";
import { useRoster } from "../state/roster";
import type { ModeDef } from "../data/modes";

/**
 * SAY THE SAME THING
 *
 * Two players try to say the same word at the same moment. They won't, first
 * time — so their two answers become the next prompt, and they keep trying to
 * meet in the middle.
 *
 * The phone is purely the host here. It picks the pair, gives the opening
 * word, and counts them in; it never asks anyone to type an answer, because
 * the two players should be looking at each other rather than at a screen.
 * Nothing but the attempt count is tracked, and the table decides what counts
 * as a match — "close enough" is a conversation, not a string comparison.
 */

type Phase = "pair" | "counting" | "answer" | "matched";

interface Props {
  mode: ModeDef;
  onBack: () => void;
}

export function SayTheSameThing({ mode, onBack }: Props) {
  const { mode: contentMode } = useContentMode();
  const { players, hasRoster } = useRoster();
  const pool = usePool(SAY_THE_SAME_THING, contentMode);
  const deck = useDeck(pool);

  const [phase, setPhase] = useState<Phase>("pair");
  const [round, setRound] = useState(0);
  const [attempt, setAttempt] = useState(1);

  /**
   * A fresh pair each round. Roster names when they exist, neutral labels when
   * they don't — the game works either way, it's just better with names.
   */
  const pair = useMemo(() => {
    if (hasRoster && players.length >= 2) {
      const [a, b] = shuffle(players);
      return [a, b] as const;
    }
    return ["Player 1", "Player 2"] as const;
    // Re-picked per round, not per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, hasRoster, players]);

  const startAttempt = useCallback(() => setPhase("counting"), []);

  const said = useCallback(() => {
    buzz([120, 60, 120]);
    setPhase("answer");
  }, []);

  const tryAgain = useCallback(() => {
    setAttempt((n) => n + 1);
    setPhase("counting");
  }, []);

  /**
   * A new word for the same pair. Deliberately not `nextRound`: the pair has
   * not had a go yet, so it is the word being rejected, not them.
   */
  const skip = useCallback(() => {
    deck.draw();
    setAttempt(1);
  }, [deck]);

  const nextRound = useCallback(() => {
    deck.draw();
    setAttempt(1);
    setRound((n) => n + 1);
    setPhase("pair");
  }, [deck]);

  return (
    /* The attempt count is what the pair is being scored on, so it is the
       live line. "Pick two" was not — the card says it. */
    <GameScreen
      mode={mode}
      subtitle={phase === "pair" ? undefined : `Attempt ${attempt}`}
      onBack={onBack}
    >
      {/* The count-in takes the card's slot rather than the whole screen, so
          the numbers land on the same spot the word just left. */}
      {phase === "counting" ? (
        <CardBody card={<Countdown key={`${round}-${attempt}`} action="Say it" onDone={said} />} />
      ) : (
        <CardBody
          card={
            <div className="card">
              <span className="card__eyebrow">
                {phase === "matched"
                  ? "Matched"
                  : attempt === 1
                    ? "Starting word"
                    : "Find the middle"}
              </span>

              {phase === "matched" ? (
                <>
                  <p className="card__prompt">
                    {attempt === 1 ? "First try." : `Took ${attempt} goes.`}
                  </p>
                  <p className="card__meta">
                    {pair[0]} and {pair[1]} are on the same wavelength. Everyone else drinks.
                  </p>
                </>
              ) : (
                <>
                  <p className="card__prompt">{deck.current ?? ""}</p>
                  <p className="card__meta">
                    {attempt === 1
                      ? `${pair[0]} and ${pair[1]}, say the first thing you think of — at the same time.`
                      : "Say the word that connects your two answers. At the same time."}
                  </p>
                </>
              )}
            </div>
          }
        >
          {phase === "pair" && (
            <button className="gfoot__skip" onClick={skip}>
              New word
            </button>
          )}

          {phase === "pair" && (
            <div className="actions">
              <button className="btn btn--lg btn--block" onClick={startAttempt}>
                Count us in
              </button>
            </div>
          )}

          {phase === "answer" && (
            <div className="actions">
              <button
                className="btn btn--lg btn--block"
                onClick={() => {
                  buzz([40, 50, 40, 50, 120]);
                  setPhase("matched");
                }}
              >
                Matched
              </button>
              <button className="btn btn--ghost btn--block" onClick={tryAgain}>
                Try again
              </button>
            </div>
          )}

          {phase === "matched" && (
            <div className="actions">
              <button className="btn btn--lg btn--block" onClick={nextRound}>
                New pair
              </button>
            </div>
          )}
        </CardBody>
      )}
    </GameScreen>
  );
}
