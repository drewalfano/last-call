import { useCallback, useEffect, useState } from "react";
import { CardBody, GameScreen, PromptBody } from "../components/GameScreen";
import { RankRows } from "../components/RankRows";
import { shuffled } from "../lib/dragOrder";
import { useTablet } from "../lib/useTablet";
import { useDeck, randomItem } from "../lib/deck";
import { CategoryPicker } from "../components/CategoryPicker";
import { ChoicePill } from "../components/ChoicePill";
import { buzz } from "../lib/useCountdown";
import { audio } from "../lib/audio";
import { usePool } from "../data/pools";
import { RANK_IT, type RankPrompt } from "../data/rankIt";
import { useContentMode } from "../state/contentMode";
import { useRoster } from "../state/roster";
import type { ModeDef } from "../data/modes";
import { useExitGuard } from "../state/exitGuard";

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

/**
 * How long a verdict waits before it says anything.
 *
 * The press that reveals is already playing `advance`, and both it and the
 * success are rising figures — landing them together reads as one muddle
 * rather than two events. This is the gap that separates them, judged on the
 * phone against a version with no gap and a version with twice as much.
 */
const VERDICT_DELAY_MS = 320;

interface Props {
  mode: ModeDef;
  onBack: () => void;
}

export function RankIt({ mode, onBack }: Props) {
  const { mode: contentMode, tier } = useContentMode();
  const { players, hasRoster } = useRoster();
  /* LEAD, not replace. The lists are browsable by name in the picker below,
     so replacing them made every familiar list vanish the moment the table
     flipped to 19+ — a group that wanted a few rowdier sets lost pizza
     toppings and hangover cures to get them. The adult sets go first; the
     safe ones stay on the list underneath. */
  const pool = usePool(RANK_IT, contentMode, "lead");
  const deck = useDeck(pool);

  const [phase, setPhase] = useState<Phase>("handover");
  useExitGuard(phase === "ranking" || phase === "guessing");
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

  /* Hoisted above the early return below, because the effect that reads them
     is a hook and cannot sit after it. `hits` never needed the prompt anyway —
     it is the two orders compared. */
  const total = prompt?.items.length ?? 0;
  /** Positions the group placed exactly right. */
  const hits = order.filter((item, i) => guess[i] === item).length;

  /** Same tap-to-order interaction for both passes; only the target differs. */
  /**
   * DRAGGED INTO ORDER, NOT TAPPED. Each pass deals the whole list shuffled
   * and the player drags it into shape, so the list is always a complete
   * order — changing your mind is another drag, not a Start over. The table's
   * pass never opens on the Ranker's own order. See lib/dragOrder.
   */
  const tablet = useTablet();
  const beginRanking = useCallback(() => {
    if (!prompt) return;
    setOrder(shuffled(prompt.items));
    setPhase("ranking");
  }, [prompt]);

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

  /**
   * ONLY THE ENDS OF THE RANGE SAY ANYTHING.
   *
   * All of them, or none of them. "At least one right" would have been the
   * obvious line and is the wrong one: a random guess lands one exact position
   * per round on average, whatever the list length, so it fires on about two
   * rounds in three and means nothing. The app already draws the line in the
   * same place in its own copy — only a clean sweep gets a sentence.
   *
   * The two ends are nothing like equally likely. Five of five is one guess in
   * 120 by chance; none at all is closer to one in three. So they are not a
   * matched pair of reward and punishment, and `miss` is written knowing it
   * will be heard many times for each time `match` is.
   *
   * An effect rather than a timeout inside the handler, so leaving the mode
   * within that third of a second takes the sound with it.
   */
  useEffect(() => {
    if (phase !== "revealed" || total === 0) return;
    const verdict = hits === total ? "match" : hits === 0 ? "miss" : null;
    if (!verdict) return;
    const t = window.setTimeout(() => audio.play(verdict), VERDICT_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [phase, hits, total]);

  const nextRound = useCallback(() => {
    setChosen(null);
    deck.draw();
    setOrder([]);
    setGuess([]);
    setRanker(hasRoster ? randomItem(players) : "Whoever's turn it is");
    setPhase("handover");
  }, [deck, hasRoster, players]);

  if (!prompt) return null;

  const active = phase === "guessing" ? guess : order;

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
          ? `${ranker}, privately`
          : phase === "guessing"
            ? "Everyone else"
            : undefined
      }
      /* The Ranker's own order, which the rest of the table is about to
         spend the round guessing. The guessing pass next door is the
         opposite — it WANTS everyone reading it — and the two screens are
         otherwise identical, which is exactly why this is worth marking. */
      isPrivate={!tablet && phase === "ranking"}
      layout={phase === "picking" ? undefined : "prompt"}
      onBack={onBack}
    >
      {/* ---------- Hand the phone to the Ranker ---------- */}
      {phase === "handover" && (
        <PromptBody
          /* On a board the header gives its live line to the rail, so the
             list goes here — what the Ranker is about to rank, beside the
             card that names them, above the control that changes it. */
          rail={<span className="rail__live">{prompt.title}</span>}
          card={
            <div className="card">
              <span className="card__eyebrow">Ranker</span>
              <p className="card__prompt">{ranker}</p>
              <p className="card__meta">
                Your list, your opinion. Nobody else looks. They get their own go
                at guessing it after.
              </p>
            </div>
          }
        >
          {/* Choose what you are ranking BEFORE anyone commits to ranking it.
              The title is already up there as the live line, so this is the
              screen where rejecting it costs nothing. */}
          <ChoicePill
            value="Change list"
            ariaLabel="Change list"
            onOpen={() => setPhase("picking")}
            onShuffle={reroll}
            shuffleLabel="Random list"
          />
          <div className="actions">
            <button className="btn btn--lg btn--block" onClick={beginRanking}>
              I've got it
            </button>
          </div>
        </PromptBody>
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
        <PromptBody
          /* `rank--ordering` and not just `rank`: the reveal below is also a
             `rank` screen and must keep the card slot exactly as it is, because
             its rows slide in from outside it. Only the two ordering screens
             take the extra height. See the grid override in games.css. */
          className="rank rank--ordering"
          card={
            /* KEYED ON THE PHASE, so the list deals again when the phone
               changes hands — the one screen two different people use back to
               back has to say it has changed hands. */
            <div className="rank-card" key={phase}>
              <RankRows
                items={active}
                onReorder={(next) => {
                  (phase === "guessing" ? setGuess : setOrder)(next);
                  buzz(20);
                }}
              />
            </div>
          }
          /* On a board, the panel beside the list: whose pass, what is being
             ranked, and what to do. Off a board the header carries the first
             two, as it always has. */
          rail={
            <>
              <span className="rank-panel__who">{phase === "ranking" ? `${ranker} only` : "Everyone else"}</span>
              <span className="rank-panel__title">{prompt.title}</span>
              <p className="rank-panel__how">
                {phase === "ranking"
                  ? "Drag them into your order. Nobody else looks."
                  : `Argue it out and drag them into the order you think ${ranker} picked. ${ranker}, stay quiet.`}
              </p>
            </>
          }
        >
          <div className="actions">
            <button
              className="btn btn--lg btn--block"
              /* `advance` because that is what this press is: Lock it in ends
                 the Ranker's private pass and gives the phone to the table.
                 The same rising pair the phone makes everywhere it changes
                 hands. */
              onPointerDown={() => audio.play("advance")}
              onClick={() => {
                buzz([90, 60, 140]);
                if (phase === "ranking") {
                  setGuess(shuffled(prompt.items, order));
                  setPhase("guessing");
                } else {
                  setPhase("revealed");
                }
              }}
            >
              {phase === "ranking" ? "Lock it in" : "Reveal"}
            </button>
          </div>
        </PromptBody>
      )}

      {/* ---------- Both orders, side by side ----------
           The comparison is the payoff, so it's shown as one list rather than
           two: the Ranker's order is the spine, and each row says what the
           group put there instead. A row that matches needs no explanation;
           a row that doesn't is the argument. */}
      {/* On a tablet the reveal is the same rows in the same places, now in
          the Ranker's order: a match is ticked, a miss says where the table
          had it. */}
      {tablet && phase === "revealed" && (
        <PromptBody
          className="rank rank--ordering"
          card={
            <div className="rank-card" key={phase}>
              <RankRows items={order} guess={guess} />
            </div>
          }
          rail={
            <>
              <span className="rank-panel__who">{ranker}'s order</span>
              <span className="rank-panel__title">
                {hits} of {total} right
              </span>
              {/* The heading has the score; this says only what it does not. */}
              {(hits === total || tier > 0) && (
                <p className="rank-panel__how">
                  {hits === total ? `You know ${ranker} too well.` : `Drink ${total - hits}.`}
                </p>
              )}
            </>
          }
        >
          <div className="actions">
            <button className="btn btn--lg btn--block" onClick={nextRound}>
              New ranker
            </button>
          </div>
        </PromptBody>
      )}

      {!tablet && phase === "revealed" && (
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
          {/* THE SCORE FIRST, AND THE DRINK ONLY IF THE TIER TAKES ONE.
              This line used to say "Drink 4" at every level, including Mild —
              which is the one tier that promises it plays sober. Rank It is
              not a drinking game at heart: it is guessing how somebody thinks,
              and the drink was a consequence bolted onto a result. So the
              result is what it states, and the drink is an extra sentence that
              Spicy and Filthy add, because those are the tiers where there is
              a glass on the table to begin with. */}
          <p className="rank__rule">
            {hits === total
              ? `All ${total}. You know ${ranker} too well.`
              : `${hits} of ${total}.${tier > 0 ? ` Drink ${total - hits}.` : ""}`}
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
