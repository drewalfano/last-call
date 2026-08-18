import { useCallback, useState } from "react";
import { CardBody, GameScreen } from "../components/GameScreen";
import { useDeck, randomItem } from "../lib/deck";
import { buzz } from "../lib/useCountdown";
import { usePool } from "../data/pools";
import { RANK_IT, type RankPrompt } from "../data/rankIt";
import { useContentMode } from "../state/contentMode";
import { useRoster } from "../state/roster";
import type { ModeDef } from "../data/modes";

/**
 * RANK IT
 *
 * One player ranks a set privately; the table argues about what they picked;
 * the order is revealed.
 *
 * The Ranker's order is TAPPED, not typed — tap the items in order and the
 * position is recorded. That's the only way the app can reveal a real answer
 * later without anyone using a keyboard at a bar.
 *
 * The app deliberately doesn't collect the group's guess or score it. The
 * group argues out loud, sees the real order, and settles up themselves —
 * same as everywhere else in the app.
 */

type Phase = "handover" | "ranking" | "guessing" | "revealed";

interface Props {
  mode: ModeDef;
  onBack: () => void;
}

export function RankIt({ mode, onBack }: Props) {
  const { mode: contentMode } = useContentMode();
  const { players, hasRoster } = useRoster();
  const pool = usePool(RANK_IT, contentMode);
  const deck = useDeck(pool);

  const [phase, setPhase] = useState<Phase>("handover");
  /** The Ranker's real order. */
  const [order, setOrder] = useState<string[]>([]);
  /** The group's guess at it. */
  const [guess, setGuess] = useState<string[]>([]);
  const [ranker, setRanker] = useState<string>(() =>
    hasRoster ? randomItem(players) : "Whoever's turn it is",
  );

  const prompt = deck.current as RankPrompt | undefined;

  /** Same tap-to-order interaction for both passes; only the target differs. */
  const pick = useCallback(
    (item: string, forGuess: boolean) => {
      const set = forGuess ? setGuess : setOrder;
      set((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]));
      buzz(20);
    },
    [],
  );

  const nextRound = useCallback(() => {
    deck.draw();
    setOrder([]);
    setGuess([]);
    setRanker(hasRoster ? randomItem(players) : "Whoever's turn it is");
    setPhase("handover");
  }, [deck, hasRoster, players]);

  if (!prompt) return null;

  const total = prompt.items.length;
  const active = phase === "guessing" ? guess : order;
  const complete = active.length === total;
  /** Positions the group placed exactly right. */
  const hits = order.filter((item, i) => guess[i] === item).length;

  return (
    <GameScreen
      mode={mode}
      subtitle={
        phase === "handover"
          ? "Pass the phone"
          : phase === "ranking"
            ? `${ranker} — privately`
            : phase === "guessing"
              ? "Everyone else"
              : "How you did"
      }
      onBack={onBack}
    >
      {/* ---------- Hand the phone to the Ranker ---------- */}
      {phase === "handover" && (
        <CardBody
          card={
            <div className="card">
              <span className="card__eyebrow">Ranker</span>
              <p className="card__prompt">{ranker}</p>
              <p className="card__meta">
                Your list, your opinion. Nobody else looks — they get their own go
                at guessing it after.
              </p>
            </div>
          }
        >
          <div className="actions">
            <button className="btn btn--lg btn--block" onClick={() => setPhase("ranking")}>
              I've got it
            </button>
          </div>
        </CardBody>
      )}

      {/* ---------- Ranking, by tapping ----------
           One screen serves both passes: the Ranker's private order and then
           the group's guess. Same interaction, different target — nobody has
           to learn a second way to order a list. */}
      {(phase === "ranking" || phase === "guessing") && (
        <div className="focal rank">
          <p className="rank__title">{prompt.title}</p>
          <ol className="rank__list">
            {prompt.items.map((item) => {
              const at = active.indexOf(item);
              return (
                <li key={item}>
                  <button
                    className="rank__item"
                    data-ranked={at >= 0 || undefined}
                    onClick={() => pick(item, phase === "guessing")}
                  >
                    <span className="rank__pos">{at >= 0 ? at + 1 : ""}</span>
                    <span className="rank__label">{item}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="actions">
            <button
              className="btn btn--lg btn--block"
              disabled={!complete}
              onClick={() => {
                buzz(complete ? [90, 60, 140] : 20);
                setPhase(phase === "ranking" ? "guessing" : "revealed");
              }}
            >
              {complete
                ? phase === "ranking"
                  ? "Lock it in"
                  : "Reveal"
                : `Tap in order · ${active.length}/${total}`}
            </button>
            {active.length > 0 && (
              <button
                className="btn btn--ghost btn--block"
                onClick={() => (phase === "guessing" ? setGuess([]) : setOrder([]))}
              >
                Start over
              </button>
            )}
          </div>
        </div>
      )}

      {/* ---------- Both orders, side by side ----------
           The comparison is the payoff, so it's shown as one list rather than
           two: the Ranker's order is the spine, and each row says what the
           group put there instead. A row that matches needs no explanation;
           a row that doesn't is the argument. */}
      {phase === "revealed" && (
        <div className="focal rank">
          <p className="rank__title">
            {hits} of {total} right
          </p>
          <ol className="rank__list rank__list--compare">
            {order.map((item, i) => {
              const got = guess[i];
              const hit = got === item;
              return (
                <li key={item}>
                  <span className="rank__row" data-hit={hit || undefined}>
                    <span className="rank__pos">{i + 1}</span>
                    <span className="rank__cols">
                      <span className="rank__actual">{item}</span>
                      {!hit && <span className="rank__guess">you said {got}</span>}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="rank__rule">
            {hits === total
              ? `Nobody drinks. You know ${ranker} too well.`
              : `Drink ${total - hits} — one for every one you missed.`}
          </p>
          <div className="actions">
            <button className="btn btn--lg btn--block" onClick={nextRound}>
              New ranker
            </button>
          </div>
        </div>
      )}
    </GameScreen>
  );
}
