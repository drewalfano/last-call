import { useCallback, useMemo, useState } from "react";
import { CardBody, GameScreen } from "../components/GameScreen";
import { PlayingCard } from "../components/PlayingCard";
import { deal, freshDeck, SUITS, type Card, type Suit } from "../lib/cards";
import type { ModeDef } from "../data/modes";
import { useRoster } from "../state/roster";
import { audio } from "../lib/audio";

/**
 * RIDE THE BUS
 * The one fully mechanical mode — a real shuffled 52-card deck, no prompt
 * content, so no Safe/Night split applies here. The global mode still
 * re-themes the shell around it.
 *
 * Four setup rounds, each wrong guess costing a drink, then the bus:
 * higher/lower until you string four right together.
 */

type Phase = "red-black" | "higher-lower" | "inside-outside" | "suit" | "bus" | "results";

const SETUP_PHASES: Phase[] = ["red-black", "higher-lower", "inside-outside", "suit"];

/** Correct calls in a row needed to get off the bus. */
const BUS_TARGET = 4;

/**
 * A wrong guess costs its round number, the way the pub game plays it: round
 * one is a sip, round four hurts. On the bus every miss is one.
 */
const ROUND_COST = [1, 2, 3, 4];

/**
 * Which round, then what it asks — on two lines, always.
 *
 * They ran together as "Round 2 · Higher or lower" and wrapped wherever the
 * width happened to run out, so the break landed mid-question on some rounds
 * and after the number on others. The round and the question are two
 * different things and each gets its own line. See `white-space` on
 * .gheader__now.
 */
const PHASE_LABEL: Record<Phase, string> = {
  "red-black": "Round 1\nRed or black",
  "higher-lower": "Round 2\nHigher or lower",
  "inside-outside": "Round 3\nInside or outside",
  suit: "Round 4\nGuess the suit",
  bus: "The bus",
  results: "Results",
};

interface State {
  phase: Phase;
  deck: Card[];
  /** The four setup cards, in order. */
  table: Card[];
  /** The card the bus is currently sitting on. */
  busCard: Card | null;
  streak: number;
  drinks: number;
  /** Set the moment a guess resolves; cleared when the player continues. */
  verdict: { correct: boolean; text: string } | null;
}

/** Who the phone goes to when this rider is done. */
function useNextRider(): string | undefined {
  const { players, currentPlayer } = useRoster();
  if (players.length === 0) return undefined;
  const i = currentPlayer ? players.indexOf(currentPlayer) : -1;
  return players[(i + 1) % players.length];
}

function initialState(): State {
  return {
    phase: "red-black",
    deck: freshDeck(),
    table: [],
    busCard: null,
    streak: 0,
    drinks: 0,
    verdict: null,
  };
}

interface Props {
  mode: ModeDef;
  onBack: () => void;
}

export function RideTheBus({ mode, onBack }: Props) {
  const [s, setS] = useState<State>(initialState);
  const { currentPlayer, advance, hasRoster } = useRoster();

  const guessSetup = useCallback((choice: string) => {
    /* The card, from the press that turns it. Not inside the updater below:
       a state updater can be run more than once for the same event, and a
       sound is not something you want replayed because React re-derived a
       value. This is also the one sound in the app that is an OBJECT rather
       than a confirmation of a press, so it belongs to the deal itself. */
    audio.play("card");
    setS((prev) => {
      const { card, rest } = deal(prev.deck);
      const correct = judgeSetup(prev.phase, choice, card, prev.table);
      const cost = ROUND_COST[SETUP_PHASES.indexOf(prev.phase)] ?? 1;
      return {
        ...prev,
        deck: rest,
        table: [...prev.table, card],
        drinks: prev.drinks + (correct ? 0 : cost),
        verdict: {
          correct,
          text: correct
            ? "Correct. Pass it on."
            : `Wrong. Take ${cost}.`,
        },
      };
    });
  }, []);

  const continueSetup = useCallback(() => {
    /* This one only sometimes deals: on the last setup round it flips the
       bus's opening card, and before that it just moves the phase on. So the
       sound is conditional on the same test the updater makes — asked out
       here, where it can be asked once. Without it the one card the player
       does not choose would be the one that arrives in silence. */
    if (!SETUP_PHASES[SETUP_PHASES.indexOf(s.phase) + 1]) audio.play("card");
    setS((prev) => {
      const next = SETUP_PHASES[SETUP_PHASES.indexOf(prev.phase) + 1];
      if (next) return { ...prev, phase: next, verdict: null };
      // Setup done — flip the bus's opening card.
      const { card, rest } = deal(prev.deck);
      return { ...prev, phase: "bus", deck: rest, busCard: card, verdict: null };
    });
  }, [s.phase]);

  const guessBus = useCallback((choice: "higher" | "lower") => {
    audio.play("card");
    setS((prev) => {
      if (!prev.busCard) return prev;
      const { card, rest } = deal(prev.deck);
      // Ties lose, same as the setup rounds.
      const correct =
        choice === "higher" ? card.rank > prev.busCard.rank : card.rank < prev.busCard.rank;
      const streak = correct ? prev.streak + 1 : 0;
      const off = streak >= BUS_TARGET;
      return {
        ...prev,
        deck: rest,
        busCard: card,
        streak,
        drinks: prev.drinks + (correct ? 0 : 1),
        phase: off ? "results" : prev.phase,
        verdict: off
          ? null
          : {
              correct,
              text: correct
                ? `${streak} in a row. ${BUS_TARGET - streak} to go.`
                : "Wrong. Drink, streak resets.",
            },
      };
    });
  }, []);

  const clearVerdict = useCallback(() => setS((prev) => ({ ...prev, verdict: null })), []);
  const restart = useCallback(() => setS(initialState()), []);

  const subtitle = useMemo(
    () =>
      hasRoster && s.phase !== "results"
        ? `${currentPlayer}\n${PHASE_LABEL[s.phase]}`
        : PHASE_LABEL[s.phase],
    [s.phase, hasRoster, currentPlayer],
  );
  const latest = s.table[s.table.length - 1] ?? null;
  const nextRider = useNextRider();

  return (
    /* Whose turn it is, and which round — both live. */
    <GameScreen
      mode={mode}
      subtitle={subtitle}
      aside={
        s.phase !== "results" ? (
          <div className="rtb__tally">
            <span>
              Drinks <strong>{s.drinks}</strong>
            </span>
            {s.phase === "bus" && (
              <span>
                Streak <strong>{s.streak}</strong> / {BUS_TARGET}
              </span>
            )}
          </div>
        ) : undefined
      }
      onBack={onBack}
    >
      {s.phase === "results" ? (
        <CardBody
          className="rtb"
          card={
            <div className="card">
              <span className="card__eyebrow">Off the bus</span>
              <p className="card__prompt">
                {s.drinks === 0
                  ? "Clean run. Nobody drank."
                  : `${s.drinks} drink${s.drinks === 1 ? "" : "s"} on the way.`}
              </p>
              <p className="card__meta">Hand the phone to the next rider.</p>
            </div>
          }
        >
          <div className="actions">
            <button
              className="btn btn--lg btn--block"
              onClick={() => {
                advance();
                restart();
              }}
            >
              {hasRoster ? `Hand to ${nextRider}` : "Next player"}
            </button>
          </div>
        </CardBody>
      ) : (
        <div className="focal rtb">
            {/* Cards and verdict as ONE centred object. The felt used to
                carry .focal__center itself, and its auto block margins then
                sat BETWEEN the cards and the verdict — moving the verdict
                out of .actions cut the distance from 294px to 168 and no
                further, because the slack simply reappeared above it.
                Centre the pair and the sentence stays with its cards. */}
            <div className="rtb__table focal__center">
            <div className="rtb__felt">
              {s.phase === "bus" ? (
                <PlayingCard card={s.busCard} />
              ) : (
                <div className="rtb__row">
                  {[0, 1, 2, 3].map((i) => (
                    <PlayingCard
                      key={i}
                      card={s.table[i] ?? null}
                      placeholder={s.table[i] === undefined}
                      small
                    />
                  ))}
                </div>
              )}
            </div>

            {/* The verdict belongs to the CARDS, so it sits under them
                rather than in the row of buttons. It was authored inside
                .actions, which is grounded at the bottom of the screen —
                on a 13" that put "Wrong. Take 1." 294px below the four
                cards it is a verdict on, reading as a caption for the
                button instead. Nothing about the cards said what had
                happened to them. */}
            {/* Always rendered, hidden when there is nothing to say, so its
                row is reserved and the cards do not jump 20px the moment a
                guess resolves — the same trick .gfoot__skip uses, and for
                the same reason: this game's whole content is four cards you
                are reading, and they must not move under you.
                `visibility`, not opacity, so it leaves the a11y tree too. */}
            <p
              className="rtb__verdict"
              data-good={s.verdict?.correct || undefined}
              data-hidden={!s.verdict || undefined}
            >
              {s.verdict?.text ?? "\u00a0"}
            </p>
            </div>

            {s.verdict ? (
              <div className="actions">
                <button
                  className="btn btn--lg btn--block"
                  onClick={s.phase === "bus" ? clearVerdict : continueSetup}
                >
                  {s.phase === "bus" ? "Keep going" : "Next round"}
                </button>
              </div>
            ) : (
              <div className="actions">
                <p className="rtb__ask">{questionFor(s.phase, s.table, s.busCard, latest)}</p>
                <div className="rtb__choices">
                  {choicesFor(s.phase).map((c) => (
                    <button
                      key={c.value}
                      className="btn btn--block rtb__choice"
                      data-suit={c.suit || undefined}
                      onClick={() =>
                        s.phase === "bus"
                          ? guessBus(c.value as "higher" | "lower")
                          : guessSetup(c.value)
                      }
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
        </div>
      )}
    </GameScreen>
  );
}

/** Ties always lose — on the line, you drink. */
function judgeSetup(phase: Phase, choice: string, card: Card, table: Card[]): boolean {
  switch (phase) {
    case "red-black":
      return choice === (card.red ? "red" : "black");
    case "higher-lower": {
      const prev = table[0].rank;
      return choice === "higher" ? card.rank > prev : card.rank < prev;
    }
    case "inside-outside": {
      const lo = Math.min(table[0].rank, table[1].rank);
      const hi = Math.max(table[0].rank, table[1].rank);
      const inside = card.rank > lo && card.rank < hi;
      const outside = card.rank < lo || card.rank > hi;
      return choice === "inside" ? inside : outside;
    }
    case "suit":
      return choice === card.suit;
    default:
      return false;
  }
}

function questionFor(phase: Phase, table: Card[], busCard: Card | null, latest: Card | null): string {
  switch (phase) {
    case "red-black":
      return "Red or black?";
    case "higher-lower":
      return `Higher or lower than ${table[0]?.label ?? ""}?`;
    case "inside-outside":
      return `Inside or outside ${table[0]?.label ?? ""} and ${table[1]?.label ?? ""}?`;
    case "suit":
      return "Call the suit.";
    case "bus":
      return `Higher or lower than ${busCard?.label ?? latest?.label ?? ""}?`;
    default:
      return "";
  }
}

interface Choice {
  value: string;
  label: string;
  suit?: Suit;
}

function choicesFor(phase: Phase): Choice[] {
  switch (phase) {
    case "red-black":
      return [
        { value: "red", label: "Red" },
        { value: "black", label: "Black" },
      ];
    case "higher-lower":
    case "bus":
      return [
        { value: "higher", label: "Higher" },
        { value: "lower", label: "Lower" },
      ];
    case "inside-outside":
      return [
        { value: "inside", label: "Inside" },
        { value: "outside", label: "Outside" },
      ];
    case "suit":
      return SUITS.map(({ suit, symbol }) => ({ value: suit, label: symbol, suit }));
    default:
      return [];
  }
}
