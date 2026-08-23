import { useCallback, useEffect, useState } from "react";
import { CardBody, GameScreen } from "../components/GameScreen";
import { Dial } from "../components/Dial";
import { CategoryPicker } from "../components/CategoryPicker";
import { useDeck } from "../lib/deck";
import { usePool } from "../data/pools";
import { BALLPARK, degreesOff, randomTarget, zoneFor, type Spectrum } from "../data/ballpark";
import { useContentMode } from "../state/contentMode";
import { useRoster } from "../state/roster";
import { audio } from "../lib/audio";
import { buzz } from "../lib/useCountdown";
import type { ModeDef } from "../data/modes";

/**
 * BALLPARK
 *
 * One player sees a hidden point on a spectrum between two opposing ideas and
 * says one thing that sits there. Everyone else argues, and moves a dial to
 * where they think it was.
 *
 * The clue is never typed in. It is said out loud and the app never learns
 * what it was — same arrangement as Same Page, and for the same reason: the
 * round is a conversation between people who should be looking at each other,
 * and the phone is only holding the secret.
 *
 * NOTHING IS SCORED, and the mode is better for it. It was built with bands,
 * points per round and a running total, which turned an argument about
 * whether a hot dog is a sandwich into a thing the table could get wrong.
 * Same Page and Odd One Out both keep no score either — this app has arrived
 * at that answer more than once. The reveal shows the answer beside the guess
 * and says how far off it was, and how much that matters is the table's
 * business. The rounds simply keep coming.
 */

type Phase = "handoff" | "picking" | "reading" | "guessing" | "reveal";

/**
 * A pair, written as one line for the picker.
 *
 * CategoryPicker deals in strings — every other mode's entry IS a string, so
 * the component has no reason to know otherwise. Ballpark's entry is two of
 * them, so it is flattened on the way in and looked back up on the way out
 * rather than the picker learning about pairs.
 */
function labelFor(s: Spectrum): string {
  return `${s.left} / ${s.right}`;
}

interface Props {
  mode: ModeDef;
  onBack: () => void;
}

export function Ballpark({ mode, onBack }: Props) {
  const { mode: contentMode } = useContentMode();
  const { players, hasRoster } = useRoster();
  /* SUPPLEMENT, not lead: the pool IS browsable through the picker, but the
     Night tier is empty, so there is no ordering claim to make about it yet.
     Worth revisiting to `lead` the day 19+ pairs are written. */
  const pool = usePool(BALLPARK, contentMode, "supplement");
  const deck = useDeck(pool);

  const [phase, setPhase] = useState<Phase>("handoff");
  const [roundIndex, setRoundIndex] = useState(0);
  const [target, setTarget] = useState(randomTarget);
  const [guess, setGuess] = useState(50);
  const [hasMovedDial, setHasMovedDial] = useState(false);
  const [locked, setLocked] = useState<number | null>(null);
  /** Whether the Reader has turned the clue card over. */
  const [flipped, setFlipped] = useState(false);
  /**
   * Set when the table chose a spectrum; otherwise the deck's draw stands.
   * The same two-source arrangement Same Page and Letter Rip use for their
   * prompt, and for the same reason: a hand-picked one has to survive the
   * round, and a drawn one has to keep advancing.
   */
  const [chosen, setChosen] = useState<Spectrum | null>(null);

  /**
   * WHOSE TURN IT IS, WORKED OUT AT RENDER RATHER THAN STORED.
   *
   * Somebody leaving mid-session shortens `players` under a stored index, and
   * a stored one would then point past the end and hand the phone to
   * `undefined`. Taking the modulo of the CURRENT length every time cannot:
   * the rotation simply closes up around the gap, which is also what happens
   * at the table when someone goes to the bar.
   */
  const reader =
    hasRoster && players.length > 0
      ? players[roundIndex % players.length]
      : `Player ${(roundIndex % 6) + 1}`;

  const prompt = chosen ?? deck.current;
  const distance = locked === null ? 0 : Math.round(Math.abs(locked - target));

  /**
   * HOW FAR OFF, SAID IN A UNIT THAT IS ACTUALLY ON THE SCREEN.
   *
   * Degrees, because the arc is a real piece of a circle and the gap between
   * the two needles is an angle a player can see. The 0-100 scale is internal
   * and never drawn, so "off by twelve" would be twelve of nothing — which is
   * what a bare number off it read as when this line tried one.
   */
  const gapLine =
    distance === 0
      ? "Dead on."
      : `${zoneFor(distance)?.name ?? "Not this time."} Off by ${degreesOff(distance)}\u00B0.`;

  /**
   * THE ONE REAL LEAK IN PASS-THE-PHONE.
   *
   * The card is face up, the screen sleeps, and the phone wakes on the table
   * showing the answer. Nothing else can catch that — the Reader never let go
   * of anything, the page just stopped being looked at — so visibility itself
   * turns the card back over.
   */
  useEffect(() => {
    if (phase !== "reading") return;
    const hide = () => {
      if (document.hidden) setFlipped(false);
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", hide);
    };
  }, [phase]);

  /* The result sounds while the needle is still drawing itself in, so the
     table hears how it went before it finishes reading the gap. */
  useEffect(() => {
    if (phase !== "reveal") return;
    const t = window.setTimeout(() => audio.play("verdict", distance), 380);
    return () => window.clearTimeout(t);
  }, [phase, distance]);

  /**
   * Hands the choice back to the deck. Clears `chosen` on the way past, or
   * Random would be the one control on the screen that does nothing once the
   * table had picked something.
   */
  const drawRandom = useCallback(() => {
    setChosen(null);
    deck.draw();
  }, [deck]);

  const takePhone = useCallback(() => {
    audio.play("advance");
    setPhase("reading");
  }, []);

  const lockIn = useCallback(() => {
    if (!hasMovedDial) return;
    audio.play("lock");
    buzz([30, 40, 60]);
    setLocked(guess);
    setPhase("reveal");
  }, [hasMovedDial, guess]);

  const nextRound = useCallback(() => {
    deck.draw();
    setChosen(null);
    setTarget(randomTarget());
    setGuess(50);
    setHasMovedDial(false);
    setLocked(null);
    setFlipped(false);
    setRoundIndex((n) => n + 1);
    setPhase("handoff");
  }, [deck]);

  const onDial = useCallback((v: number) => {
    setGuess(v);
    setHasMovedDial(true);
  }, []);

  if (!prompt) return null;

  /* No header: its X leaves the round entirely, and the picker's own Back
     goes where you actually mean. Same treatment Same Page, Letter Rip and
     Odd One Out give this screen. */
  if (phase === "picking") {
    return (
      <GameScreen mode={mode} hideHeader onBack={onBack}>
        <CategoryPicker
          categories={pool.map(labelFor)}
          heading="Pick a spectrum"
          /* OFF, for the reason Rank It has it off: an entry here is not a
             word but a PAIR, and a single text field can only take one. A
             half-written spectrum does not personalise a round, it breaks
             one. */
          allowCustom={false}
          onPick={(label) => {
            const pick = pool.find((sp) => labelFor(sp) === label);
            if (pick) setChosen(pick);
            setPhase("handoff");
          }}
          onCancel={() => setPhase("handoff")}
        />
      </GameScreen>
    );
  }

  /**
   * THE INSTRUMENT, WHICHEVER ONE IS ON.
   *
   * One call site per phase rather than a branch inside each of them, so the
   * three screens keep reading as three screens and the choice is made once.
   */
  return (
    <GameScreen
      mode={mode}
      /* THE SPECTRUM IS THE LIVE LINE.
         It is the one thing a table has to hold on to across all four screens
         — the clue means nothing without it, and on the reveal the dial's own
         end labels are too small to re-read from across a table. Odd One Out
         puts its category here for the same reason.

         No "Spectrum:" label in front of it, which is where this departs from
         that one. "Any" says nothing on its own and needs the question asked
         above it; "Underrated / Overrated" is already the whole thought, and
         these pairs run long enough — "Insignificant cultural event" is one
         end of one — that a label would cost a third line in a header that
         reserves its height. */
      subtitle={`${prompt.left} / ${prompt.right}`}
      /* The Reader's card is the one thing in here one person reads. */
      isPrivate={phase === "reading"}
      onBack={onBack}
    >
      {phase === "handoff" && (
        <CardBody
          className="bp bp-handoff"
          card={
            <div className="cardstage">
              <article className="card card--dealt" key={roundIndex}>
                <span className="card__eyebrow">Pass the phone</span>
                <p className="bp-handoff__name">{reader}</p>
                <p className="card__meta">Everyone else, look away.</p>
              </article>
            </div>
          }
        >
          {/* BOTH WAYS TO CHANGE THE SPECTRUM, side by side, exactly where
              Same Page and Letter Rip put them — a tap for a different one,
              or the whole list to read together.

              On THIS screen and not the Reader's, because the pair is public.
              The secret in this mode is the target, not the spectrum: the two
              ends are printed at either side of the dial the moment the group
              starts guessing. So the table can pick one together before the
              phone goes anywhere, and nothing leaks by their doing it. */}
          <div className="actions--row">
            <button className="btn btn--ghost" onClick={drawRandom}>
              Random
            </button>
            <button className="btn btn--ghost" onClick={() => setPhase("picking")}>
              Categories
            </button>
          </div>

          <div className="actions">
            {/* NAMED, not "Continue". The whole round leaks if the wrong
                person is holding the phone when the target appears, and a
                button that says a name is the only thing on the screen that
                can stop that — you cannot tap "I'm Sam" by reflex while Sam
                is still reaching for it. */}
            <button className="btn btn--lg btn--block" onClick={takePhone}>
              I'm {reader}
            </button>
          </div>
        </CardBody>
      )}

      {/* THE CLUE ARRIVES FACE DOWN.

          It was a press-and-hold behind an interpolated blur, which worked
          and was still the wrong object: every other secret in this app is a
          card that turns over — Odd One Out's role, every prompt deck, both
          card games — and a blur that lifts under a finger is a fourth
          gesture for the one thing the app already had a vocabulary for.
          Turning a card over also survives being watched: a table can see the
          Reader flip it and still learn nothing, where a thumb held on a
          smear invites everyone to lean in and see what it is hiding.

          The flip is the same one the decks deal with — remounting on a key,
          which replays .card--dealt. See PromptCard.

          NO WAY BACK TO FACE DOWN. There was one, on the grounds that a
          Reader who gets up mid-round otherwise hands over a live answer —
          but the visibility handler above already turns the card back over
          the moment the screen sleeps or the app is backgrounded, which is
          how a phone actually changes hands, and the button was the only
          second action on any screen in the mode. */}
      {phase === "reading" && !flipped && (
        <CardBody
          className="bp bp-reading"
          card={
            <div className="cardstage">
              <article className="card card--dealt bp-clue" key="back">
                <span className="card__eyebrow">Your clue</span>
                {/* The spectrum is NOT repeated on the card. It is in the
                    header directly above, and the one thing this app's header
                    has already been stripped of once is lines that restate
                    the card underneath them. */}
                <p className="card__meta">Turn it over when nobody else can see.</p>
              </article>
            </div>
          }
        >
          <div className="actions">
            <button
              className="btn btn--lg btn--block"
              onClick={() => {
                audio.play("card");
                setFlipped(true);
              }}
            >
              Flip
            </button>
          </div>
        </CardBody>
      )}

      {phase === "reading" && flipped && (
        <CardBody
          className="bp bp-reading"
          card={
            <div className="cardstage">
              <article className="card card--dealt bp-clue" key="face">
                <span className="card__eyebrow">Your clue</span>
                {/* THE ZONES, NOT JUST A NEEDLE. A needle alone tells the
                    Reader a POINT, and a point is not what they have to clue
                    — they have to clue a REGION, and how wide that region is
                    before the table stops calling it close is exactly what
                    the bands draw. */}
                <Dial
                  value={target}
                  target={target}
                  showZones
                  left={prompt.left}
                  right={prompt.right}
                />
                <p className="card__meta">Say one thing that sits right there.</p>
              </article>
            </div>
          }
        >
          <div className="actions">
            <button
              className="btn btn--lg btn--block"
              onClick={() => {
                audio.play("advance");
                setPhase("guessing");
              }}
            >
              Good, next
            </button>
          </div>
        </CardBody>
      )}

      {phase === "guessing" && (
        <CardBody
          className="bp bp-guessing"
          card={
            <div className="cardstage">
              <article className="card card--dealt" key={`guess-${roundIndex}`}>
                <span className="card__eyebrow">Where is it?</span>
                <Dial value={guess} onChange={onDial} left={prompt.left} right={prompt.right} />
                <p className="card__meta">
                  {hasMovedDial ? "Everyone agree?" : "Drag anywhere on the dial."}
                </p>
              </article>
            </div>
          }
        >
          <div className="actions">
            {/* DISABLED UNTIL THE DIAL HAS ACTUALLY MOVED. A guess that
                defaults to the middle and submits is a round the group can
                sit out, and the middle is a defensible answer often enough
                that they would. */}
            <button className="btn btn--lg btn--block" onClick={lockIn} disabled={!hasMovedDial}>
              Lock it in
            </button>
          </div>
        </CardBody>
      )}

      {phase === "reveal" && (
        <CardBody
          className="bp bp-reveal"
          card={
            <div className="cardstage">
              <article className="card card--dealt" key={`reveal-${roundIndex}`}>
                <span className="card__eyebrow">Results</span>
                <Dial
                  value={locked ?? guess}
                  left={prompt.left}
                  right={prompt.right}
                  target={target}
                  showZones
                  lockedGuess={locked}
                  revealing
                />
                {/* THE ZONE NAMES THE RESULT AND THE ANGLE QUALIFIES IT.
                    "Close." alone throws away the one precise thing the round
                    produced, and a bare number was worse — the 0-100 scale is
                    internal and undrawn, so it read as a quantity of nothing.
                    Degrees are the unit the arc actually has. */}
                <p className="card__meta bp-reveal__gap">{gapLine}</p>
              </article>
            </div>
          }
        >
          <div className="actions">
            <button className="btn btn--lg btn--block" onClick={nextRound}>
              Next round
            </button>
          </div>
        </CardBody>
      )}
    </GameScreen>
  );
}
