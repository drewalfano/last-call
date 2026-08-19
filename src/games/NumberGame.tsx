import { useCallback, useMemo, useState } from "react";
import { CardBody, GameScreen } from "../components/GameScreen";
import { Stepper } from "../components/Stepper";
import { useDeck } from "../lib/deck";
import { useCountdown, buzz } from "../lib/useCountdown";
import { usePool } from "../data/pools";
import { NUMBER_GAME_CATEGORIES } from "../data/numberGame";
import { useContentMode } from "../state/contentMode";
import { useRoster } from "../state/roster";
import type { ModeDef } from "../data/modes";

/**
 * THE NUMBER GAME
 *
 * "I can name five." "Seven." "Prove it."
 *
 * Bidding escalates until someone calls it, then the bidder gets a clock and
 * has to actually produce the number they claimed. The app holds the bid, whose
 * turn it is, and the clock — everything a table loses track of once it's
 * arguing — and nothing else. Answers are never typed; the table judges whether
 * "uhh… Shake It Off?" counts.
 */

type Phase = "count" | "bidding" | "challenge" | "verdict";

/** Seconds per item claimed. A bid of 7 buys 42 seconds, which is tight. */
const SECONDS_PER_ITEM = 6;
/** Where every round opens. Also what says whether anyone has bid yet. */
const START_BID = 3;
const MIN_SECONDS = 25;

/**
 * How big the table can be when nobody entered names.
 *
 * Two is the real floor — the game is one person bidding and another calling
 * it, so a table of one has nobody to prove anything to. Eight is where
 * passing a phone round a bar table stops being a game and starts being
 * admin; Imposter caps at ten because it only goes round once, and this one
 * goes round all night.
 */
const MIN_SEATS = 2;
const MAX_SEATS = 8;
const DEFAULT_SEATS = 4;

interface Props {
  mode: ModeDef;
  onBack: () => void;
}

export function NumberGame({ mode, onBack }: Props) {
  const { mode: contentMode } = useContentMode();
  const { players } = useRoster();
  const pool = usePool(NUMBER_GAME_CATEGORIES, contentMode, "lead");
  const deck = useDeck(pool);

  const [seats, setSeats] = useState(DEFAULT_SEATS);
  /**
   * Names skip the picker entirely. Asked once, on entry, and only when the
   * app has no idea how many of you there are — see the note on `newRound`
   * for why it is never asked again.
   */
  const [phase, setPhase] = useState<Phase>(() => (players.length ? "bidding" : "count"));
  const [bid, setBid] = useState(START_BID);
  const [turn, setTurn] = useState(0);
  /** Who owns the bid on the table right now — the one who gets challenged. */
  const [holder, setHolder] = useState<number>(0);

  /**
   * THE TABLE. One entry per seat, named or not.
   *
   * The bug this replaced was a fork: with names, the bid cycled through the
   * roster; without them, the label was built straight off the bid index and
   * there was no roster length to wrap against, so the fourth raise at a
   * table of three asked Player 4 to prove it. There is no unnamed path any
   * more — the picker fills in the seats the names would have, so everything
   * downstream reads one length and one list.
   */
  const table = useMemo(
    () => (players.length ? players : Array.from({ length: seats }, () => "")),
    [players, seats],
  );

  /**
   * Seat `i`, wrapped, by name if it has one.
   *
   * Blank-tolerant per seat rather than wholesale, so a table that entered
   * some names and not others reads "Drew, Sam, Player 3" instead of falling
   * all the way back to numbers.
   */
  const nameAt = useCallback(
    (i: number) => {
      const seat = i % table.length;
      return table[seat] || `Player ${seat + 1}`;
    },
    [table],
  );

  const timer = useCountdown(MIN_SECONDS, () => buzz([90, 60, 180]));

  const raise = useCallback(() => {
    setBid((b) => b + 1);
    setHolder(turn);
    setTurn((t) => t + 1);
    buzz(25);
  }, [turn]);

  const challenge = useCallback(() => {
    buzz([60, 50, 120]);
    timer.start(Math.max(MIN_SECONDS, bid * SECONDS_PER_ITEM));
    setPhase("challenge");
  }, [bid, timer]);

  const newRound = useCallback(() => {
    deck.draw();
    setBid(START_BID);
    setTurn(0);
    setHolder(0);
    timer.stop();
    setPhase("bidding");
  }, [deck, timer]);

  const bidder = nameAt(holder);
  const challenger = nameAt(turn);
  /**
   * Has anyone actually claimed anything yet?
   *
   * START_BID is a floor the round opens on, not a bid somebody made — until
   * the first raise, `holder` is pointing at a player who has said nothing.
   * The card was crediting them with the number anyway and the footer was
   * offering to challenge them for it, so a round could open with "Prove it,
   * Lily" before Lily had opened her mouth.
   */
  const opened = bid > START_BID;

  return (
    /* The category is what everyone is bidding against and has to hold in
       their head all round, so it belongs on the header's content line —
       the same treatment Last Word gives its category, with the phase
       demoted to the standing note under it. It used to sit in the body in
       its own smaller style, which made the same kind of information look
       like two different things between the two modes. */
    <GameScreen
      mode={mode}
      /* The picker runs before the first category is shown — the header's
         live line has nothing to carry yet, and putting the category up
         there would hand the table something to argue about before it has
         told the app how many of them there are. */
      subtitle={phase === "count" ? undefined : deck.current}
      note={phase === "bidding" ? "Bidding" : phase === "challenge" ? "Prove it" : "Result"}
      onBack={onBack}
    >
      {/* ---------- How many of you ---------- */}
      {phase === "count" && (
        <CardBody
          card={
            <div className="card">
              <span className="card__eyebrow">How many playing?</span>
              <Stepper
                value={seats}
                min={MIN_SEATS}
                max={MAX_SEATS}
                onChange={setSeats}
                noun="player"
              />
              <p className="card__meta">
                The bid goes round the table, so it has to know where the table
                ends. Add names on Home and it uses those instead.
              </p>
            </div>
          }
        >
          {/* One control, one tap. The count has a sane default and a range
              of seven, so there is nothing here worth a confirm step — the
              only wrong answer is the one you can go back and change, and
              you cannot, which is exactly why this screen is a single
              decision and not a settings page. */}
          <div className="actions">
            <button className="btn btn--lg btn--block" onClick={() => setPhase("bidding")}>
              Start
            </button>
          </div>
        </CardBody>
      )}

      {/* ---------- Bidding ---------- */}
      {phase === "bidding" && (
        <CardBody
          card={
            /* Two people are on this card and they are doing different
               things: one owns the number, the other has to answer it. The
               eyebrow said "Can name" and the line under the number was the
               only name on the card — so the number read as belonging to the
               player it was sitting on top of, who is in fact the one being
               bid AT. Both roles are named now, above and below. */
            <div className="card">
              <span className="card__eyebrow">
                {opened ? `${bidder} can name` : "Bidding opens at"}
              </span>
              <span className="num__bid-n">{bid}</span>
              <span className="num__bid-who">
                {opened ? `${challenger}'s call` : `${challenger} starts`}
              </span>
            </div>
          }
        >
          {/* Only while the category is untouched. Once someone has raised,
              the category is in play and skipping it would be a way out of a
              bid you cannot meet rather than a way past a bad prompt. */}
          {bid === START_BID && (
            <button className="gfoot__skip" onClick={newRound}>
              New category
            </button>
          )}
          <div className="actions">
            <button className="btn btn--lg btn--block" onClick={raise}>
              I can name {bid + 1}
            </button>
            {/* Nothing to call until somebody has claimed something. */}
            {opened && (
              <button className="btn btn--ghost btn--block" onClick={challenge}>
                Prove it, {bidder}
              </button>
            )}
          </div>
        </CardBody>
      )}

      {/* ---------- The challenge ---------- */}
      {phase === "challenge" && (
        <CardBody
          card={
            <div className="card">
              <span className="card__eyebrow">
                {bidder} names {bid}
              </span>
              <span className="num__bid-n" data-low={timer.seconds <= 5 || undefined}>
                {timer.seconds}
              </span>
              <span className="num__bid-who">
                {timer.expired ? "Time" : `${challenger} called it`}
              </span>
            </div>
          }
        >
          <div className="actions">
            <button className="btn btn--lg btn--block" onClick={() => setPhase("verdict")}>
              {timer.expired ? "Settle it" : "Stop the clock"}
            </button>
          </div>
        </CardBody>
      )}

      {/* ---------- Who drinks ---------- */}
      {phase === "verdict" && (
        <CardBody
          card={
            <div className="card">
              {/* "Did they get 7? If they did, X drinks, if they didn't, Y
                  does" left the table working out which "they" was which. The
                  question names the bidder, so the sentence under it can lean
                  on it. */}
              <span className="card__eyebrow">
                Did {bidder} get {bid}?
              </span>
              <p className="card__prompt card__prompt--sm">
                If they did, {challenger} drinks. If not, {bidder} does.
              </p>
              <p className="card__meta">The table decides what counts.</p>
            </div>
          }
        >
          <div className="actions">
            <button className="btn btn--lg btn--block" onClick={newRound}>
              New category
            </button>
          </div>
        </CardBody>
      )}
    </GameScreen>
  );
}
