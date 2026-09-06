import { useCallback, useEffect, useRef, useState } from "react";
import { CardBody, GameScreen } from "../components/GameScreen";
import { Dial } from "../components/Dial";
import { CategoryPicker } from "../components/CategoryPicker";
import { useDeck } from "../lib/deck";
import { usePool } from "../data/pools";
import { BALLPARK, degreesOff, randomTarget, zoneFor, type Spectrum } from "../data/ballpark";
import { useContentMode } from "../state/contentMode";
import { useRoster } from "../state/roster";
import { useExitGuard } from "../state/exitGuard";
import { useWhenHidden } from "../lib/useWhenHidden";
import { audio } from "../lib/audio";
import { buzz } from "../lib/useCountdown";
import type { ModeDef } from "../data/modes";
import {
  initialFlow,
  isLive,
  positionText,
  reduce,
  type Action,
  type Flow,
} from "./ballparkFlow";

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
 * NOTHING IS SCORED, and the mode is better for it. The reveal shows the
 * answer beside the guess and says how far off it was, and how much that
 * matters is the table's business. The rounds simply keep coming.
 *
 * THE FIRST ROUND TEACHES ITSELF. The mechanic is three sentences and an
 * example, and a table that has not heard them cannot play — the old flow
 * handed the phone over with "Flip" and left the Reader to guess what a dial
 * with a needle on it was asking of them. So the mode opens on a short card
 * that says it once, per phone, and can be asked for again from the handoff
 * screen. See ballparkFlow.ts for the sequence itself.
 */

const INTRO_KEY = "lastcall.ballpark.intro";

function readSeenIntro(): boolean {
  try {
    return window.localStorage.getItem(INTRO_KEY) === "seen";
  } catch {
    return false;
  }
}

function writeSeenIntro(): void {
  try {
    window.localStorage.setItem(INTRO_KEY, "seen");
  } catch {
    /* storage unavailable; the intro shows again next time, which is fine */
  }
}

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

/** The worked example on the intro card. A real pair from the pool, so the
    dial the table meets next looks like the one they were just shown. */
const EXAMPLE = { left: "Snack", right: "Meal", target: 78, clue: "A burrito" };

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

  /**
   * THE ROUND IS A REDUCER, AND THE REF IS WHAT MAKES DOUBLE TAPS SAFE.
   *
   * `act` runs the transition against the LATEST state — not the one this
   * render closed over — and only performs the side effect its caller asked
   * for when something actually changed. Two "Next round" presses in one
   * frame therefore draw one card, not two, and two "Lock it in" presses
   * sound one verdict.
   */
  const [flow, setFlow] = useState<Flow>(() => initialFlow(readSeenIntro()));
  const flowRef = useRef(flow);
  flowRef.current = flow;
  const act = useCallback((action: Action, then?: () => void): boolean => {
    const next = reduce(flowRef.current, action);
    if (next === flowRef.current) return false;
    flowRef.current = next;
    setFlow(next);
    then?.();
    return true;
  }, []);

  const [target, setTarget] = useState(randomTarget);
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
      ? players[flow.round % players.length]
      : `Player ${(flow.round % 6) + 1}`;

  const prompt = chosen ?? deck.current;
  const distance = flow.locked === null ? 0 : Math.round(Math.abs(flow.locked - target));

  /**
   * HOW FAR OFF, SAID IN A UNIT THAT IS ACTUALLY ON THE SCREEN.
   *
   * Degrees, because the arc is a real piece of a circle and the gap between
   * the two needles is an angle a player can see. The 0-100 scale is internal
   * and never drawn, so "off by twelve" would be twelve of nothing.
   */
  const gapLine =
    distance === 0
      ? "Dead on."
      : `${zoneFor(distance)?.name ?? "Not this time."} Off by ${degreesOff(distance)}°.`;

  /* Leaving mid-round costs the table its target; the setup screens cost nothing. */
  useExitGuard(isLive(flow.phase));

  /**
   * THE ONE REAL LEAK IN PASS-THE-PHONE. The card is face up, the screen
   * sleeps, and the phone wakes on the table showing the answer. Visibility
   * itself turns the card back over, and the Reader has to reveal it again.
   */
  useWhenHidden(flow.phase === "reading" && flow.revealed, () => act({ type: "hidden" }));

  /* The result sounds while the needle is still drawing itself in, so the
     table hears how it went before it finishes reading the gap. */
  useEffect(() => {
    if (flow.phase !== "reveal") return;
    const t = window.setTimeout(() => audio.play("verdict", distance), 380);
    return () => window.clearTimeout(t);
  }, [flow.phase, distance]);

  /**
   * FOCUS FOLLOWS THE PHASE. Each screen's card is the thing to read next,
   * so it takes focus when it arrives — a screen reader lands on the new
   * card rather than staying on a button that has just unmounted, and a
   * keyboard's next Tab reaches the primary action.
   */
  const focalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    focalRef.current?.focus({ preventScroll: true });
  }, [flow.phase, flow.revealed]);

  /**
   * Hands the choice back to the deck. Clears `chosen` on the way past, or
   * Random would be the one control on the screen that does nothing once the
   * table had picked something.
   */
  const drawRandom = useCallback(() => {
    setChosen(null);
    deck.draw();
  }, [deck]);

  const gotIt = useCallback(() => {
    act({ type: "gotIt" }, () => {
      writeSeenIntro();
      audio.play("advance");
    });
  }, [act]);

  const reveal = useCallback(() => {
    act({ type: "reveal" }, () => audio.play("card"));
  }, [act]);

  const hideAndPass = useCallback(() => {
    act({ type: "hideAndPass" }, () => audio.play("advance"));
  }, [act]);

  const onDial = useCallback((v: number) => act({ type: "dial", value: v }), [act]);

  const lockIn = useCallback(() => {
    act({ type: "lock" }, () => {
      audio.play("lock");
      buzz([30, 40, 60]);
    });
  }, [act]);

  const nextRound = useCallback(() => {
    act({ type: "next" }, () => {
      deck.draw();
      setChosen(null);
      setTarget(randomTarget());
    });
  }, [act, deck]);

  if (!prompt) return null;

  /* No header: its X leaves the round entirely, and the picker's own Back
     goes where you actually mean. Same treatment Same Page, Letter Rip and
     Odd One Out give this screen. */
  if (flow.phase === "picking") {
    return (
      <GameScreen mode={mode} hideHeader onBack={onBack}>
        <CategoryPicker
          categories={pool.map(labelFor)}
          heading="Pick a spectrum"
          /* OFF, for the reason Rank It has it off: an entry here is not a
             word but a PAIR, and a single text field can only take one. */
          allowCustom={false}
          onPick={(label) => {
            const pick = pool.find((sp) => labelFor(sp) === label);
            if (pick) setChosen(pick);
            act({ type: "spectrumPicked" });
          }}
          onCancel={() => act({ type: "spectrumPicked" })}
        />
      </GameScreen>
    );
  }

  const spectrumLine = `${prompt.left} / ${prompt.right}`;

  return (
    <GameScreen
      mode={mode}
      /* THE SPECTRUM IS THE LIVE LINE. It is the one thing a table has to
         hold on to across every screen — the clue means nothing without it.
         The intro has its own example and does not carry it. */
      subtitle={flow.phase === "intro" ? undefined : spectrumLine}
      /* The Reader's card is the one thing in here one person reads. */
      isPrivate={flow.phase === "reading"}
      onBack={onBack}
    >
      {/* ---------- How to play: once per phone, and on request ---------- */}
      {flow.phase === "intro" && (
        <CardBody
          className="bp bp-intro"
          card={
            <div className="cardstage">
              <article className="card card--dealt bp-intro__card" key="intro" ref={focalRef} tabIndex={-1}>
                <span className="card__eyebrow">How to play</span>
                <ol className="bp-intro__steps">
                  <li>One player sees a secret spot on a spectrum.</li>
                  <li>They say one clue that sits right there.</li>
                  <li>Everyone else turns a dial to where they think it was.</li>
                </ol>
                {/* THE EXAMPLE IS THE DIAL, NOT A SENTENCE ABOUT ONE. A
                    picture of a target with the clue beside it shows the
                    relationship the three lines above can only describe. */}
                <Dial
                  value={EXAMPLE.target}
                  target={EXAMPLE.target}
                  showZones
                  left={EXAMPLE.left}
                  right={EXAMPLE.right}
                  description={`Example: the target sits ${positionText(EXAMPLE.target, EXAMPLE.left, EXAMPLE.right)}.`}
                />
                <p className="card__meta bp-intro__example">
                  Target near <b>{EXAMPLE.right}</b>. Clue: <b>“{EXAMPLE.clue}.”</b>
                </p>
              </article>
            </div>
          }
        >
          <div className="actions">
            <button className="btn btn--lg btn--block" onClick={gotIt}>
              Got it
            </button>
          </div>
        </CardBody>
      )}

      {/* ---------- Whose turn, and the one action that reveals ---------- */}
      {flow.phase === "handoff" && (
        <CardBody
          className="bp bp-handoff"
          card={
            <div className="cardstage">
              <article className="card card--dealt" key={flow.round} ref={focalRef} tabIndex={-1}>
                <span className="card__eyebrow">Pass the phone to</span>
                <p className="bp-handoff__name">{reader}</p>
                <p className="card__meta">
                  {reader}: tap the button when nobody else can see the screen. Everyone else, look away
                  until the phone comes back.
                </p>
              </article>
            </div>
          }
        >
          {/* Quiet, above the spectrum controls: the least-wanted thing on
              the screen, and the only way back to the explanation. */}
          <button className="gfoot__skip" onClick={() => act({ type: "howToPlay" })}>
            How to play
          </button>

          {/* BOTH WAYS TO CHANGE THE SPECTRUM, side by side, exactly where
              Same Page and Letter Rip put them. On THIS screen and not the
              Reader's, because the pair is public: the secret in this mode
              is the target, not the spectrum. */}
          <div className="actions--row">
            <button className="btn btn--ghost" onClick={drawRandom}>
              Random
            </button>
            <button className="btn btn--ghost" onClick={() => act({ type: "pickSpectrum" })}>
              Spectrums
            </button>
          </div>

          <div className="actions">
            {/* ONE ACTION. It used to be two — "I'm Sam", then "Flip" — which
                asked the same question twice: are you the right person, and
                is nobody else looking. The card names the person, twice; the
                button says what the tap does, so nobody presses it to find
                out. The name stays off the pill because a sixteen-character
                roster name wraps a --fs-xl label onto two lines. */}
            <button className="btn btn--lg btn--block" onClick={reveal}>
              Reveal my spot
            </button>
          </div>
        </CardBody>
      )}

      {/* ---------- The Reader's screen ---------- */}
      {flow.phase === "reading" && !flow.revealed && (
        <CardBody
          className="bp bp-reading"
          card={
            <div className="cardstage">
              <article className="card card--dealt bp-clue" key="back" ref={focalRef} tabIndex={-1}>
                <span className="card__eyebrow">{reader}'s spot</span>
                <p className="card__meta">Hidden again. Turn it over when nobody else can see.</p>
              </article>
            </div>
          }
        >
          <div className="actions">
            <button className="btn btn--lg btn--block" onClick={reveal}>
              Reveal my spot
            </button>
          </div>
        </CardBody>
      )}

      {flow.phase === "reading" && flow.revealed && (
        <CardBody
          className="bp bp-reading"
          card={
            <div className="cardstage">
              <article className="card card--dealt bp-clue" key="face" ref={focalRef} tabIndex={-1}>
                <span className="card__eyebrow">Your spot</span>
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
                  description={`Your secret spot is ${positionText(target, prompt.left, prompt.right)}.`}
                />
                <p className="card__meta">Say one clue that sits right there. Then hide this and pass the phone.</p>
              </article>
            </div>
          }
        >
          <div className="actions">
            {/* SPECIFIC, NOT "GOOD, NEXT". The tap does two things a Reader
                has to know about — the spot disappears, and the phone is
                going to the table — so the label says both. */}
            <button className="btn btn--lg btn--block" onClick={hideAndPass}>
              Hide spot &amp; pass phone
            </button>
          </div>
        </CardBody>
      )}

      {/* ---------- The table's dial ---------- */}
      {flow.phase === "guessing" && (
        <CardBody
          className="bp bp-guessing"
          card={
            <div className="cardstage">
              <article className="card card--dealt" key={`guess-${flow.round}`} ref={focalRef} tabIndex={-1}>
                <span className="card__eyebrow">Everyone else: where was it?</span>
                <Dial value={flow.guess} onChange={onDial} left={prompt.left} right={prompt.right} />
                <p className="card__meta">
                  {flow.touched
                    ? "Everyone agree? Lock it in."
                    : `Tap or drag the dial to where ${reader}'s clue sits. The middle counts, but tap it.`}
                </p>
              </article>
            </div>
          }
        >
          <div className="actions">
            {/* Disabled until the dial has been TOUCHED, not moved: a tap on
                the middle is a deliberate answer and counts. What is refused
                is the untouched default — a round the group can sit out. */}
            <button className="btn btn--lg btn--block" onClick={lockIn} disabled={!flow.touched}>
              Lock it in
            </button>
          </div>
        </CardBody>
      )}

      {/* ---------- Both needles ---------- */}
      {flow.phase === "reveal" && (
        <CardBody
          className="bp bp-reveal"
          card={
            <div className="cardstage">
              <article className="card card--dealt" key={`reveal-${flow.round}`} ref={focalRef} tabIndex={-1}>
                <span className="card__eyebrow">Results</span>
                <Dial
                  value={flow.locked ?? flow.guess}
                  left={prompt.left}
                  right={prompt.right}
                  target={target}
                  showZones
                  lockedGuess={flow.locked}
                  revealing
                  description={`${gapLine} The spot was ${positionText(target, prompt.left, prompt.right)}. The table said ${positionText(flow.locked ?? flow.guess, prompt.left, prompt.right)}.`}
                />
                {/* THE ZONE NAMES THE RESULT AND THE ANGLE QUALIFIES IT, and
                    the legend says which needle is which in words, so the
                    two are not told apart by colour alone. */}
                <p className="card__meta bp-reveal__gap">{gapLine}</p>
                <p className="bp-legend" aria-hidden="true">
                  <span className="bp-legend__item bp-legend__item--spot">Spot</span>
                  <span className="bp-legend__item bp-legend__item--guess">Your guess</span>
                </p>
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
