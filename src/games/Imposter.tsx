import { useCallback, useMemo, useState } from "react";
import { CardBody, GameScreen } from "../components/GameScreen";
import { randomItem, shuffle } from "../lib/deck";
import { categoryNames, wordsFor } from "../data/imposter";
import { CategoryPicker } from "../components/CategoryPicker";
import { Stepper } from "../components/Stepper";
import { Switch } from "../components/Switch";
import { useContentMode } from "../state/contentMode";
import { useRoster } from "../state/roster";
import { audio } from "../lib/audio";
import type { ModeDef } from "../data/modes";

/**
 * IMPOSTER
 * One phone, one secret word, one player who never sees it.
 *
 * The whole game rests on a single guarantee: a role is only ever on screen
 * for the player it belongs to. Every reveal is bracketed by a neutral cover
 * screen, and the phase machine below can never move from one player's role
 * straight to the next — "role" always returns to "cover".
 *
 * The reveal order is shuffled too. If the phone always went 1, 2, 3… a table
 * could start reading something into who hesitated and when; shuffling makes
 * position tell you nothing.
 */

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 10;

type Phase = "setup" | "picking" | "cover" | "role" | "ready";

interface State {
  phase: Phase;
  count: number;
  word: string;
  /**
   * The nudge dealt alongside the word, shown to the Imposter alone and only
   * when the table asked for one. Empty when a custom word was typed in —
   * see startRound.
   */
  hint: string;
  /** Whether this table plays with hints at all. Set before the deal. */
  showHint: boolean;
  /** Index into the player list, not into the reveal order. */
  imposter: number;
  /** Shuffled player indices — the order the phone goes round. */
  order: number[];
  /** How far through the reveal order we are. */
  at: number;
  /** Chosen word category, or null for "any". */
  category: string | null;
}

interface Props {
  mode: ModeDef;
  onBack: () => void;
}

export function Imposter({ mode, onBack }: Props) {
  const { mode: contentMode } = useContentMode();
  const { players, hasRoster } = useRoster();
  const categories = categoryNames(contentMode);

  const defaultCount = Math.min(
    MAX_PLAYERS,
    Math.max(MIN_PLAYERS, hasRoster ? players.length : 4),
  );

  const [s, setS] = useState<State>({
    phase: "setup",
    count: defaultCount,
    word: "",
    hint: "",
    /* Off. The mode's whole shape is that one player is out in the cold, and
       a table meeting it for the first time should meet that version. A hint
       is the concession you reach for once a group has played enough rounds
       to know how hard going first is — so it is a thing you turn ON, not a
       thing you notice you have been playing with. */
    showHint: false,
    imposter: 0,
    order: [],
    at: 0,
    category: null,
  });

  /**
   * Real names when the table entered them, numbers otherwise — and it
   * degrades per player, so a roster of three in a game of five reads
   * "Drew, Sam, Alex, Player 4, Player 5" rather than falling back wholesale.
   */
  const nameOf = useCallback(
    (i: number) => (hasRoster && players[i] ? players[i] : `Player ${i + 1}`),
    [hasRoster, players],
  );


  const setCount = useCallback((next: number) => {
    setS((prev) => ({ ...prev, count: next }));
  }, []);

  /**
   * Deals: a word, an Imposter, an order, back to the first reveal. Called
   * from Deal roles and from Start over, which are the same act — the second
   * one just happens to be abandoning a deal already in progress. Everything
   * the table chose (the count, the category) is carried through, because
   * neither of those is what went wrong.
   */
  const startRound = useCallback(() => {
    setS((prev) => {
      // A custom entry isn't a category — it IS the word. Otherwise draw from
      // the chosen category, or from everything when none is set.
      const isCustom = prev.category !== null && !categories.includes(prev.category);
      /* A typed word has no hint and cannot be given one: nothing in this app
         knows what "Steve's boat" is about, and a hint invented from the
         string would be either the string again or wrong. So a custom word
         plays the way the mode played before hints existed, switch or no
         switch, and the role card says as much rather than showing an empty
         slot where a nudge should be. */
      const [word, hint] = isCustom
        ? ([prev.category!, ""] as const)
        : randomItem(wordsFor(contentMode, prev.category));
      return {
        ...prev,
        phase: "cover",
        word,
        hint,
        imposter: Math.floor(Math.random() * prev.count),
        order: shuffle(Array.from({ length: prev.count }, (_, i) => i)),
        at: 0,
      };
    });
  }, [contentMode, categories]);

  const playAgain = useCallback(() => {
    setS((prev) => ({ ...prev, phase: "setup" }));
  }, []);

  const currentPlayer = s.order[s.at];
  const isImposter = currentPlayer === s.imposter;

  /**
   * Two things are live here and nothing else is. Which reveal you are on,
   * because the whole game is passing the phone in the right order. And the
   * category on the setup screen — the same thing Last Word and the Number
   * Game put on this line, so it reads the same way in all three.
   *
   * "Set up the round", "Pick a category" and "Clues" each restated the card
   * directly under them, so those screens carry no line at all.
   */
  const label = useMemo(() => {
    if (s.phase === "cover" || s.phase === "role") {
      return `Reveal ${s.at + 1} of ${s.count}`;
    }
    // Named, not bare: on this screen the value is often just "Any", and a
    // lone "ANY" across the header says nothing about what it is answering.
    // Its own row, so the value reads as the answer to the label rather than
    // as the tail of a sentence — see `white-space` on .gheader__now.
    return s.phase === "setup" ? `Category:\n${s.category ?? "Any"}` : undefined;
  }, [s.phase, s.at, s.count, s.category]);

  return (
    /* Which reveal you are on — the whole game is passing the phone in
       the right order, so that one cannot be a caption. */
    /* The picker takes the whole screen: its chevron would leave the round
       entirely and its own Back goes where you actually mean. */
    <GameScreen
      mode={mode}
      subtitle={label}
      hideHeader={s.phase === "picking"}
      /* The one screen in this game nobody else may read. The cover screen
         before it is safe by construction — a name and a warning, nothing
         more — so only the role itself opts out. */
      isPrivate={s.phase === "role"}
      onBack={onBack}
    >
      {/* ---------- Setup ---------- */}
      {s.phase === "setup" && (
        <CardBody
          card={
            <div className="card">
            <span className="card__eyebrow">Players</span>
            <Stepper
              value={s.count}
              min={MIN_PLAYERS}
              max={MAX_PLAYERS}
              onChange={setCount}
              noun="player"
            />
            <p className="card__meta">
              One of you won't get the word.{" "}
              {hasRoster
                ? players.length >= s.count
                  ? "Using your player names."
                  : `Using your ${players.length} names, then numbers.`
                : "Add names on Home to use them here."}
              </p>

            {/* THE ROUND'S ONE OPTION, ON THE CARD THAT SETS THE ROUND UP.

                Under the count and behind a rule, because those are two
                different questions — how many are playing is what this card
                is for, and whether the Imposter gets a nudge is a house rule
                bolted to the bottom of it. The rule is what says so; without
                it the switch read as a third line of the caption above.

                It sat in the footer band for a while, which kept the card at
                the height it had always been and put the option in with the
                buttons that start the round. Wrong shelf: everything in that
                band DOES something, and this decides something. See
                .switch--card for what the card costs it. */}
            <Switch
              className="switch--card"
              checked={s.showHint}
              onChange={(next) => setS((prev) => ({ ...prev, showHint: next }))}
              label="Show Imposter hint"
            />
            </div>
          }
        >
          <div className="actions--row">
            <button
              className="btn btn--ghost"
              onClick={() =>
                setS((prev) => ({ ...prev, category: randomItem(categories) }))
              }
            >
              Random
            </button>
            <button
              className="btn btn--ghost"
              onClick={() => setS((prev) => ({ ...prev, phase: "picking" }))}
            >
              Categories
            </button>
          </div>

          <div className="actions">
            <button className="btn btn--lg btn--block" onClick={startRound}>
              Deal roles
            </button>
          </div>
        </CardBody>
      )}

      {/* ---------- Category picker ---------- */}
      {s.phase === "picking" && (
        <CategoryPicker
          categories={categories}
          customNoun="word"
          customNote="Whoever types this will see it, and can still be dealt the Imposter. Your table, your call."
          onPick={(c) => setS((prev) => ({ ...prev, category: c, phase: "setup" }))}
          onCancel={() => setS((prev) => ({ ...prev, phase: "setup" }))}
        />
      )}

      {/* ---------- Cover screen: nothing secret on it ---------- */}
      {s.phase === "cover" && (
        <CardBody
          card={
            <div className="card">
              <span className="card__eyebrow">Pass the phone to</span>
              <p className="card__prompt">{nameOf(currentPlayer)}</p>
              <p className="card__meta">Don't let anyone else see the screen.</p>
            </div>
          }
        >
          {/* A DEAL CAN GO WRONG HALFWAY THROUGH, and until now the only way
              out was the chevron, which leaves the mode altogether and loses
              the category and the player count with it.

              Two people looking at one screen, someone tapping past their
              word without reading it, the phone going round the table the
              wrong way — none of those can be repaired by carrying on, and
              all of them need the same thing: a different word and a
              different Imposter, dealt again from the top. It throws away the
              reveals already done, which is the point.

              ON THE COVER SCREEN AND NOWHERE ELSE. The role screen is the one
              thing in this app nobody but its owner may see, and a control
              that rerolls who the Imposter is has no business living behind
              that — a player who did not like their role could tap it while
              the phone was face down and nobody would know a round had been
              thrown. Here it is under the neutral screen, in the open,
              between two hands. From a role, Hide it first: the cover is
              where the phone is being passed anyway.

              Quiet, per .gfoot__skip: on almost every deal this is the last
              thing anyone wants. */}
          <button className="gfoot__skip" onClick={startRound}>
            Start over
          </button>
          <div className="actions">
            <button
              className="btn btn--lg btn--block"
              onClick={() => setS((prev) => ({ ...prev, phase: "role" }))}
            >
              View role
            </button>
          </div>
        </CardBody>
      )}

      {/* ---------- The role itself ---------- */}
      {s.phase === "role" && (
        <CardBody
          card={
            <div className={isImposter ? "card imp-card--imposter" : "card"}>
              {isImposter ? (
                <>
                  <span className="card__eyebrow">No word for you</span>
                  <p className="card__prompt">You're the Imposter</p>
                  {/* SHOWN TO THIS PLAYER AND NOBODY ELSE, which is the same
                      guarantee the word next door already has — the screen is
                      face-down between two hands either way, and the cover
                      before it says so.

                      Deliberately not shown to the rest of the table. Knowing
                      what the Imposter was handed tells you what to avoid
                      saying, and a table clueing AROUND the hint puts the
                      Imposter back where they started with an extra job. The
                      nudge only works while it is theirs alone.

                      The rule under it is not decoration. A hint like "Sticky"
                      is a usable turn if you say it, and the round it produces
                      is one player reading a word off a screen while everyone
                      else describes something they know — which the table
                      hears immediately. Barred out loud, in the place it would
                      be broken, rather than left to the group to discover. */}
                  {s.showHint && s.hint ? (
                    <p className="imp-hint">
                      <span className="imp-hint__label">Hint</span>
                      <span className="imp-hint__text">{s.hint}</span>
                      {/* THE RULE AND THE STANDING ADVICE ARE ONE LINE, not
                          two. They are the same sentence to the same reader,
                          and as two muted paragraphs a card's gap apart they
                          read as one anyway — while costing a whole extra
                          element on a card that has 202px to spend at
                          320x568 and already overflows there without a hint
                          in it. Said once, in the panel it belongs to. */}
                      <span className="imp-hint__rule">
                        It isn't the word, and you can't use it as your clue.
                        Listen hard, blend in, don't get caught.
                      </span>
                    </p>
                  ) : (
                    <p className="card__meta imp-card__meta">
                      {s.showHint
                        ? "No hint — someone typed this word in. Listen hard, give a clue that fits, don't get caught."
                        : "Listen hard. Give a clue that fits. Don't get caught."}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <span className="card__eyebrow">The word is</span>
                  <p className="card__prompt">{s.word}</p>
                  <p className="card__meta">One clue each. Don't make it obvious.</p>
                </>
              )}
            </div>
          }
        >
          <div className="actions">
            <button
              className="btn btn--lg btn--block"
              onClick={() => {
                /* Sounded from THIS player's press rather than from arriving
                   at the next cover screen, because the handover is the thing
                   being confirmed and it happens here — a sound that waited
                   for the next screen would be telling the person who has
                   already been handed the phone.

                   The last press is a different event, which is why it gets a
                   different sound rather than none. Nothing is being passed on
                   — the deal is finished and the round starts — so it takes
                   `go`, the same sound the 3 · 2 · 1 lands on elsewhere. This
                   is the one moment in the mode where the phone stops being
                   private and the table starts playing, and it was silent. */
                audio.play(s.at + 1 < s.count ? "advance" : "go");
                setS((prev) => {
                  const next = prev.at + 1;
                  // Always back to a cover screen — never straight to the next
                  // player's role.
                  return next >= prev.count
                    ? { ...prev, phase: "ready" }
                    : { ...prev, phase: "cover", at: next };
                });
              }}
            >
              Hide role
            </button>
          </div>
        </CardBody>
      )}

      {/* ---------- Clues ---------- */}
      {s.phase === "ready" && (
        <CardBody
          card={
            <div className="card">
              <span className="card__eyebrow">Everyone ready?</span>
              <p className="card__prompt card__prompt--sm">
                Go round the group. One clue each about the word.
              </p>
              {/* THE ONE PLACE THE HINT RULE IS ENFORCEABLE.

                  It is printed on the Imposter's own card, where it is about
                  to be broken — but a rule only its breaker has read is not a
                  rule, it is a request. The table set the switch together on
                  the setup screen, so saying a hint exists gives nothing away,
                  and saying it is barred is what lets anyone else call it.

                  On `s.hint`, not on `s.showHint`: a custom word is dealt
                  without one whatever the switch says, and a table told to
                  watch for a hint that was never handed out spends the round
                  waiting for something that is not there. */}
              <p className="card__meta">
                {s.showHint && s.hint
                  ? "Don't make it too obvious. The Imposter has a vague hint " +
                    "they're not allowed to say, and has to blend in on that. " +
                    "Argue it out, point at someone, and let them own up."
                  : "Don't make it too obvious. The Imposter is listening and " +
                    "has to blend in. Argue it out, point at someone, and let " +
                    "the Imposter own up. Everyone but them already knows the word."}
              </p>
            </div>
          }
        >
          <div className="actions">
            {/* The app deals the roles and gets out of the way. It has no
                reveal and keeps no score: everyone except the Imposter knows
                the word, so the table can settle all of it themselves. */}
            <button className="btn btn--lg btn--block" onClick={playAgain}>
              New game
            </button>
          </div>
        </CardBody>
      )}
    </GameScreen>
  );
}
