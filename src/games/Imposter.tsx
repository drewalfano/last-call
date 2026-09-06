import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CardBody, GameScreen } from "../components/GameScreen";
import { randomItem } from "../lib/deck";
import { categoryNames, wordsFor } from "../data/imposter";
import { CategoryPicker } from "../components/CategoryPicker";
import { Stepper } from "../components/Stepper";
import { Switch } from "../components/Switch";
import { useContentMode } from "../state/contentMode";
import { useRoster } from "../state/roster";
import { useExitGuard } from "../state/exitGuard";
import { useWhenHidden } from "../lib/useWhenHidden";
import { audio } from "../lib/audio";
import type { ModeDef } from "../data/modes";
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  afterHide,
  clampCount,
  deal,
  isLive,
  onHidden,
  rosterNote,
  type RolePhase,
} from "./imposterLogic";

/**
 * IMPOSTER
 * One phone, one secret word, one player who never sees it.
 *
 * The whole game rests on a single guarantee: a role is only ever on screen
 * for the player it belongs to. Every reveal is bracketed by a neutral cover
 * screen, and the phase machine below can never move from one player's role
 * straight to the next — "role" always returns to "cover". The phone being
 * put down mid-role goes back to that cover too; see useWhenHidden.
 *
 * The reveal order is the ROSTER'S order, cut at a random seat — see
 * imposterLogic.ts for why that beat a shuffle.
 */

interface State {
  phase: RolePhase;
  count: number;
  word: string;
  /**
   * The nudge dealt alongside the word, shown to the Imposter alone and only
   * when the table asked for one. Empty when a custom word was typed in.
   */
  hint: string;
  /** Whether this table plays with hints at all. Set before the deal. */
  showHint: boolean;
  /** Index into the player list, not into the reveal order. */
  imposter: number;
  /** Player indices in seating order from a random start. */
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

  const defaultCount = clampCount(hasRoster ? players.length : 4);

  const [s, setS] = useState<State>({
    phase: "setup",
    count: defaultCount,
    word: "",
    hint: "",
    /* Off. The mode's whole shape is that one player is out in the cold, and
       a table meeting it for the first time should meet that version. */
    showHint: false,
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
    setS((prev) => ({ ...prev, count: clampCount(next) }));
  }, []);

  /**
   * Deals: a word, an Imposter, an order, back to the first reveal. Guarded
   * on the phase so a double tap on Deal roles deals once.
   */
  const startRound = useCallback(() => {
    setS((prev) => {
      if (prev.phase !== "setup") return prev;
      // A custom entry isn't a category — it IS the word. Otherwise draw from
      // the chosen category, or from everything when none is set.
      const isCustom = prev.category !== null && !categories.includes(prev.category);
      /* A typed word has no hint and cannot be given one: nothing in this app
         knows what "Steve's boat" is about. */
      const [word, hint] = isCustom
        ? ([prev.category!, ""] as const)
        : randomItem(wordsFor(contentMode, prev.category));
      return { ...prev, phase: "cover", word, hint, ...deal(prev.count), at: 0 };
    });
  }, [contentMode, categories]);

  /**
   * Back to the screen the round is set up on, carrying everything the
   * table chose there. Nothing is dealt until they ask for it.
   */
  const backToSetup = useCallback(() => {
    setS((prev) => ({ ...prev, phase: "setup" }));
  }, []);

  const currentPlayer = s.order[s.at];
  const isImposter = currentPlayer === s.imposter;

  /* A deal in progress is the thing the X must not throw away by reflex. */
  useExitGuard(isLive(s.phase));

  /* A role on a screen nobody is looking at goes back to its cover, for the
     same player. Nothing advances; the role has to be asked for again. */
  useWhenHidden(s.phase === "role", () => setS(onHidden));

  /* The new card is what to read next, so it takes focus as it arrives. */
  const focalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    focalRef.current?.focus({ preventScroll: true });
  }, [s.phase, s.at]);

  /**
   * THE HEADER CARRIES THE ONE LIVE THING ON THE SCREEN. During the deal that
   * is which reveal you are on — the whole game is passing the phone in the
   * right order. The setup screen's one piece of state, the category, sits
   * on the control that changes it, so the header says nothing there.
   */
  const label = useMemo(() => {
    if (s.phase === "cover" || s.phase === "role") return `Reveal ${s.at + 1} of ${s.count}`;
    if (s.phase === "ready") return "Clues";
    return undefined;
  }, [s.phase, s.at, s.count]);

  const excess = hasRoster && players.length > MAX_PLAYERS;

  return (
    <GameScreen
      mode={mode}
      subtitle={label}
      hideHeader={s.phase === "picking"}
      /* The one screen in this game nobody else may read. */
      isPrivate={s.phase === "role"}
      onBack={onBack}
    >
      {/* ---------- Setup ---------- */}
      {s.phase === "setup" && (
        <CardBody
          card={
            <div className="card imp-setup" ref={focalRef} tabIndex={-1}>
              <span className="card__eyebrow">Players</span>
              <Stepper
                value={s.count}
                min={MIN_PLAYERS}
                max={MAX_PLAYERS}
                onChange={setCount}
                noun="player"
              />
              {/* ONE SENTENCE ABOUT THE ROSTER, and it says the awkward
                  thing out loud: a roster longer than the game does not get
                  quietly trimmed — it says who plays and how to change it. */}
              <p className="card__meta" data-warn={excess || undefined}>
                One of you won't get the word. {rosterNote(hasRoster ? players.length : 0, s.count)}
              </p>

              {/* THE ROUND'S ONE OPTION, under the count and behind a rule,
                  with one line saying what turning it on changes. */}
              <Switch
                className="switch--card"
                checked={s.showHint}
                onChange={(next) => setS((prev) => ({ ...prev, showHint: next }))}
                label="Imposter hint"
              />
              <p className="card__meta imp-setup__hint">
                {s.showHint
                  ? "The Imposter gets a one-word nudge nobody else sees, and can't say it as their clue."
                  : "Off: the Imposter plays on their ears alone. Turn on for a one-word nudge."}
              </p>
            </div>
          }
        >
          {/* ONE CONTROL FOR THE CATEGORY. It used to be two pills, Random
              and Categories, given the same weight as each other and nearly
              the weight of Deal roles — for a setting most tables never
              touch, because Any already deals a fresh category every round.
              The value and the way to change it are one quiet row now. */}
          <button
            className="imp-cat"
            onClick={() => setS((prev) => ({ ...prev, phase: "picking" }))}
            aria-label={`Category: ${s.category ?? "any"}. Change`}
          >
            <span className="imp-cat__label">Category</span>
            <span className="imp-cat__value">{s.category ?? "Any"}</span>
            <span className="imp-cat__hint">
              {s.category === null ? "A different one every deal" : "Change"}
            </span>
          </button>

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
          customNote="Whoever types this will see it, and can still be dealt the Imposter. Your table, your call."
          anyLabel="Any category"
          onAny={() => setS((prev) => ({ ...prev, category: null, phase: "setup" }))}
          onPick={(c) => setS((prev) => ({ ...prev, category: c, phase: "setup" }))}
          onCancel={() => setS((prev) => ({ ...prev, phase: "setup" }))}
        />
      )}

      {/* ---------- Cover screen: nothing secret on it ---------- */}
      {s.phase === "cover" && (
        <CardBody
          card={
            <div className="card" key={`cover-${s.at}`} ref={focalRef} tabIndex={-1}>
              <span className="card__eyebrow">Pass the phone to</span>
              <p className="card__prompt">{nameOf(currentPlayer)}</p>
              <p className="card__meta">
                {s.at === 0
                  ? `${nameOf(currentPlayer)} goes first. Don't let anyone else see the screen.`
                  : `${s.at} of ${s.count} have seen theirs. Don't let anyone else see the screen.`}
              </p>
            </div>
          }
        >
          {/* A deal can go wrong halfway through. Back to the setup screen,
              not straight into another deal, and on the cover screen only —
              the role screen is the one thing nobody but its owner may see,
              and a control that throws the round has no business there. */}
          <button className="gfoot__skip" onClick={backToSetup}>
            Start over
          </button>
          <div className="actions">
            <button
              className="btn btn--lg btn--block"
              onClick={() => setS((prev) => (prev.phase === "cover" ? { ...prev, phase: "role" } : prev))}
            >
              {nameOf(currentPlayer)}: show my role
            </button>
          </div>
        </CardBody>
      )}

      {/* ---------- The role itself ---------- */}
      {s.phase === "role" && (
        <CardBody
          card={
            <div className={isImposter ? "card imp-card--imposter" : "card"} ref={focalRef} tabIndex={-1}>
              {isImposter ? (
                <>
                  <span className="card__eyebrow">No word for you</span>
                  <p className="card__prompt">You're the Imposter</p>
                  {s.showHint && s.hint ? (
                    <p className="imp-hint">
                      <span className="imp-hint__label">Hint</span>
                      <span className="imp-hint__text">{s.hint}</span>
                      <span className="imp-hint__rule">
                        It isn't the word, and you can't use it as your clue.
                        Listen hard, blend in, don't get caught.
                      </span>
                    </p>
                  ) : (
                    <p className="card__meta imp-card__meta">
                      {s.showHint
                        ? "No hint — someone typed this word in. Listen hard, give a clue that fits, don't get caught."
                        : "Listen hard. Give a clue that fits. Don't get caught."}
                    </p>
                  )}
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
              onClick={() => {
                /* Sounded from THIS player's press: the handover is the thing
                   being confirmed and it happens here. The last press starts
                   the round rather than passing the phone, so it takes `go`. */
                audio.play(s.at + 1 < s.count ? "advance" : "go");
                setS(afterHide);
              }}
            >
              {s.at + 1 < s.count ? `Hide & pass to ${nameOf(s.order[s.at + 1])}` : "Hide & start clues"}
            </button>
          </div>
        </CardBody>
      )}

      {/* ---------- Clues ---------- */}
      {s.phase === "ready" && (
        <CardBody
          card={
            <div className="card" ref={focalRef} tabIndex={-1}>
              <span className="card__eyebrow">Everyone's seen theirs</span>
              <p className="card__prompt card__prompt--sm">
                Go round the group. One clue each about the word.
              </p>
              <p className="card__meta">
                {s.showHint && s.hint
                  ? "Don't make it too obvious. The Imposter has a vague hint " +
                    "they're not allowed to say, and has to blend in on that. " +
                    "Argue it out, point at someone, and let them own up."
                  : "Don't make it too obvious. The Imposter is listening and " +
                    "has to blend in. Argue it out, point at someone, and let " +
                    "the Imposter own up. Everyone but them already knows the word."}
              </p>
            </div>
          }
        >
          <div className="actions">
            {/* The app deals the roles and gets out of the way. It has no
                reveal and keeps no score: the table settles it. */}
            <button className="btn btn--lg btn--block" onClick={backToSetup}>
              New game
            </button>
          </div>
        </CardBody>
      )}
    </GameScreen>
  );
}
