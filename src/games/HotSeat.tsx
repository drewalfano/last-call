import { useCallback, useRef, useState } from "react";
import { CardBody, GameScreen } from "../components/GameScreen";
import { PromptCard } from "../components/PromptCard";
import { useDeck } from "../lib/deck";
import { usePool } from "../data/pools";
import type { ModeDef } from "../data/modes";
import { useContentMode } from "../state/contentMode";
import { HOT_SEAT } from "../data/hotSeat";
import { VotePad, PlayerPicker } from "../components/VotePad";
import { useRoster } from "../state/roster";

/** Questions per hot seat before the phone rotates to someone new. */
const ROUND_LENGTH = 4;

type Phase = "pick" | "playing" | "rotate";

interface Props {
  mode: ModeDef;
  onBack: () => void;
}

export function HotSeat({ mode, onBack }: Props) {
  const { mode: contentMode } = useContentMode();
  const { hasRoster } = useRoster();
  const pool = usePool(HOT_SEAT, contentMode);
  const deck = useDeck(pool);

  const [phase, setPhase] = useState<Phase>("pick");
  const [name, setName] = useState("");
  const [draft, setDraft] = useState("");
  const [asked, setAsked] = useState(0);
  /** Names used this session, offered as one-tap chips so only the first round needs typing. */
  const [roster, setRoster] = useState<string[]>([]);
  const primed = useRef(false);

  // A fresh deck already has a card face-up; only advance on later pulls.
  const pullQuestion = useCallback(() => {
    if (primed.current) deck.draw();
    else primed.current = true;
  }, [deck]);

  const startRound = useCallback(
    (player: string) => {
      const clean = player.trim();
      if (!clean) return;
      setName(clean);
      setRoster((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
      setDraft("");
      setAsked(1);
      pullQuestion();
      setPhase("playing");
    },
    [pullQuestion],
  );

  const advance = useCallback(() => {
    if (asked >= ROUND_LENGTH) {
      setPhase("rotate");
      return;
    }
    pullQuestion();
    setAsked((n) => n + 1);
  }, [asked, pullQuestion]);

  if (phase === "pick") {
    return (
      <GameScreen mode={mode} onBack={onBack}>
        <CardBody
          card={
            <div className="card">
              <span className="card__eyebrow">Hot seat</span>
              <p className="card__prompt card__prompt--sm">
                Pick someone. They can't leave the seat for {ROUND_LENGTH} questions.
              </p>
            </div>
          }
        >
          {/* With a roster this is one tap. Typing is only the fallback for a
              table that never entered names. */}
          {hasRoster ? (
            <PlayerPicker onPick={startRound} />
          ) : (
            <form
              className="actions"
              onSubmit={(e) => {
                e.preventDefault();
                startRound(draft);
              }}
            >
              <input
                className="text-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Their name"
                aria-label="Name of the player in the hot seat"
                maxLength={20}
                autoComplete="off"
                autoCapitalize="words"
              />
              {roster.length > 0 && (
                <div className="chips">
                  {roster.map((n) => (
                    <button type="button" key={n} className="chip" onClick={() => startRound(n)}>
                      {n}
                    </button>
                  ))}
                </div>
              )}
              <button className="btn btn--lg btn--block" type="submit" disabled={!draft.trim()}>
                Put them in
              </button>
            </form>
          )}
        </CardBody>
      </GameScreen>
    );
  }

  if (phase === "rotate") {
    return (
      <GameScreen mode={mode} onBack={onBack}>
        <CardBody
          card={
            <div className="card">
              <span className="card__eyebrow">Seat's free</span>
              <p className="card__prompt">{name} survived.</p>
              <p className="card__meta">Pass the phone. Someone else gets in.</p>
            </div>
          }
        >
          <div className="actions">
            <button className="btn btn--lg btn--block" onClick={() => setPhase("pick")}>
              New hot seat
            </button>
          </div>
        </CardBody>
      </GameScreen>
    );
  }

  const q = deck.current;
  const toGroup = q?.target === "group";

  return (
    /* Whose seat it is — the thing the phone is being handed over for. */
    <GameScreen
      mode={mode}
      subtitle={`${name} · ${asked} of ${ROUND_LENGTH}`}
      onBack={onBack}
    >
      <CardBody
        card={
          <PromptCard
            eyebrow={toGroup ? "Everyone but them answers" : `${name} answers`}
            dealKey={deck.drawCount}
            small
            footer={toGroup ? "Vote out loud, then let them respond." : "No deflecting."}
          >
            {q ? q.text.replaceAll("{name}", name) : "No questions in this deck."}
          </PromptCard>
        }
      >
        {/* Group questions ask the table to vote — now they can. The person
            in the seat is excluded; they're the subject, not a candidate. */}
        {toGroup && <VotePad round={deck.drawCount} verdict={(w) => `${w} said it best.`} />}
        <div className="actions">
          <button className="btn btn--lg btn--block" onClick={advance}>
            {asked >= ROUND_LENGTH ? "End round" : "Next question"}
          </button>
        </div>
      </CardBody>
    </GameScreen>
  );
}
