import { useCallback, useState } from "react";
import { CardBody, GameScreen } from "../components/GameScreen";
import { useDeck, randomItem } from "../lib/deck";
import { CategoryPicker } from "../components/CategoryPicker";
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

type Phase = "handover" | "picking" | "ranking" | "guessing" | "revealed";

/** Every prompt opens with this; the picker says it once instead. */
const RANK_PREFIX = /^Rank these /;

interface Props {
  mode: ModeDef;
  onBack: () => void;
}

export function RankIt({ mode, onBack }: Props) {
  const { mode: contentMode } = useContentMode();
  const { players, hasRoster } = useRoster();
  /* LEAD, not replace. The lists are browsable by name in the picker below,
     so replacing them made every familiar list vanish the moment the table
     flipped to 19+ — a group that wanted a few rowdier sets lost pizza
     toppings and hangover cures to get them. The adult sets go first; the
     safe ones stay on the list underneath. */
  const pool = usePool(RANK_IT, contentMode, "lead");
  const deck = useDeck(pool);

  const [phase, setPhase] = useState<Phase>("handover");
  /** A list the group chose by name, which wins over whatever the deck dealt. */
  const [chosen, setChosen] = useState<RankPrompt | null>(null);
  /** The Ranker's real order. */
  const [order, setOrder] = useState<string[]>([]);
  /** The group's guess at it. */
  const [guess, setGuess] = useState<string[]>([]);
  const [ranker, setRanker] = useState<string>(() =>
    hasRoster ? randomItem(players) : "Whoever's turn it is",
  );

  const prompt = chosen ?? (deck.current as RankPrompt | undefined);

  /** Same tap-to-order interaction for both passes; only the target differs. */
  const pick = useCallback(
    (item: string, forGuess: boolean) => {
      const set = forGuess ? setGuess : setOrder;
      set((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]));
      buzz(20);
    },
    [],
  );

  /**
   * A different list for the same Ranker, dealt at random.
   *
   * On the handover, where the title is already on screen as the live line —
   * you are choosing what to rank before anyone has committed to ranking it.
   * It used to sit on the ranking screen instead, back when the handover card
   * showed only the Ranker's name and there was no prompt to reject yet.
   */
  const reroll = useCallback(() => {
    setChosen(null);
    deck.draw();
    setOrder([]);
    setGuess([]);
  }, [deck]);

  const nextRound = useCallback(() => {
    setChosen(null);
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
      hideHeader={phase === "picking"}
      /* The prompt is what everyone is holding in their head, so it takes the
         live line — the same treatment Last Word and the Number Game give
         theirs. Whose pass it is qualifies it, so that hangs underneath as
         the note: the two ranking screens are otherwise identical and it is
         the only thing saying who should be holding the phone. */
      subtitle={phase === "revealed" ? `${hits} of ${total} right` : prompt.title}
      note={
        phase === "ranking"
          ? `${ranker} — privately`
          : phase === "guessing"
            ? "Everyone else"
            : undefined
      }
      /* The Ranker's own order, which the rest of the table is about to
         spend the round guessing. The guessing pass next door is the
         opposite — it WANTS everyone reading it — and the two screens are
         otherwise identical, which is exactly why this is worth marking. */
      isPrivate={phase === "ranking"}
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
          {/* Choose what you are ranking BEFORE anyone commits to ranking it.
              The title is already up there as the live line, so this is the
              screen where rejecting it costs nothing. */}
          <div className="actions--row">
            <button className="btn btn--ghost" onClick={reroll}>
              Random
            </button>
            <button className="btn btn--ghost" onClick={() => setPhase("picking")}>
              Lists
            </button>
          </div>
          <div className="actions">
            <button className="btn btn--lg btn--block" onClick={() => setPhase("ranking")}>
              I've got it
            </button>
          </div>
        </CardBody>
      )}

      {/* ---------- Pick a list by name ---------- */}
      {phase === "picking" && (
        <CategoryPicker
          /* Every prompt opens "Rank these…", so that goes in the heading and
             the cards carry only the part that differs. */
          heading="Rank these…"
          categories={pool.map((p) => p.title.replace(RANK_PREFIX, ""))}
          allowCustom={false}
          onPick={(shortened) => {
            const picked = pool.find((p) => p.title.replace(RANK_PREFIX, "") === shortened);
            if (picked) {
              setChosen(picked);
              setOrder([]);
              setGuess([]);
            }
            setPhase("handover");
          }}
          onCancel={() => setPhase("handover")}
        />
      )}

      {/* ---------- Ranking, by tapping ----------
           One screen serves both passes: the Ranker's private order and then
           the group's guess. Same interaction, different target — nobody has
           to learn a second way to order a list. */}
      {(phase === "ranking" || phase === "guessing") && (
        <CardBody
          className="rank"
          card={
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
          }
        >
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
        </CardBody>
      )}

      {/* ---------- Both orders, side by side ----------
           The comparison is the payoff, so it's shown as one list rather than
           two: the Ranker's order is the spine, and each row says what the
           group put there instead. A row that matches needs no explanation;
           a row that doesn't is the argument. */}
      {phase === "revealed" && (
        <CardBody
          className="rank"
          card={
            <ol className="rank__list rank__list--compare">
            {order.map((item, i) => {
              const got = guess[i];
              const hit = got === item;
              /* How far this item travels to reach its real place: the row it
                 was guessed into, minus the row it belongs in. The reveal
                 animates from there, so every item slides out of the position
                 the group put it in — and the ones they got right have
                 nowhere to go, which is the tell. */
              const rowsOff = guess.indexOf(item) - i;
              return (
                <li key={item}>
                  <span
                    className="rank__row"
                    data-hit={hit || undefined}
                    style={{
                      ["--rows-off" as string]: rowsOff,
                      ["--i" as string]: Math.min(i, 6),
                    }}
                  >
                    <span className="rank__pos">{i + 1}</span>
                    <span className="rank__cols">
                      <span className="rank__actual">{item}</span>
                      {!hit && <span className="rank__guess">you said {got}</span>}
                    </span>
                    {hit && (
                      <span className="rank__tick" aria-label="you got this one right">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path
                            d="M5 13l4.5 4.5L19 7"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
            </ol>
          }
        >
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
        </CardBody>
      )}
    </GameScreen>
  );
}
