import { useCallback, useEffect, useState, type ReactNode } from "react";
import { CardBody, GameScreen } from "../components/GameScreen";
import { Dial } from "../components/Dial";
import { Meter } from "../components/Meter";
import { CategoryPicker } from "../components/CategoryPicker";
import { useDeck } from "../lib/deck";
import { usePool } from "../data/pools";
import { BALLPARK, degreesOff, randomTarget, zoneFor, type Spectrum } from "../data/ballpark";
import { useContentMode } from "../state/contentMode";
import { useDialStyle } from "../state/dialStyle";
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

/**
 * THE WIDE ARC'S SWEEP.
 *
 * 260 rather than 240 or 280. The radius is capped by the column whatever
 * happens, so every degree past 180 is bought out of the empty bottom corners
 * — but the ends have to stay recognisably a LEFT and a RIGHT, and much past
 * this they start curling under far enough to read as a ring with a bite out
 * of it rather than as a spectrum laid out end to end.
 */
const WIDE_SWEEP = 260;

interface Props {
  mode: ModeDef;
  onBack: () => void;
}

export function Ballpark({ mode, onBack }: Props) {
  const { mode: contentMode } = useContentMode();
  const { players, hasRoster } = useRoster();
  /* WHICH INSTRUMENT, and it is a temporary control — see state/dialStyle. */
  const { style } = useDialStyle();
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
   * THE TWO WAYS THE INSTRUMENT CHANGES THE SCREEN AROUND IT.
   *
   * `bare` is the layout question, not a colour one: both alternatives are
   * drawn onto the pack colour instead of onto card stock, which means the
   * card, the eyebrow and the caption's home all go with them. `sweep` is
   * only ever read by the arc.
   */
  const bare = style !== "card";
  const sweep = style === "wide" ? WIDE_SWEEP : 180;

  /**
   * HOW FAR OFF, SAID IN A UNIT THAT IS ACTUALLY ON THE SCREEN.
   *
   * The arc has degrees, and a wider arc has more of them for the same miss —
   * correctly, because the two needles really are further apart on it. The
   * meter has no degrees at all, so it falls back to a percentage of the run,
   * and that is a genuine cost of the bar rather than a wording problem: the
   * one thing this line has always refused to print is a bare number off an
   * undrawn 0-100 scale, and on the meter that is the only unit there is.
   */
  const gapLine =
    distance === 0
      ? "Dead on."
      : `${zoneFor(distance)?.name ?? "Not this time."} Off by ${
          style === "meter" ? `${distance}%` : `${degreesOff(distance, sweep)}\u00B0`
        }.`;

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
  const instrument = (props: {
    value: number;
    onChange?: (v: number) => void;
    target?: number | null;
    showZones?: boolean;
    lockedGuess?: number | null;
    revealing?: boolean;
  }) =>
    style === "meter" ? (
      <Meter {...props} left={prompt.left} right={prompt.right} />
    ) : (
      <Dial {...props} left={prompt.left} right={prompt.right} sweep={sweep} bare={bare} />
    );

  /**
   * Whether the instrument is the thing on screen — which is also exactly
   * when the header's live line is a DUPLICATE of it. Both ends of the
   * spectrum are printed on the instrument itself, in bigger type than the
   * header can give them, so on these screens the line above is a second copy
   * of a pair the player is already reading. It goes, and the height it was
   * holding goes into the instrument.
   *
   * Only on the bare layouts. In the card, the arc's own end labels are small
   * enough that the header is genuinely doing work — which is the note above
   * `subtitle` below, and still true.
   */
  const instrumentUp =
    (phase === "reading" && flipped) || phase === "guessing" || phase === "reveal";

  /**
   * A screen with no card: the instrument centred in what the header and the
   * actions leave, with its caption under it. `.focal__center` is how every
   * other cardless screen in the app grounds its action — see global.css.
   */
  const bareScreen = (content: ReactNode, caption: ReactNode, action: ReactNode) => (
    <div className="focal bp bp-bare">
      <div className="focal__center bp-bare__stage">
        {content}
        <p className="bp-bare__meta">{caption}</p>
      </div>
      <div className="actions">{action}</div>
    </div>
  );

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
         reserves its height.

         The bare layouts drop it while the instrument is up, because there it
         is the same pair twice. See `instrumentUp`. */
      subtitle={
        bare && instrumentUp ? undefined : `${prompt.left} / ${prompt.right}`
      }
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

      {phase === "reading" &&
        flipped &&
        (bare ? (
          bareScreen(
            instrument({ value: target, target }),
            "Say one thing that sits right there.",
            <button
              className="btn btn--lg btn--block"
              onClick={() => {
                audio.play("advance");
                setPhase("guessing");
              }}
            >
              Good, next
            </button>,
          )
        ) : (
          <CardBody
            className="bp bp-reading"
            card={
              <div className="cardstage">
                <article className="card card--dealt bp-clue" key="face">
                  <span className="card__eyebrow">Your clue</span>
                  {instrument({ value: target, target })}
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
        ))}

      {phase === "guessing" &&
        /* DISABLED UNTIL THE DIAL HAS ACTUALLY MOVED. A guess that defaults
           to the middle and submits is a round the group can sit out, and the
           middle is a defensible answer often enough that they would. */
        (bare ? (
          bareScreen(
            instrument({ value: guess, onChange: onDial }),
            hasMovedDial ? "Everyone agree?" : "Drag anywhere on the dial.",
            <button className="btn btn--lg btn--block" onClick={lockIn} disabled={!hasMovedDial}>
              Lock it in
            </button>,
          )
        ) : (
          <CardBody
            className="bp bp-guessing"
            card={
              <div className="cardstage">
                <article className="card card--dealt" key={`guess-${roundIndex}`}>
                  <span className="card__eyebrow">Where is it?</span>
                  {instrument({ value: guess, onChange: onDial })}
                  <p className="card__meta">
                    {hasMovedDial ? "Everyone agree?" : "Drag anywhere on the dial."}
                  </p>
                </article>
              </div>
            }
          >
            <div className="actions">
              <button className="btn btn--lg btn--block" onClick={lockIn} disabled={!hasMovedDial}>
                Lock it in
              </button>
            </div>
          </CardBody>
        ))}

      {phase === "reveal" &&
        (bare ? (
          bareScreen(
            instrument({
              value: locked ?? guess,
              target,
              showZones: true,
              lockedGuess: locked,
              revealing: true,
            }),
            gapLine,
            <button className="btn btn--lg btn--block" onClick={nextRound}>
              Next round
            </button>,
          )
        ) : (
          <CardBody
            className="bp bp-reveal"
            card={
              <div className="cardstage">
                <article className="card card--dealt" key={`reveal-${roundIndex}`}>
                  <span className="card__eyebrow">Results</span>
                  {instrument({
                    value: locked ?? guess,
                    target,
                    showZones: true,
                    lockedGuess: locked,
                    revealing: true,
                  })}
                  {/* THE ZONE NAMES THE RESULT AND THE ANGLE QUALIFIES IT.
                      "Close." alone throws away the one precise thing the
                      round produced, and a bare number was worse — the 0-100
                      scale is internal and undrawn, so it read as a quantity
                      of nothing. Degrees are the unit the arc actually has. */}
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
        ))}
    </GameScreen>
  );
}
