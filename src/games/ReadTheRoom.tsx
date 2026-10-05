import { useCallback, useEffect, useRef, useState } from "react";
import { CardBody, GameScreen } from "../components/GameScreen";
import { useDeck } from "../lib/deck";
import { usePool } from "../data/pools";
import { READ_THE_ROOM } from "../data/readTheRoom";
import { fillPrompt } from "../lib/prompts";
import { useContentMode } from "../state/contentMode";
import { useRoster } from "../state/roster";
import { useExitGuard } from "../state/exitGuard";
import { useWhenHidden } from "../lib/useWhenHidden";
import { audio } from "../lib/audio";
import { buzz } from "../lib/useCountdown";
import type { ModeDef } from "../data/modes";
import {
  EMPTY_TALLY,
  MAX_LINE,
  currentDraft,
  initialFlow,
  isLive,
  lineOf,
  nextPair,
  pickJudge,
  reduce,
  settle,
  standings,
  writerAt,
  type Action,
  type Flow,
  type Pair,
  type Slot,
  type Tally,
  type Writer,
} from "./readTheRoomFlow";
import "../styles/readTheRoom.css";

/**
 * READ THE ROOM
 *
 * Two players each write one short line for the same prompt, privately. The
 * phone goes face up, both lines pop in with no names on them, and everyone
 * else argues it out and taps the one they liked. Then the names come out.
 *
 * AN EXPERIMENT, BUILT TO BE CUT. Everything this mode is lives in its own
 * five files; the handful of lines it needed in shared ones are tagged
 * READ_THE_ROOM, and docs/read-the-room-removal.md is the checklist for
 * taking it back out. It is also the one mode not in Home's RING_ORDER: that
 * list is a solved route through the palette, and re-solving it for a mode
 * that might not survive a real night out would be work to undo.
 *
 * THE AUTHORS STAY HIDDEN UNTIL THE TAP. The matchup names both writers —
 * the table knows who is up — but the lines arrive unlabeled and in an order
 * decided by a coin, so a table cannot vote for a friend, and the result is a
 * reveal at every size. That matters most at three, where one person is the
 * entire jury.
 *
 * THIS IS THE ONE MODE THAT TYPES DURING PLAY BESIDES HOT SEAT, and the
 * reason is the same thing that makes it a different game from Ballpark: the
 * line has to survive being passed to someone else unread. Ballpark's clue is
 * said out loud because the table is meant to hear it; here the second writer
 * must not.
 */

/**
 * A SCORE, DELIBERATELY, AND IN ONE PLACE SO IT CAN BE TURNED OFF.
 *
 * The README says to reach for "the app deals, the table decides" before
 * adding anything that keeps score, and every other mode has. This one keeps
 * a light tally as a test of whether a head-to-head wants one: a point to
 * whoever the table picks, shown on the result and nowhere else. Roster
 * only — points need names — and session only: it is component state, so
 * leaving the mode is the reset.
 *
 * `false` leaves a complete mode with no score anywhere on screen. The
 * tally is still kept underneath, because it is the same bookkeeping that
 * decides who writes next.
 */
const SHOW_SCORE = true;

const INTRO_KEY = "lastcall.readTheRoom.intro";

/** How far apart the two lines arrive, and the beat after the second before the table can tap. */
const REVEAL_STEP_MS = 800;
/** The pop's own length (--dur-slow), so the lines are still before they can be pressed. */
const JUDGE_AFTER_MS = 460;

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

function prefersReducedMotion(): boolean {
  return !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Who is writing this round, and who `{other}` names. Dealt together and
 * held, so a name cannot change under a prompt mid-round — the same
 * once-per-card rule fillPrompt's callers keep everywhere else.
 */
interface Deal {
  pair: Pair | null;
  other: string | undefined;
}

function deal(players: readonly string[], named: boolean, tally: Tally): Deal {
  if (!named) return { pair: null, other: undefined };
  const pair = nextPair(players, tally);
  return { pair, other: pickJudge(players, pair) };
}

interface Props {
  mode: ModeDef;
  onBack: () => void;
}

export function ReadTheRoom({ mode, onBack }: Props) {
  const { mode: contentMode } = useContentMode();
  const { players, hasRoster } = useRoster();
  /* One name is not a matchup. Below two, the mode plays exactly as it does
     with no roster at all. */
  const named = hasRoster && players.length >= 2;
  const pool = usePool(READ_THE_ROOM, contentMode, "supplement");
  const deck = useDeck(pool);

  /* The reducer behind a ref, so a second tap in the same frame finds the
     state the first one left — see the note in Ballpark.tsx. */
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

  const [tally, setTally] = useState<Tally>(EMPTY_TALLY);
  const [round, setRound] = useState<Deal>(() => deal(players, named, EMPTY_TALLY));

  const nameOf = (w: Writer): string | null => (round.pair ? round.pair[w === "A" ? 0 : 1] : null);
  const labelOf = (w: Writer): string => nameOf(w) ?? (w === "A" ? "First writer" : "Second writer");
  const nameA = nameOf("A");
  const nameB = nameOf("B");

  const prompt = deck.current ? fillPrompt(deck.current, { other: round.other }) : "";
  const writingNow = flow.phase === "writeA" || flow.phase === "writeB";
  /** Whoever holds the pen, on a writing screen. */
  const writer: Writer = flow.phase === "writeB" ? "B" : "A";
  const draft = currentDraft(flow);

  useExitGuard(isLive(flow.phase));

  /* A half-written line face up in somebody's pocket is a line the next
     writer reads. Visibility turns it over; the draft stays. */
  useWhenHidden(writingNow && !flow.covered, () => act({ type: "hidden" }));

  /**
   * THE REVEAL RUNS ITSELF. Prompt first, then a line, then the other, then
   * the table may tap. Under reduced motion both lines are simply there.
   */
  useEffect(() => {
    if (flow.phase !== "reveal") return;
    if (prefersReducedMotion()) {
      act({ type: "revealAll" });
      return;
    }
    const t = window.setTimeout(
      () => act({ type: "tick" }),
      flow.shown < 2 ? REVEAL_STEP_MS : JUDGE_AFTER_MS,
    );
    return () => window.clearTimeout(t);
  }, [flow.phase, flow.shown, act]);

  /**
   * FOCUS FOLLOWS THE PHASE, as in Ballpark — except on a writing screen,
   * where the thing to land on is the field. `autoFocus` on the input does
   * the same job during the tap that mounted it, which is the only moment
   * iOS will raise the keyboard for a focus it did not see a finger make.
   */
  const focalRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (writingNow && !flow.covered) inputRef.current?.focus({ preventScroll: true });
    else focalRef.current?.focus({ preventScroll: true });
  }, [flow.phase, flow.covered, writingNow]);

  const gotIt = useCallback(() => {
    act({ type: "gotIt" }, () => {
      writeSeenIntro();
      audio.play("advance");
    });
  }, [act]);

  /**
   * A different prompt for the same two writers — the prompt being rejected,
   * not the matchup. Only from the matchup screen: once someone is writing,
   * the prompt is what they are writing to.
   */
  const newPrompt = useCallback(() => {
    if (flowRef.current.phase !== "matchup") return;
    deck.draw();
    setRound((r) => ({ ...r, other: named ? pickJudge(players, r.pair) : undefined }));
  }, [deck, named, players]);

  const start = useCallback(() => {
    act({ type: "start", bFirst: Math.random() < 0.5 });
  }, [act]);

  const done = useCallback(() => {
    const from = flowRef.current.phase;
    /* The first Done passes the phone on; the second is the deal finishing
       and the phone stopping being private — Odd One Out's last Hide role. */
    act({ type: "done" }, () => audio.play(from === "writeA" ? "advance" : "go"));
  }, [act]);

  const decide = useCallback(
    (action: Action) => {
      act(action, () => {
        const w = flowRef.current.winner;
        const pair = round.pair;
        if (pair) {
          const winner = w === "A" ? pair[0] : w === "B" ? pair[1] : null;
          setTally((t) => settle(t, pair, winner));
        }
        if (w === "draw") audio.play("lock");
        else {
          audio.play("match");
          buzz([30, 40, 60]);
        }
      });
    },
    [act, round.pair],
  );

  const nextMatchup = useCallback(() => {
    act({ type: "next" }, () => {
      deck.draw();
      setRound(deal(players, named, tally));
    });
  }, [act, deck, players, named, tally]);

  if (!deck.current) return null;

  const showScore = SHOW_SCORE && named;

  return (
    <GameScreen
      mode={mode}
      /* Who is up, for the whole round. Public from the start: the secret in
         this mode is which line is whose, not who is writing. */
      subtitle={named && nameA && nameB && flow.phase !== "intro" ? `${nameA} vs ${nameB}` : undefined}
      isPrivate={writingNow}
      onBack={onBack}
    >
      {/* ---------- How to play: once per phone ---------- */}
      {flow.phase === "intro" && (
        <CardBody
          card={
            <div className="cardstage">
              <article
                className="card card--dealt rr-intro"
                key="intro"
                ref={focalRef}
                tabIndex={-1}
              >
                <span className="card__eyebrow">How to play</span>
                <ol className="rr-intro__steps">
                  <li>Two players each write one line for the same prompt, in secret.</li>
                  <li>The phone goes face up. Both lines appear, with no names on them.</li>
                  <li>Everyone else argues it out and taps the winner. Then you find out who wrote which.</li>
                </ol>
                <p className="card__meta rr-intro__example">A terrible name for a boat</p>
                <div className="rr-intro__pair" aria-label="Two example lines">
                  <span className="rr-intro__line">Unsinkable II</span>
                  <span className="rr-intro__line">Mostly Floats</span>
                </div>
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

      {/* ---------- The matchup, face up for the table ---------- */}
      {flow.phase === "matchup" && (
        <CardBody
          card={
            <div className="cardstage">
              <article
                className="card card--dealt rr-matchup"
                key={`matchup-${deck.drawCount}`}
                ref={focalRef}
                tabIndex={-1}
              >
                <span className="card__eyebrow">The prompt</span>
                <p className="card__prompt">{prompt}</p>
                <p className="card__meta">
                  {nameA && nameB
                    ? `${nameA} writes first, then ${nameB}. Everyone else judges.`
                    : "Pick two writers. Everyone else judges."}
                </p>
              </article>
            </div>
          }
        >
          {/* Rejecting the prompt, not the matchup — the same quiet control,
              in the same place, as Hot Seat's New question and Most Likely
              To's New card. */}
          <button className="gfoot__skip" onClick={newPrompt}>
            New prompt
          </button>
          <div className="actions">
            <button className="btn btn--lg btn--block" onClick={start}>
              Start writing
            </button>
          </div>
        </CardBody>
      )}

      {/* ---------- A writer's screen ---------- */}
      {writingNow && !flow.covered && (
        <CardBody
          card={
            <div className="cardstage">
              <article
                className="card card--dealt rr-write"
                key={`write-${flow.phase}`}
                ref={focalRef}
                tabIndex={-1}
              >
                <span className="card__eyebrow">
                  {nameOf(writer) ? `${nameOf(writer)}'s line` : labelOf(writer)}
                </span>
                <p className="card__prompt card__prompt--sm">{prompt}</p>
                <form
                  id="rr-line"
                  className="rr-write__form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    done();
                  }}
                >
                  <input
                    ref={inputRef}
                    className="rr-input"
                    value={draft}
                    onChange={(e) => act({ type: "draft", text: e.target.value })}
                    placeholder="Your line"
                    aria-label="Your line"
                    aria-describedby="rr-count"
                    maxLength={MAX_LINE}
                    autoFocus
                    autoComplete="off"
                    autoCapitalize="sentences"
                    enterKeyHint="done"
                  />
                  <span id="rr-count" className="rr-count">
                    {draft.length}/{MAX_LINE}
                  </span>
                </form>
              </article>
            </div>
          }
        >
          <p className="rr-note">Nobody finds out which line is yours until the table picks.</p>
          <div className="actions">
            <button
              className="btn btn--lg btn--block"
              type="submit"
              form="rr-line"
              disabled={!draft.trim()}
            >
              Done
            </button>
          </div>
        </CardBody>
      )}

      {/* ---------- The same screen, turned over while the phone was away ---------- */}
      {writingNow && flow.covered && (
        <CardBody
          card={
            <div className="cardstage">
              <article
                className="card card--dealt"
                key="covered"
                ref={focalRef}
                tabIndex={-1}
              >
                <span className="card__eyebrow">{labelOf(writer)}</span>
                <p className="card__meta">
                  Hidden while the phone was away. Your line is still here. Turn it back over when
                  nobody else can see.
                </p>
              </article>
            </div>
          }
        >
          <div className="actions">
            <button className="btn btn--lg btn--block" onClick={() => act({ type: "uncover" })}>
              Keep writing
            </button>
          </div>
        </CardBody>
      )}

      {/* ---------- The hand-over between the two writers ---------- */}
      {flow.phase === "pass" && (
        <CardBody
          card={
            <div className="cardstage">
              <article
                className="card card--dealt"
                key="pass"
                ref={focalRef}
                tabIndex={-1}
              >
                <span className="card__eyebrow">Pass to</span>
                <p className="rr-name">{nameB ?? "The second writer"}</p>
                <p className="card__meta">
                  {nameA && nameB
                    ? `${nameB}: tap when it's in your hands. ${nameA}'s line is already hidden.`
                    : "Tap when it's in your hands. The first line is already hidden."}
                </p>
              </article>
            </div>
          }
        >
          <div className="actions">
            <button className="btn btn--lg btn--block" onClick={() => act({ type: "taken" })}>
              Start writing
            </button>
          </div>
        </CardBody>
      )}

      {/* ---------- Face up: the reveal, the judging and the result ----------
          One card for all three, keyed by the round, so it turns over once
          when the phone goes face up and then stays put: the lines pop in on
          it, become pressable on it, and are signed on it. */}
      {(flow.phase === "reveal" || flow.phase === "judge" || flow.phase === "result") && (
        <CardBody
          card={
            <div className="cardstage">
              <article
                className="card card--dealt rr-lines"
                key={`lines-${flow.round}`}
                ref={focalRef}
                tabIndex={-1}
              >
                <p className="card__prompt card__prompt--sm">{prompt}</p>
                {([0, 1] as Slot[]).map((slot) => {
                  const w = writerAt(flow, slot);
                  const up = flow.shown > slot;
                  const outcome =
                    flow.winner === null
                      ? undefined
                      : flow.winner === "draw"
                        ? "draw"
                        : flow.winner === w
                          ? "won"
                          : "lost";
                  return (
                    <button
                      key={slot}
                      type="button"
                      className="rr-tile"
                      data-shown={up || undefined}
                      data-outcome={outcome}
                      aria-hidden={!up || undefined}
                      disabled={flow.phase !== "judge"}
                      onClick={() => decide({ type: "pick", slot })}
                    >
                      <span className="rr-tile__line">{lineOf(flow, w)}</span>
                      {flow.phase === "result" && (
                        <span className="rr-tile__by">
                          {labelOf(w)}
                          {outcome === "won" && (showScore ? " · Winner +1" : " · Winner")}
                          {outcome === "draw" && " · Draw"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </article>
            </div>
          }
        >
          {flow.phase === "result" ? (
            <>
              {showScore && (
                <ol className="rr-score" aria-label="Points this session">
                  {standings(players, tally).map(({ name, points }) => (
                    <li key={name}>
                      {name} <b>{points}</b>
                    </li>
                  ))}
                </ol>
              )}
              <div className="actions">
                <button className="btn btn--lg btn--block" onClick={nextMatchup}>
                  Next matchup
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Held in place through the reveal so nothing below the card
                  moves when the table is allowed to tap. */}
              <button
                className="gfoot__skip"
                data-hidden={flow.phase !== "judge" || undefined}
                onClick={() => decide({ type: "draw" })}
              >
                Call it a draw
              </button>
              <div className="actions rr-judge">
                <p className="rr-judge__call">Table, argue it out. Tap the winner.</p>
                <p className="rr-judge__aside">
                  {nameA && nameB
                    ? `${nameA} and ${nameB} don't vote.`
                    : "The writers don't vote."}
                </p>
              </div>
            </>
          )}
        </CardBody>
      )}
    </GameScreen>
  );
}
