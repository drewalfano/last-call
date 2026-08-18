import type { ReactNode } from "react";

interface GameHeaderProps {
  title: string;
  /**
   * THE LIVE LINE — the one piece of game state a player has to hold on to:
   * the category in Last Word and the Number Game, whose turn it is in Ride
   * the Bus, Kings Cup and Rank It, which reveal you are on in Imposter,
   * which attempt in Say the Same Thing, which tier in Last Call.
   *
   * Optional, and most screens do without it. There used to be a second,
   * quieter kind of subtitle for a state LABEL — "New round", "Time", "Set up
   * the round", "Who's up?" — sat beside the back button in 12px muted type.
   * Every one of them restated the card directly underneath it, so the header
   * spent its most legible position saying what the screen already showed,
   * and the genuinely live lines were being styled as though they were the
   * same kind of thing. They are gone; the bar is the mode name now.
   */
  subtitle?: string;
  /**
   * A short standing rule that goes with the live line — the Number Game's
   * phase. It qualifies what you are playing, so it hangs off that line
   * rather than floating somewhere else on the screen.
   */
  note?: string;
  /**
   * A status strip that belongs under the live line — Kings Cup's kings and
   * cards left, Ride the Bus's drinks and streak.
   *
   * It sits in the header rather than at the top of the game's own column
   * because that is where it reads: it describes the round, not the card. It
   * hangs 20px below the live line WITHOUT being part of what centres, so
   * adding it cannot push the live line off the position every other mode
   * shares. See .gheader__aside.
   */
  aside?: ReactNode;
  onBack: () => void;
}

/** Back-to-Home affordance, the mode's name, and the live line under both. */
export function GameHeader({ title, subtitle, note, aside, onBack }: GameHeaderProps) {
  return (
    <header className="gheader">
      <div className="gheader__bar">
        <button className="gheader__back" onClick={onBack} aria-label="Back to home">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M15 5l-7 7 7 7"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="gheader__title">{title}</h1>
      </div>

      {subtitle && (
        <div className="gheader__live">
          <p className="gheader__now">{subtitle}</p>
          {note && <p className="gheader__note">{note}</p>}
          {aside && <div className="gheader__aside">{aside}</div>}
        </div>
      )}
    </header>
  );
}
