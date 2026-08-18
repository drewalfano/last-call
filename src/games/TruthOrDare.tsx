import { useCallback, useMemo, useRef, useState } from "react";
import { GameHeader } from "../components/GameHeader";
import { PromptCard } from "../components/PromptCard";
import { useDeck } from "../lib/deck";
import { categoryStyle } from "../lib/style";
import { usePool } from "../data/pools";
import type { ModeDef } from "../data/modes";
import { useContentMode } from "../state/contentMode";
import { DARES, TRUTHS } from "../data/truthOrDare";
import { useRoster } from "../state/roster";
import { fillPrompt } from "../lib/prompts";

type Lane = "truth" | "dare";

interface Props {
  mode: ModeDef;
  onBack: () => void;
}

/**
 * Two big choices up front, then a card from that lane.
 * Both lanes keep their own no-repeat deck for the whole session, so
 * bouncing between Truth and Dare never re-deals a card you've had.
 */
export function TruthOrDare({ mode, onBack }: Props) {
  const { mode: contentMode } = useContentMode();
  const { currentPlayer, otherPlayer, advance, hasRoster } = useRoster();
  const [chickened, setChickened] = useState(false);
  const truthPool = usePool(TRUTHS, contentMode);
  const darePool = usePool(DARES, contentMode);
  const truthDeck = useDeck(truthPool);
  const dareDeck = useDeck(darePool);

  const [lane, setLane] = useState<Lane | null>(null);
  // A fresh deck already has a card face-up, so the first visit to a lane
  // shows it as-is and only later visits advance.
  const opened = useRef<Record<Lane, boolean>>({ truth: false, dare: false });

  const deck = lane === "dare" ? dareDeck : truthDeck;

  // Names resolve once per card so a dare can single someone out by name.
  const fill = useMemo(() => {
    const ctx = { name: currentPlayer, other: otherPlayer() };
    return (text: string) => fillPrompt(text, ctx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer, deck.drawCount, lane]);

  const choose = useCallback(
    (next: Lane) => {
      const target = next === "dare" ? dareDeck : truthDeck;
      if (opened.current[next]) target.draw();
      else opened.current[next] = true;
      setChickened(false);
      setLane(next);
    },
    [dareDeck, truthDeck],
  );

  if (lane === null) {
    return (
      <div className="screen" style={categoryStyle(mode.color)}>
        <GameHeader
          title={mode.title}
          subtitle={hasRoster ? `${currentPlayer}, commit before you see it` : "Commit before you see the card"}
          onBack={onBack}
        />
        <div className="focal tod-picker">
          <button className="tod-choice" onClick={() => choose("truth")}>
            <span className="tod-choice__label">Truth</span>
            <span className="tod-choice__sub">Answer it honestly</span>
          </button>
          <button className="tod-choice tod-choice--alt" onClick={() => choose("dare")}>
            <span className="tod-choice__label">Dare</span>
            <span className="tod-choice__sub">Do it or drink</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen" style={categoryStyle(mode.color)}>
      <GameHeader
        title={mode.title}
        subtitle={hasRoster ? `${currentPlayer} · ${lane}` : lane === "truth" ? "Truth" : "Dare"}
        onBack={onBack}
      />
      <div className="focal">
        <PromptCard
          eyebrow={lane === "truth" ? "Truth" : "Dare"}
          dealKey={`${lane}-${deck.drawCount}`}
        >
          {deck.current ? fill(deck.current) : "No cards in this deck."}
        </PromptCard>
        {chickened && (
          <p className="tod-chicken">
            {hasRoster ? `${currentPlayer} chickened out.` : "Chickened out."} Drink, and pass it on.
          </p>
        )}
        <p className="counter">
          {deck.position} of {deck.total}
          {deck.cycle > 0 && " · reshuffled"}
        </p>
        <div className="actions">
          {/* Two ways out that aren't just "next": refusing costs a drink, and
              staying in the lane lets one person keep going, which the brief
              asked for. Side by side so three actions don't eat the screen. */}
          <div className="actions--row">
            <button
              className="btn btn--ghost"
              onClick={() => setChickened(true)}
              disabled={chickened}
            >
              Chicken
            </button>
            <button className="btn btn--ghost" onClick={() => choose(lane)}>
              Another {lane}
            </button>
          </div>
          <button
            className="btn btn--lg btn--block"
            onClick={() => {
              advance();
              setLane(null);
            }}
          >
            Pass the phone
          </button>
        </div>
      </div>
    </div>
  );
}
