import { useCallback, useMemo, useState } from "react";
import { CardBody, GameScreen } from "../components/GameScreen";
import { randomItem, shuffle } from "../lib/deck";
import { categoryNames, wordsFor } from "../data/imposter";
import { CategoryPicker } from "../components/CategoryPicker";
import { useContentMode } from "../state/contentMode";
import { useRoster } from "../state/roster";
import type { ModeDef } from "../data/modes";

/**
 * IMPOSTER
 * One phone, one secret word, one player who never sees it.
 *
 * The whole game rests on a single guarantee: a role is only ever on screen
 * for the player it belongs to. Every reveal is bracketed by a neutral cover
 * screen, and the phase machine below can never move from one player's role
 * straight to the next — "role" always returns to "cover".
 *
 * The reveal order is shuffled too. If the phone always went 1, 2, 3… a table
 * could start reading something into who hesitated and when; shuffling makes
 * position tell you nothing.
 */

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 10;

type Phase = "setup" | "picking" | "cover" | "role" | "ready";

interface State {
  phase: Phase;
  count: number;
  word: string;
  /** Index into the player list, not into the reveal order. */
  imposter: number;
  /** Shuffled player indices — the order the phone goes round. */
  order: number[];
  /** How far through the reveal order we are. */
  at: number;
  /** Chosen word category, or null for "any". */
  category: string | null;
}

interface Props {
  mode: ModeDef;
  onBack: () => void;
}

export function Imposter({ mode, onBack }: Props) {
  const { mode: contentMode } = useContentMode();
  const { players, hasRoster } = useRoster();
  const categories = categoryNames(contentMode);

  const defaultCount = Math.min(
    MAX_PLAYERS,
    Math.max(MIN_PLAYERS, hasRoster ? players.length : 4),
  );

  const [s, setS] = useState<State>({
    phase: "setup",
    count: defaultCount,
    word: "",
    imposter: 0,
    order: [],
    at: 0,
    category: null,
  });

  /**
   * Real names when the table entered them, numbers otherwise — and it
   * degrades per player, so a roster of three in a game of five reads
   * "Drew, Sam, Alex, Player 4, Player 5" rather than falling back wholesale.
   */
  const nameOf = useCallback(
    (i: number) => (hasRoster && players[i] ? players[i] : `Player ${i + 1}`),
    [hasRoster, players],
  );


  const setCount = useCallback((next: number) => {
    setS((prev) => ({
      ...prev,
      count: Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, next)),
    }));
  }, []);

  const startRound = useCallback(() => {
    setS((prev) => {
      // A custom entry isn't a category — it IS the word. Otherwise draw from
      // the chosen category, or from everything when none is set.
      const isCustom = prev.category !== null && !categories.includes(prev.category);
      const word = isCustom
        ? prev.category!
        : randomItem(wordsFor(contentMode, prev.category));
      return {
        ...prev,
        phase: "cover",
        word,
        imposter: Math.floor(Math.random() * prev.count),
        order: shuffle(Array.from({ length: prev.count }, (_, i) => i)),
        at: 0,
      };
    });
  }, [contentMode, categories]);

  const playAgain = useCallback(() => {
    setS((prev) => ({ ...prev, phase: "setup" }));
  }, []);

  const currentPlayer = s.order[s.at];
  const isImposter = currentPlayer === s.imposter;

  const label = useMemo(() => {
    switch (s.phase) {
      case "setup": return "Set up the round";
      case "picking": return "Pick a category";
      case "cover":
      case "role": return `Reveal ${s.at + 1} of ${s.count}`;
      default: return "Clues";
    }
  }, [s.phase, s.at, s.count]);

  /**
   * Only the reveal counter is live data. "Set up the round" and "Pick a
   * category" name where you are and belong under the title like every other
   * state label — blown up and centred, a setup screen announced itself louder
   * than the thing it was setting up.
   */
  const labelIsLive = s.phase === "cover" || s.phase === "role";

  return (
    /* Which reveal you are on — the whole game is passing the phone in
       the right order, so that one cannot be a caption. */
    <GameScreen
      mode={mode}
      subtitle={label}
      subtitleTone={labelIsLive ? "content" : "label"}
      onBack={onBack}
    >
      {/* ---------- Setup ---------- */}
      {s.phase === "setup" && (
        <CardBody
          card={
            <div className="card">
            <span className="card__eyebrow">Players</span>
            <div className="imp-count">
              <button
                className="imp-count__step"
                onClick={() => setCount(s.count - 1)}
                disabled={s.count <= MIN_PLAYERS}
                aria-label="One fewer player"
              >
                −
              </button>
              <span className="imp-count__n">{s.count}</span>
              <button
                className="imp-count__step"
                onClick={() => setCount(s.count + 1)}
                disabled={s.count >= MAX_PLAYERS}
                aria-label="One more player"
              >
                +
              </button>
            </div>
            <p className="card__meta">
              One of you won't get the word.{" "}
              {hasRoster
                ? players.length >= s.count
                  ? "Using your player names."
                  : `Using your ${players.length} names, then numbers.`
                : "Add names on Home to use them here."}
              </p>
            </div>
          }
        >
          <p className="pick-line">
            Category · <strong>{s.category ?? "Any"}</strong>
          </p>
          <div className="actions--row">
            <button
              className="btn btn--ghost"
              onClick={() =>
                setS((prev) => ({ ...prev, category: randomItem(categories) }))
              }
            >
              Random
            </button>
            <button
              className="btn btn--ghost"
              onClick={() => setS((prev) => ({ ...prev, phase: "picking" }))}
            >
              Categories
            </button>
          </div>

          <div className="actions">
            <button className="btn btn--lg btn--block" onClick={startRound}>
              Deal roles
            </button>
          </div>
        </CardBody>
      )}

      {/* ---------- Category picker ---------- */}
      {s.phase === "picking" && (
        <CategoryPicker
          categories={categories}
          customNoun="word"
          customNote="Whoever types this will see it — and can still be dealt the Imposter. Your table, your call."
          onPick={(c) => setS((prev) => ({ ...prev, category: c, phase: "setup" }))}
          onCancel={() => setS((prev) => ({ ...prev, phase: "setup" }))}
        />
      )}

      {/* ---------- Cover screen: nothing secret on it ---------- */}
      {s.phase === "cover" && (
        <CardBody
          card={
            <div className="card">
              <span className="card__eyebrow">Pass the phone to</span>
              <p className="card__prompt">{nameOf(currentPlayer)}</p>
              <p className="card__meta">Don't let anyone else see the screen.</p>
            </div>
          }
        >
          <div className="actions">
            <button
              className="btn btn--lg btn--block"
              onClick={() => setS((prev) => ({ ...prev, phase: "role" }))}
            >
              View role
            </button>
          </div>
        </CardBody>
      )}

      {/* ---------- The role itself ---------- */}
      {s.phase === "role" && (
        <CardBody
          card={
            <div className={isImposter ? "card imp-card--imposter" : "card"}>
              {isImposter ? (
                <>
                  <span className="card__eyebrow">No word for you</span>
                  <p className="card__prompt">You're the Imposter</p>
                  <p className="card__meta imp-card__meta">
                    Listen hard. Give a clue that fits. Don't get caught.
                  </p>
                </>
              ) : (
                <>
                  <span className="card__eyebrow">The word is</span>
                  <p className="card__prompt">{s.word}</p>
                  <p className="card__meta">One clue each. Don't make it obvious.</p>
                </>
              )}
            </div>
          }
        >
          <div className="actions">
            <button
              className="btn btn--lg btn--block"
              onClick={() =>
                setS((prev) => {
                  const next = prev.at + 1;
                  // Always back to a cover screen — never straight to the next
                  // player's role.
                  return next >= prev.count
                    ? { ...prev, phase: "ready" }
                    : { ...prev, phase: "cover", at: next };
                })
              }
            >
              Hide role
            </button>
          </div>
        </CardBody>
      )}

      {/* ---------- Clues ---------- */}
      {s.phase === "ready" && (
        <CardBody
          card={
            <div className="card">
              <span className="card__eyebrow">Everyone ready?</span>
              <p className="card__prompt card__prompt--sm">
                Go round the group. One clue each about the word.
              </p>
              <p className="card__meta">
                Don't make it too obvious — the Imposter is listening and has to
                blend in. Argue it out, point at someone, and let the Imposter own
                up. Everyone but them already knows the word.
              </p>
            </div>
          }
        >
          <div className="actions">
            {/* The app deals the roles and gets out of the way. It has no
                reveal and keeps no score: everyone except the Imposter knows
                the word, so the table can settle all of it themselves. */}
            <button className="btn btn--lg btn--block" onClick={playAgain}>
              New game
            </button>
          </div>
        </CardBody>
      )}
    </GameScreen>
  );
}
