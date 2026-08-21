import { useCallback, useEffect, useRef, useState } from "react";
import { CardBody, GameScreen } from "../components/GameScreen";
import { useDeck } from "../lib/deck";
import { usePool } from "../data/pools";
import type { ModeDef } from "../data/modes";
import { useContentMode } from "../state/contentMode";
import { LAST_WORD_CATEGORIES } from "../data/lastWord";
import { CategoryPicker } from "../components/CategoryPicker";
import { audio } from "../lib/audio";

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
const TURN_SECONDS = 10;

/**
 * How long the letter board is kept on screen after a round ends, so it can
 * leave rather than blink out. A beat, not a pause — the table is waiting on
 * the verdict.
 */
const BOARD_LEAVE_MS = 180;

type Phase = "intro" | "picking" | "playing" | "lost";

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
  const categories = usePool(LAST_WORD_CATEGORIES, contentMode, "lead");
  const deck = useDeck(categories);

  const [phase, setPhase] = useState<Phase>("intro");
  /** Set when the group picked or wrote one; otherwise the deck's draw is used. */
  const [chosen, setChosen] = useState<string | null>(null);
  const [used, setUsed] = useState<string[]>([]);
  /**
   * Whether the category on screen has already been played.
   *
   * The round-over screen used to offer Next round as its one-tap exit, which
   * replayed the category the table had just spent a round on. Nobody wants
   * that: the letters they reached for are the ones already gone, and if they
   * genuinely do want it again it is two taps through Categories. So the
   * button is locked until the category changes, and Random or Categories is
   * what changes it.
   */
  const [played, setPlayed] = useState(false);
  /**
   * The board on its way out.
   *
   * A round ended by cutting straight to the verdict: twenty letter tiles and
   * a clock vanished between two frames while the card underneath flipped in,
   * so the busiest screen in the app was the only one that left without a
   * word. The board is held for a beat and animated out first.
   *
   * The hold is a timeout, not an animation event — the same rule the live
   * line's exit follows. A stalled animation then costs the exit and nothing
   * else; waiting on `animationend` would strand a dead letter grid over a
   * finished round.
   */
  const [leaving, setLeaving] = useState(false);
  const exit = useRef<number>(undefined);
  const [remaining, setRemaining] = useState(TURN_SECONDS * 1000);
  const deadline = useRef(0);
  /**
   * True while `deck.current` is a category the table has been shown on the
   * intro card but hasn't played yet — a fresh deck deals one face-up, and
   * Random deals another. Without it, Start round drew a second time and the
   * table played a category it had never seen.
   */
  const pending = useRef(true);

  /** Ends the round, but lets the board go first. */
  const endRound = useCallback(() => {
    setLeaving(true);
    exit.current = window.setTimeout(() => {
      setLeaving(false);
      setPhase("lost");
    }, BOARD_LEAVE_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(exit.current), []);

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
        endRound();
        buzz([90, 60, 180]);
        return;
      }
      setRemaining(left);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, endRound]);

  const beginRound = useCallback(() => {
    // A hand-picked category sticks for its round; otherwise advance the deck,
    // unless one is already face-up and unplayed.
    if (!chosen) {
      if (!pending.current) deck.draw();
      pending.current = false;
    }
    setUsed([]);
    setPlayed(true);
    startTurn();
    setPhase("playing");
  }, [deck, startTurn, chosen]);

  /**
   * Deal a category and show it, rather than dealing straight into a round.
   * The table reads it off the intro card and starts when it's ready — same
   * landing the picker uses, so both ways of changing category end up in the
   * same place.
   */
  const drawRandom = useCallback(() => {
    setChosen(null);
    deck.draw();
    pending.current = true;
    setPlayed(false);
    /**
     * Always the intro, from either screen. That is where the category is a
     * CARD — dealt, turned over, the thing you are looking at — and the header
     * carries it only while it is in play or has just ended. Changing the
     * category on the round-over screen instead left it as a line of header
     * text that quietly swapped, which is the same information demoted to a
     * caption at the exact moment it becomes the point again.
     */
    setPhase("intro");
  }, [deck]);

  const lockLetter = useCallback(
    (letter: string) => {
      if (used.includes(letter)) return;
      const next = [...used, letter];
      setUsed(next);
      buzz(25);
      /**
       * The last letter does not end anything. Every letter goes back up and
       * play carries on, on the same category.
       *
       * Clearing the bank used to be a win state with its own screen, which
       * had the game finishing at the exact moment a table had hit its stride.
       * It is not the app's call: a round ends when someone runs out of time
       * or says they cannot go, and both of those are the players' to make.
       * All the app does here is deal the board again — with a longer buzz, so
       * whoever is holding the phone feels the wrap rather than wondering why
       * every letter came back.
       */
      if (next.length === LETTERS.length) {
        setUsed([]);
        buzz([40, 50, 40]);
        startTurn();
        return;
      }
      startTurn();
    },
    [used, startTurn],
  );

  /**
   * THE SOUND GOES ON THE PRESS, NOT ON THE CLICK.
   *
   * `click` arrives on release. On a board being played at the speed of a
   * thumb that is late enough to hear as lag against the finger, and this is
   * the one screen in the app where presses come in a run rather than one at a
   * time. pointerdown is the first event of a press, so the sound lands on the
   * frame the letter is touched — before the letter has locked, which is the
   * right order for the same reason the tile's own press animation is.
   *
   * It is also the only place both answers are known. A free letter and one
   * already gone are the same gesture, and by the time anything has changed
   * the difference is gone with it.
   */
  const pressLetter = useCallback(
    (letter: string) => audio.play(used.includes(letter) ? "reject" : "tap"),
    [used],
  );

  const seconds = Math.ceil(remaining / 1000);
  const progress = remaining / (TURN_SECONDS * 1000);
  const category = chosen ?? deck.current ?? "";

  if (phase === "intro") {
    return (
      <GameScreen mode={mode} onBack={onBack}>
        <CardBody
          card={
            /* Keyed on the category, so a new one TURNS OVER rather than
               swapping its text in place. `.slot > .card` already carries the
               flip every other mode's cards deal on — it replays on remount,
               and without a key React was reusing this element and Random was
               a silent text substitution on a card that never moved. */
            <div className="card" key={chosen ?? `deck-${deck.drawCount}`}>
              <span className="card__eyebrow">Category</span>
              <p className="card__prompt">{category}</p>
              <p className="card__meta">
                Say an answer, tap its first letter, pass the phone. {TURN_SECONDS} seconds each.
              </p>
            </div>
          }
        >
          <div className="actions--row">
            <button className="btn btn--ghost" onClick={drawRandom}>
              Random
            </button>
            <button className="btn btn--ghost" onClick={() => setPhase("picking")}>
              Categories
            </button>
          </div>
          <div className="actions">
            <button className="btn btn--lg btn--block" onClick={beginRound}>
              Start round
            </button>
          </div>
        </CardBody>
      </GameScreen>
    );
  }

  if (phase === "picking") {
    return (
      /* No header: its chevron would leave the round entirely, and the
         picker's own Back goes where you actually mean. */
      <GameScreen mode={mode} hideHeader onBack={onBack}>
        <CategoryPicker
          categories={categories}
          onPick={(c) => {
            setChosen(c);
            setPlayed(false);
            setPhase("intro");
          }}
          onCancel={() => setPhase("intro")}
        />
      </GameScreen>
    );
  }

  if (phase === "lost") {
    return (
      /* The category stays in the header, exactly where the round left it —
         see GameHeader's `subtitle`. It spent a turn in the eyebrow, which is
         a slot for a short fixed label: "Things you'd hide before someone
         comes over" doesn't fit one line of a chip on a phone, so the chip
         stretched the width of the card and the text floated in the middle of
         it with 55px of pink either side. A pill can't shrink to its own
         wrapped lines in CSS — it fills what it's given — so the fix is to
         stop asking a label chip to carry a sentence. */
      <GameScreen mode={mode} subtitle={category} onBack={onBack}>
        {/* `lw-over` is only here so the stylesheet can tell this screen from
            the playing one and slide the category down into it — see
            `live-drop`. It carries no layout of its own. */}
        <CardBody
          className="lw-over"
          card={
            <div className="card">
              {/* The round can end two ways and the button covers both, so
                  the card has to say which happened. `remaining` is the tell:
                  the clock zeroes it on expiry, and a round ended by hand
                  still has time on it. */}
              <p className="card__prompt">{remaining <= 0 ? "Out of time." : "Round over."}</p>
              {/* Not "whoever's holding the phone". That is only the same
                  person while the phone is being passed hand to hand, and
                  plenty of tables leave it face up in the middle and lean in.
                  Whose turn it was is the fact the round actually ended on,
                  and it is true however the phone is being played. */}
              <p className="card__meta">Whoever's turn it was drinks.</p>
            </div>
          }
        >
          {/* The same two ways out the intro card offers. Next round is the
              path a table usually wants — but a hand-picked category sticks
              to it, and a category gets mined dry at exactly the moment a
              round ends. Until now this screen's only exit was to play it
              again, or to leave the mode entirely by the chevron. */}
          <div className="actions--row">
            <button className="btn btn--ghost" onClick={drawRandom}>
              Random
            </button>
            <button className="btn btn--ghost" onClick={() => setPhase("picking")}>
              Categories
            </button>
          </div>
          <div className="actions">
            {/* Locked once the category has been played — see `played`.

                In practice that means locked whenever this screen is on, since
                both ways of unlocking it leave for the intro, where the button
                is Start round instead. It is kept, and disabled rather than
                removed, because it is the thing the table reaches for: seeing
                it greyed with Random and Categories live above it says "not
                that one again, pick another" in a way an absent button
                cannot. */}
            <button
              className="btn btn--lg btn--block"
              onClick={beginRound}
              disabled={played}
            >
              Next round
            </button>
          </div>
        </CardBody>
      </GameScreen>
    );
  }

  return (
    /* The category is the one thing a player has to keep in their head for
       the whole round — see GameHeader's `subtitle`. */
    <GameScreen mode={mode} subtitle={category} onBack={onBack}>
      <div className="focal lw" data-leaving={leaving || undefined}>
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

          {/* The keys take whatever height is left after the timer, and the
              grid sizes itself against it — see .lw__keys. */}
          <div className="lw__keys">
            <div className="lw__grid">
              {LETTERS.map((letter, i) => (
                <button
                  key={letter}
                  className="lw__letter"
                  /* Its place on the ring, at the sizes that get one — 20
                     letters, 18° apart, A at the top going clockwise. The
                     grid ignores it. See .lw__ring in games.css. */
                  style={{ ["--i" as string]: i }}
                  data-locked={used.includes(letter) || undefined}
                  /* aria-disabled, NOT disabled. A disabled control is inert
                     to input — no click, and on WebKit no pointer events at
                     all — so a letter that is already gone had no way to say
                     so. It is still announced as disabled and `lockLetter`'s
                     own guard is what actually refuses the press; the flag
                     here was never the thing keeping the letter down. */
                  aria-disabled={used.includes(letter) || undefined}
                  onPointerDown={() => pressLetter(letter)}
                  onClick={() => lockLetter(letter)}
                  aria-label={`${letter}${used.includes(letter) ? " (already used)" : ""}`}
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="actions">
          {/* Deliberately neutral. It was "Can't go — I drink", which named
              only one of the two ways a turn dies — the other is repeating a
              letter someone already used, and a table had nothing to press
              for it. */}
          <button className="btn btn--ghost btn--block" onClick={endRound}>
            End round
          </button>
        </div>
      </div>
    </GameScreen>
  );
}
