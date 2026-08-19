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

/* ---------------------------------------------------------------
   NO FLIP ON THE LIVE LINE. IT MOVES WHERE IT MOVES.

   Last Word's board takes an auto header and its round-over card
   takes the reserved one, so ending a round drops the category ~60px
   down the screen. That jump used to be animated: remember where the
   line was, and once the browser had put it somewhere new, run a
   WAAPI `translate` from the old position to the new one. Textbook
   FLIP, and correct on paper — the layout is right the whole time and
   only the paint lags.

   It cost the category. An animation's clock is the document's, and a
   surface that defers painting doesn't have one running, so the
   animation didn't play slowly — it stopped on frame one and stayed.
   Frame one of a FLIP is the element at its OLD position: the
   category 60px down the screen, behind the letter grid, for the
   whole round, on the one screen where it's the only thing a player
   has to hold in their head. Skipping it while `document.hidden` was
   not enough — a surface can be painting late without ever saying it
   is hidden.

   The lesson is narrower than "don't use FLIP": don't put the thing a
   player cannot play without inside an effect that has to RUN to end
   up correct. The entrance the line does keep is a CSS `translate`
   that starts 10px high and never touches opacity — stall it at frame
   one and the worst case is a category 10px off, still legible. See
   `live-in` in global.css.
   --------------------------------------------------------------- */

/** Back-to-Home affordance, the mode's name, and the live line under both. */
export function GameHeader({ title, subtitle, note, aside, onBack }: GameHeaderProps) {
  return (
    <header className="gheader">
      <div className="gheader__bar">
        <h1 className="gheader__title">{title}</h1>

        {/* An X, not a chevron. Opening a mode is a presentation, not a push:
            App expands the tapped card's colour over the whole screen, and
            leaving unmounts the game and ends the round. There is no previous
            page to go back to — you are closing something. A chevron promised
            a step backwards and delivered a dismiss, which is also why it was
            so easy to hit by reflex and lose a round to. */}
        <button className="gheader__back" onClick={onBack} aria-label="Close game">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
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
