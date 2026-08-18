import { useCallback, useEffect, useRef, useState } from "react";
import { GameHeader } from "../components/GameHeader";
import { useDeck } from "../lib/deck";
import { categoryStyle } from "../lib/style";
import { usePool } from "../data/pools";
import type { ModeDef } from "../data/modes";
import { useContentMode } from "../state/contentMode";
import { LAST_WORD_CATEGORIES } from "../data/lastWord";
import { CategoryPicker } from "../components/CategoryPicker";

/**
 * LAST WORD
 * Category → answer → tap the letter it starts with → letter locks → pass.
 *
 * The bank drops Q, U, V, X, Y and Z. That's the convention the physical
 * game it's inspired by uses, and it's the right call here for two reasons:
 * those letters are near-unplayable on most categories, and 20 buttons fit
 * a thumb-sized ring on a phone where 26 do not.
 */
const LETTERS = "ABCDEFGHIJKLMNOPRSTW".split("");

/** Seconds on the clock for each player's turn. */
const TURN_SECONDS = 15;

type Phase = "intro" | "picking" | "playing" | "lost" | "cleared";

function buzz(pattern: number | number[]) {
  navigator.vibrate?.(pattern);
}

interface Props {
  mode: ModeDef;
  onBack: () => void;
}

export function LastWord({ mode, onBack }: Props) {
  const { mode: contentMode } = useContentMode();
  // Night supplements rather than replaces here — the safe categories are
  // still good with a rowdy table.
  const categories = usePool(LAST_WORD_CATEGORIES, contentMode, "supplement");
  const deck = useDeck(categories);

  const [phase, setPhase] = useState<Phase>("intro");
  /** Set when the group picked or wrote one; otherwise the deck's draw is used. */
  const [chosen, setChosen] = useState<string | null>(null);
  const [used, setUsed] = useState<string[]>([]);
  const [remaining, setRemaining] = useState(TURN_SECONDS * 1000);
  const deadline = useRef(0);
  const primed = useRef(false);

  const startTurn = useCallback(() => {
    deadline.current = performance.now() + TURN_SECONDS * 1000;
    setRemaining(TURN_SECONDS * 1000);
  }, []);

  // Deadline-based rather than decrementing a counter, so a backgrounded
  // tab or a dropped frame can't hand a player extra time.
  useEffect(() => {
    if (phase !== "playing") return;
    let raf = 0;
    const tick = () => {
      const left = deadline.current - performance.now();
      if (left <= 0) {
        setRemaining(0);
        setPhase("lost");
        buzz([90, 60, 180]);
        return;
      }
      setRemaining(left);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const beginRound = useCallback(() => {
    // A hand-picked category sticks for its round; otherwise advance the deck.
    // A fresh deck already has one face-up, so the first round doesn't draw.
    if (!chosen) {
      if (primed.current) deck.draw();
      else primed.current = true;
    }
    setUsed([]);
    startTurn();
    setPhase("playing");
  }, [deck, startTurn, chosen]);

  const lockLetter = useCallback(
    (letter: string) => {
      if (used.includes(letter)) return;
      const next = [...used, letter];
      setUsed(next);
      buzz(25);
      if (next.length === LETTERS.length) {
        setPhase("cleared");
        return;
      }
      startTurn();
    },
    [used, startTurn],
  );

  const seconds = Math.ceil(remaining / 1000);
  const progress = remaining / (TURN_SECONDS * 1000);
  const category = chosen ?? deck.current ?? "";

  if (phase === "intro") {
    return (
      <div className="screen" style={categoryStyle(mode.color)}>
        <GameHeader title={mode.title} subtitle="New round" onBack={onBack} />
        <div className="focal">
          <div className="card">
            <span className="card__eyebrow">Category</span>
            <p className="card__prompt">{category}</p>
            <p className="card__meta">
              Say an answer, tap its first letter, pass the phone. {TURN_SECONDS} seconds each.
            </p>
          </div>
          <div className="actions--row">
            <button
              className="btn btn--ghost"
              onClick={() => {
                setChosen(null);
                deck.draw();
              }}
            >
              Random
            </button>
            <button className="btn btn--ghost" onClick={() => setPhase("picking")}>
              All categories
            </button>
          </div>
          <div className="actions">
            <button className="btn btn--lg btn--block" onClick={beginRound}>
              Start round
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "picking") {
    return (
      <div className="screen" style={categoryStyle(mode.color)}>
        <GameHeader title={mode.title} subtitle="Pick a category" onBack={onBack} />
        <CategoryPicker
          categories={categories}
          onPick={(c) => {
            setChosen(c);
            setPhase("intro");
          }}
          onCancel={() => setPhase("intro")}
        />
      </div>
    );
  }

  if (phase === "lost" || phase === "cleared") {
    const cleared = phase === "cleared";
    return (
      <div className="screen" style={categoryStyle(mode.color)}>
        <GameHeader title={mode.title} subtitle={cleared ? "Bank cleared" : "Time"} onBack={onBack} />
        <div className="focal">
          <div className="card">
            <span className="card__eyebrow">{category}</span>
            <p className="card__prompt">{cleared ? "You cleared the whole bank." : "Out of time."}</p>
            <p className="card__meta">
              {cleared
                ? "Nobody drinks. That basically never happens."
                : "Whoever's holding the phone drinks."}
            </p>
          </div>
          <div className="actions">
            <button className="btn btn--lg btn--block" onClick={beginRound}>
              Next round
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen" style={categoryStyle(mode.color)}>
      <GameHeader title={mode.title} subtitle={category} onBack={onBack} />
      <div className="focal lw">
        <div className="lw__board">
          {/* Its own row, not a centre overlay — a letter can't cover it. */}
          <div className="lw__timer" data-low={seconds <= 3 || undefined}>
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <circle className="lw__track" cx="50" cy="50" r="44" />
              <circle
                className="lw__sweep"
                cx="50"
                cy="50"
                r="44"
                style={{ strokeDashoffset: 276.5 * (1 - progress) }}
              />
            </svg>
            <span className="lw__seconds">{seconds}</span>
          </div>

          <div className="lw__grid">
            {LETTERS.map((letter) => (
              <button
                key={letter}
                className="lw__letter"
                data-locked={used.includes(letter) || undefined}
                disabled={used.includes(letter)}
                onClick={() => lockLetter(letter)}
                aria-label={`${letter}${used.includes(letter) ? " (already used)" : ""}`}
              >
                {letter}
              </button>
            ))}
          </div>
        </div>

        <p className="counter">
          {used.length} of {LETTERS.length} letters gone
        </p>
        <div className="actions">
          <button className="btn btn--ghost btn--block" onClick={() => setPhase("lost")}>
            Can't go — I drink
          </button>
        </div>
      </div>
    </div>
  );
}
