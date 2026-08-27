import { useCallback, useEffect, useMemo, useState } from "react";
import { CardBody, GameScreen } from "../components/GameScreen";
import { CategoryPicker } from "../components/CategoryPicker";
import { Stepper } from "../components/Stepper";
import { shuffle, useDeck } from "../lib/deck";
import { fadeOnScroll } from "../lib/scrollFade";
import { useCountdown, buzz } from "../lib/useCountdown";
import { audio } from "../lib/audio";
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
 * has to actually produce the number they claimed. The app holds the bid, who
 * owns it, and the clock — everything a table loses track of once it's
 * arguing — and nothing else. Answers are never typed; the table judges whether
 * "uhh… Shake It Off?" counts.
 *
 * A BID IS TAKEN, NOT DEALT OUT. The mode used to run a turn order: the app
 * nominated a player, they raised by one or called it, and the phone moved on
 * a seat. Played at a table it dragged. Six people spend five raises getting
 * from 3 to 8 and nobody has said anything they can't back up, because a
 * player with nothing to claim still has to be asked, and the only raise on
 * offer is the smallest one.
 *
 * So the round poses a number and the table answers it. Whoever wants it taps
 * their own name — the people with nothing to say are simply never in the
 * way — and the number on offer can be dragged straight up to a milestone
 * first. Both halves of the fix are the same idea: the game is somebody
 * claiming a number they might not have, and everything else was queueing.
 */

type Phase = "count" | "picking" | "bidding" | "challenge" | "verdict";

/** Seconds per item claimed. A bid of 7 buys 42 seconds, which is tight. */
const SECONDS_PER_ITEM = 6;
/** The floor a round opens on. Nobody has claimed it — see `holder`. */
const START_BID = 3;
const MIN_SECONDS = 25;

/**
 * THE JUMPS.
 *
 * The dare on offer defaults to one more than the standing bid, and beside it
 * sit the next two milestones. Multiples of five because the point is a
 * number the table hears as big, and nine is not one.
 *
 * Two of them, not the whole ladder. A row offering 10, 15, 20 and 25 turns a
 * dare into a menu, and the far end of a menu is never the number anyone
 * actually claims.
 */
const MILESTONE = 5;
const JUMPS_SHOWN = 2;

/**
 * The most anyone may claim, and it is two digits because the field is.
 *
 * Not a rule about the game — a table that wants to bid 99 has already made
 * its own joke and the clock will hand them ten minutes to regret it. It is
 * the guard on a fat-fingered 111 in a numeric keyboard, which is a bid
 * nobody meant and a round nobody can finish.
 */
const MAX_BID = 99;

/**
 * What the table can be dared with, against a standing bid of `bid`.
 *
 * Always `bid + 1` first — the ordinary raise, and the one selected until
 * somebody reaches past it — then the milestones above it. A milestone equal
 * to `bid + 1` is skipped rather than listed twice, so from a bid of 4 the
 * row reads 5, 10, 15: every option is a distinct number and each is visibly
 * bigger than the last.
 */
function daresAbove(bid: number): number[] {
  const out = [bid + 1];
  for (let n = Math.floor(bid / MILESTONE + 1) * MILESTONE; out.length <= JUMPS_SHOWN; n += MILESTONE) {
    if (n > bid + 1) out.push(n);
  }
  return out;
}

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

/**
 * Seat indices, shuffled — the order the names are dealt across the pad.
 *
 * `after` is the order being replaced, and all that is taken from it is who
 * came first: a fresh shuffle is free to put the same player in the opening
 * slot twice running, and two in a row is the one repeat a table reads as the
 * shuffle not having happened. Same guard `useDeck` puts on its reshuffle
 * seam, for the same reason, and the swap keeps the pass uniform elsewhere.
 */
function seatOrder(count: number, after?: readonly number[]): number[] {
  const next = shuffle(Array.from({ length: count }, (_, i) => i));
  if (next.length > 1 && after?.length && next[0] === after[0]) {
    [next[0], next[next.length - 1]] = [next[next.length - 1], next[0]];
  }
  return next;
}

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
  /** The number standing on the table. At START_BID nobody has claimed it. */
  const [bid, setBid] = useState(START_BID);
  /**
   * The number on offer — what the pad below would claim if somebody tapped
   * their name right now. Separate from `bid` because reaching for a bigger
   * one is a move you make BEFORE you own it: tap 15, then tap yourself.
   */
  const [dare, setDare] = useState(START_BID + 1);
  /** Who owns the bid — the one who can be made to prove it. Null until taken. */
  const [holder, setHolder] = useState<string | null>(null);
  /**
   * A category the table went and chose, which stands in front of the deck
   * until the next Random puts the deck back in charge — the same
   * `chosen ?? deck.current` Letter Rip and Ballpark run on.
   */
  const [chosen, setChosen] = useState<string | null>(null);
  /**
   * Which screen the picker was opened from, so Back means back.
   *
   * Both screens that offer the pair reach the same picker, and the two are
   * not interchangeable to return to: cancelling out of it on the verdict
   * screen has to land on the verdict, because dropping into a fresh round
   * would be the change the player just declined to make.
   */
  const [pickedFrom, setPickedFrom] = useState<Phase>("bidding");
  /**
   * A number somebody said out loud that the row did not offer.
   *
   * Kept beside `dare` rather than folded into it so that reaching past 15 to
   * 23 and then changing your mind back to 15 does not throw the 23 away —
   * it stays in the row, already typed, for as long as it is still a bid
   * anyone could make. Cleared by the guard in `dares` the moment the bid
   * passes it, and by hand on a new category.
   */
  const [custom, setCustom] = useState<number | null>(null);
  /** Whether the row has given itself over to the field. */
  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState("");

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
   * WHERE THE NAMES SIT ON THE PAD. Seat indices, shuffled.
   *
   * The pad used to be dealt in seat order, which is the order the names were
   * typed — so the same player held the first slot on every category all
   * night, and the last name entered was always in the far corner. Nothing
   * about this mode is faithful to where anyone is sitting, so there was
   * nothing for that order to be true to.
   *
   * Reshuffled per category rather than once per session, in `newRound`: a
   * single shuffle only moves who is stuck with the corner, it doesn't stop
   * them being stuck with it.
   */
  const [order, setOrder] = useState<number[]>(() => seatOrder(players.length || DEFAULT_SEATS));

  /* The table can resize under a live order — the stepper on the way in, or a
     name added to the roster from another mode between rounds. */
  useEffect(() => {
    setOrder((prev) => (prev.length === table.length ? prev : seatOrder(table.length)));
  }, [table.length]);

  /**
   * The pad, in the order it is dealt. Blank-tolerant per seat rather than
   * wholesale, so a table that entered some names and not others reads
   * "Drew, Sam, Player 3" instead of falling all the way back to numbers.
   *
   * Falls back to plain seat order for the single render between a table
   * resizing and the effect above resyncing. Reindexing a stale order instead
   * would deal the same seat twice, and two identical names on the pad is a
   * worse frame than one un-shuffled one.
   */
  const pad = useMemo(() => {
    const seating = order.length === table.length ? order : table.map((_, i) => i);
    return seating.map((seat) => table[seat] || `Player ${seat + 1}`);
  }, [order, table]);

  const timer = useCountdown(MIN_SECONDS, () => {
    buzz([90, 60, 180]);
    audio.play("buzzer");
  });

  /**
   * The last three seconds out loud, the same climb Letter Rip's clock runs.
   *
   * An effect on `seconds` rather than a ref counting frames: this timer comes
   * from the shared hook, which already rounds, so the body only runs on the
   * three renders where the number actually changed. The clock never opens
   * shorter than MIN_SECONDS, so a challenge can never start already ticking.
   */
  useEffect(() => {
    if (timer.running && timer.seconds > 0 && timer.seconds <= 3) {
      audio.play("tick", 3 - timer.seconds);
    }
  }, [timer.running, timer.seconds]);

  /**
   * What the row offers: the ordinary raise, the milestones, and — once
   * somebody has typed one — their number in its place among them, so a bid
   * of 23 reads as one of the choices rather than as a mode the screen is in.
   *
   * The `custom > bid` test is the whole of its housekeeping. A typed number
   * stops being an option the moment the bidding passes it, which is exactly
   * when it should leave the row, so nothing has to remember to clear it.
   */
  const dares = useMemo(() => {
    const base = daresAbove(bid);
    if (custom === null || custom <= bid || base.includes(custom)) return base;
    return [...base, custom].sort((a, b) => a - b);
  }, [bid, custom]);

  /**
   * Take the typed number, or refuse out loud.
   *
   * Below the standing bid it is not a raise, above MAX_BID it is a typo, and
   * either way the field keeps what was typed so it can be corrected rather
   * than retyped. Refusing out loud and not with a `disabled` button is the
   * rule the stepper's ends and Letter Rip's used letters already follow: an
   * inert control cannot say why it did nothing.
   */
  const takeTyped = useCallback(() => {
    const n = Number(draft);
    if (!Number.isInteger(n) || n <= bid || n > MAX_BID) {
      audio.play("reject");
      buzz(15);
      return;
    }
    setCustom(n);
    setDare(n);
    setWriting(false);
    setDraft("");
    audio.play("tap");
  }, [bid, draft]);

  /**
   * The line the header asks. Two rows: the number being dared, then the
   * category it is a number OF. Without a category — an empty pool, which
   * only a broken build produces — it is still a sentence, just a vaguer one.
   */
  const category = chosen ?? deck.current;
  const question = category
    ? `Who can name ${dare}\n${category}?`
    : `Who can name ${dare}?`;

  /**
   * Somebody takes the number on offer. It becomes the bid, they become the
   * one who has to produce it, and the next dare opens one above.
   *
   * A jump gets the longer haptic the app gives its heavier taps: the phone
   * should not report a leap to 15 the same way it reports a nudge to 5.
   */
  const claim = useCallback(
    (name: string) => {
      setBid(dare);
      setHolder(name);
      setDare(dare + 1);
      buzz(dare > bid + 1 ? [30, 40, 60] : 25);
    },
    [bid, dare],
  );

  const challenge = useCallback(() => {
    buzz([60, 50, 120]);
    timer.start(Math.max(MIN_SECONDS, bid * SECONDS_PER_ITEM));
    setPhase("challenge");
  }, [bid, timer]);

  /**
   * Everything a round holds, back to nothing. The category is the caller's
   * business — the two ways in set it and then come here.
   *
   * `seats` is deliberately untouched: how many of you there are is a fact
   * about the night, not about the round, and being asked again between
   * categories would be the app forgetting something it was just told. It
   * goes when the game does — closing the mode unmounts this component and
   * takes the count with it, which is the same rule every other mode's state
   * follows. See the note on the state machine in App.tsx.
   */
  const resetRound = useCallback(() => {
    setBid(START_BID);
    setDare(START_BID + 1);
    setHolder(null);
    setCustom(null);
    setWriting(false);
    setDraft("");
    setOrder((prev) => seatOrder(prev.length, prev));
    timer.stop();
    setPhase("bidding");
  }, [timer]);

  /**
   * TWO WAYS TO A CATEGORY, which is what every other category mode offers
   * and this one did not.
   *
   * It had a single New category, which is Random with no way to say what you
   * wanted — so a table hunting for one they could actually bid on tapped it
   * over and over, reading each one to find out it was not the one. Letter
   * Rip, Odd One Out, Same Page and Ballpark all put the pair here: a tap for
   * a different one, or the whole list to read together.
   *
   * Random drops `chosen` on the way past. Without that, the deck would deal
   * underneath a hand-picked category that goes on standing in front of it,
   * and the button would look broken.
   */
  const drawRandom = useCallback(() => {
    setChosen(null);
    deck.draw();
    resetRound();
  }, [deck, resetRound]);

  const openPicker = useCallback((from: Phase) => {
    setPickedFrom(from);
    setPhase("picking");
  }, []);

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
      /* THE HEADER ASKS THE QUESTION, and it is the whole question — the
         number and the category in one sentence, which is the first time
         either has said what the other is for. They used to be two things in
         two places: the category up here, the number on a card below it, and
         a line of small print on the card doing the joining ("Name this many,
         or push it higher"). "Who can name 11 / Taylor Swift songs?" needs no
         line of small print.

         The break is explicit rather than left to the wrap, the way Imposter
         sets its category on a row of its own — the question is one thing and
         the category is the other, and a table scanning it should not have to
         find where one ends. See .gheader__now's `white-space: pre-line`. */
      /* The picker is a full page of its own with a Back at the foot of it.
         The header's X goes somewhere else entirely — all the way out of the
         mode — and two backs on one screen, the more obvious-looking one
         being the destructive one, is the thing `hideHeader` exists to stop.
         Same call Letter Rip and Ballpark make on the same screen. */
      hideHeader={phase === "picking"}
      subtitle={phase === "bidding" ? question : phase === "count" ? undefined : category}
      /* Under the question, the state it is being asked against. */
      note={
        phase === "bidding"
          ? holder
            ? `${holder} has ${bid}`
            : "No bid yet"
          : phase === "challenge"
            ? "Prove it"
            : phase === "verdict"
              ? "Result"
              : undefined
      }
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
              {/* ONE LINE, AND IT IS THE RULE.
                  This card asked how many were playing and never said what
                  they would be playing, so the rule went on. Then it carried
                  two paragraphs, which on a card this size is a wall: the note
                  about seating was answering a question nobody had asked yet.
                  What a player needs here is what the game is. The stepper
                  above it already says the rest. */}
              <p className="card__meta">
                Bid how many you can name from a category. Take it high, or
                call someone out and make them prove it.
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

      {/* ---------- The whole list ---------- */}
      {phase === "picking" && (
        /* The picker brings its own Back — and its own reason for having no
           header, which is that the header's X leaves the mode entirely and
           would sit directly above a Back that does not. See GameScreen's
           `hideHeader`. */
        <CategoryPicker
          categories={pool}
          onPick={(c) => {
            setChosen(c);
            resetRound();
          }}
          onCancel={() => setPhase(pickedFrom)}
        />
      )}

      {/* ---------- Bidding ---------- */}
      {/* NO CARD ON THIS SCREEN, and it is the one screen in the mode that
          was worse for having one.

          A card is for the thing a table looks AT — a prompt, a clock, a
          result. This screen is a thing a table DOES: it asks who is taking a
          number, and the answer is a tap. Everything that mattered was
          already in the header or in the controls, so the card in between was
          a big white restatement of both, and it pushed the names down into a
          strip of pills at the bottom of the screen — the smallest, furthest
          thing on it, when it is the only thing anyone is here to press.

          So the round runs down the screen in the order you read it: the
          question, how big, who is taking it, and the way out. A plain
          `.focal` and not a slot, because there is no card left to hold
          still — the same answer Last Word's board and Kings Cup's felt
          arrive at. */}
      {phase === "bidding" && (
        <div className="focal num">
          {/* HOW BIG. Three numbers, the standing choice filled — the same
              pick-one-from-a-set the rank rows and the vote pad already draw
              this way. Above the names because it is the half of the sentence
              you settle first: reach for 15, THEN say it was you. Tapping
              another is how you take it back, so a mis-tap costs nothing and
              the row needs no undo of its own. */}
          {writing ? (
            /* THE ROW GIVES ITSELF OVER TO THE FIELD, rather than growing a
               fourth row under itself. Everything below this — the names, the
               button — is where it was a moment ago and where it will be a
               moment later, because the two states are built to the same
               height. A number is being said out loud at a table; the screen
               should not lurch while somebody types it.

               The category picker's Write-your-own does the same thing with
               the same two ways out. */
            <form
              className="chips num__dares num__type"
              onSubmit={(e) => {
                e.preventDefault();
                takeTyped();
              }}
            >
              <input
                className="text-input text-input--quiet num__count"
                value={draft}
                onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
                /* The numeric pad, not the alphabet: there is nothing to type
                   here that is not a digit, and `pattern` is what gets iOS to
                   show it. The strip above does the rest — non-digits never
                   reach the state, so a pasted "twelve" is simply nothing. */
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={2}
                placeholder={String(dare)}
                aria-label={`How many, more than ${bid}`}
                autoFocus
              />
              <button type="submit" className="chip">
                Set
              </button>
              <button
                type="button"
                className="chip"
                onClick={() => {
                  setWriting(false);
                  setDraft("");
                }}
              >
                Back
              </button>
            </form>
          ) : (
            <div className="chips num__dares">
              {dares.map((n) => (
                <button
                  key={n}
                  type="button"
                  className="chip"
                  data-on={n === dare || undefined}
                  aria-pressed={n === dare}
                  onPointerDown={() => audio.play("tap")}
                  onClick={() => setDare(n)}
                >
                  {n}
                </button>
              ))}
              {/* WHAT SOMEBODY ACTUALLY SAID. Three numbers cover the bidding
                  a table does by reflex and none of them is 7, which is the
                  number somebody will claim out loud on the night. Last in
                  the row, and the only one set in words, because it is the
                  option you take when none of the others is the bid. */}
              <button
                type="button"
                className="chip num__other"
                onPointerDown={() => audio.play("tap")}
                onClick={() => setWriting(true)}
              >
                Other
              </button>
            </div>
          )}

          {/* THE TABLE, DEALT AS CARDS — the category picker's, the same
              stock and the same deal, because it is the same act: a page of
              options a table scans together and one of them gets tapped. They
              were vote-pad pills before, which is the control for a poll
              nobody is looking at from across the table.

              The holder is left off: raising your own bid is bidding against
              yourself, and the only thing anyone else can do is exactly what
              these are for. */}
          {/* The names take the slack, so the space the question is not using
              lands between the numbers and the names rather than above them
              both. `.focal__center`'s pair of auto margins — the second of
              exactly two in this column, which is why .actions gives its own
              up when one is present. */}
          <div className="picker__scroll focal__center" onScroll={fadeOnScroll}>
            <div className="num__seats">
              {pad
                .filter((name) => name !== holder)
                .map((name, i) => (
                  <button
                    key={name}
                    className="picker__card num__seat"
                    /* Stops counting at 8, like the picker's own — past that
                       the delay is spent on cards below the fold. */
                    style={{ ["--i" as string]: Math.min(i, 8) }}
                    onPointerDown={() => audio.play("tap")}
                    onClick={() => claim(name)}
                  >
                    {name}
                  </button>
                ))}
            </div>
          </div>

          {/* Only while the category is untouched. Once someone has taken a
              number the category is in play, and changing it would be a way
              out of a bid you cannot meet rather than a way past a bad
              prompt — so the pair goes and the call takes its place. Both
              blocks stand one control tall, which is why the names do not
              move at the moment somebody bids. */}
          {holder ? (
            <div className="actions">
              {/* The one --lg on the screen, and only once there is something
                  to call. Before that the names ARE the action and nothing
                  here should outrank them. */}
              <button className="btn btn--lg btn--block" onClick={challenge}>
                Prove it, {holder}
              </button>
            </div>
          ) : (
            <div className="actions--row">
              <button className="btn btn--ghost" onClick={drawRandom}>
                Random
              </button>
              <button className="btn btn--ghost" onClick={() => openPicker("bidding")}>
                Categories
              </button>
            </div>
          )}
        </div>
      )}

      {/* ---------- The challenge ---------- */}
      {phase === "challenge" && (
        <CardBody
          card={
            <div className="card">
              <span className="card__eyebrow">
                {holder} names {bid}
              </span>
              <span className="num__bid-n" data-low={timer.seconds <= 5 || undefined}>
                {timer.seconds}
              </span>
              {/* Who called it is not the app's to know any more — anyone at
                  the table could have, and it was said out loud a second ago.
                  Asking the phone which of them it was, to print a name here
                  nobody has forgotten, is the queueing this mode just got rid
                  of. */}
              <span className="num__bid-who">{timer.expired ? "Time" : "Called out"}</span>
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
                Did {holder} get {bid}?
              </span>
              <p className="card__prompt card__prompt--sm">
                If they did, whoever called it drinks. If not, {holder} does.
              </p>
              <p className="card__meta">The table decides what counts.</p>
            </div>
          }
        >
          {/* THE PAIR, AND NOTHING ABOVE IT. Every other screen in the app
              ranks one action --lg, and this is the one screen with nothing
              to rank: the round is settled, the only question left is which
              category next, and the two answers to it are equally good ones.
              Drawing one of them larger would be the app having an opinion
              about which — the same opinion the single New category button
              used to enforce by being the only way through. */}
          <div className="actions--row">
            <button className="btn btn--ghost" onClick={drawRandom}>
              Random
            </button>
            <button className="btn btn--ghost" onClick={() => openPicker("verdict")}>
              Categories
            </button>
          </div>
        </CardBody>
      )}
    </GameScreen>
  );
}
