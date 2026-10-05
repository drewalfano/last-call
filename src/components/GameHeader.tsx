import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A live line is a string, or — Ballpark's — a spectrum's two ends, which are
 * drawn as the scale they are rather than as one line with a slash in it.
 */
export type LiveLine = string | { left: string; right: string };

interface GameHeaderProps {
  title: string;
  /**
   * THE LIVE LINE — the one piece of game state a player has to hold on to:
   * the category in Last Word, the number and the category being bid on in
   * Overbid, whose turn it is in Ride the Bus, Kings Cup and Rank It, which
   * reveal you are on in Imposter, which attempt in Say the Same Thing,
   * which tier in Last Call.
   *
   * Optional, and most screens do without it. There used to be a second,
   * quieter kind of subtitle for a state LABEL — "New round", "Time", "Set up
   * the round", "Who's up?" — sat beside the back button in 12px muted type.
   * Every one of them restated the card directly underneath it, so the header
   * spent its most legible position saying what the screen already showed,
   * and the genuinely live lines were being styled as though they were the
   * same kind of thing. They are gone; the bar is the mode name now.
   */
  subtitle?: LiveLine;
  /**
   * A short standing rule that goes with the live line — the bid Overbid is
   * asking against, the phase its challenge and result are in. It qualifies
   * what you are playing, so it hangs off that line rather than floating
   * somewhere else on the screen.
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
  /**
   * HOW TO PLAY, AS A ? BESIDE THE X. Only for the modes that teach
   * themselves with an intro card — Ballpark and Read the Room — and only
   * on the screens before a round starts, which each mode decides by
   * passing this or not. Once someone is holding a secret there is nothing
   * to explain, and the corner stays as quiet as every other mode's.
   *
   * It used to be a quiet pill under the card, where it sat on top of the
   * mode's own controls and pushed the footer past its height on an
   * SE-sized phone. Up here it costs the footer nothing.
   */
  onHelp?: () => void;
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

   THE JUMP IS ANIMATED AGAIN NOW, and not here. It is a CSS
   `translate` of the same shape as the entrance — `live-drop` in
   global.css — running from the line's old position to 0.

   Interpolating the layout instead was tried, and cannot work: on the
   round-over screen the header's height is a GRID TRACK, so animating
   its min-height moves a number nothing reads, and the playing screen
   is a flex column, which a grid track cannot interpolate to anyway.
   The layout snaps; only the line is animated.

   That is still not a FLIP, and the difference is the whole reason it
   is safe. A FLIP measures a finished layout and applies a correction
   on top of it, so its frame one is a lie that persists if nothing
   paints. This ends at 0 — the position the line correctly has —
   so a frame that never comes leaves it right, and the distance it
   starts from is worked out by the stylesheet from the same tokens
   that lay the header out. See `live-drop` in global.css.
   --------------------------------------------------------------- */

/**
 * A spectrum end on two lines, ALWAYS, broken at the word boundary that
 * leaves the two halves closest in length — "Sad / lunch", "Insignificant /
 * cultural event". Even when it would fit on one: ends that wrap only when
 * they run out of room come out one line on the left and two on the right,
 * and the pair stops looking like a matched set. A single word stays one.
 */
function twoLines(end: string): string[] {
  const words = end.split(" ");
  if (words.length < 2) return [end];
  let best = 1;
  let bestGap = Infinity;
  for (let i = 1; i < words.length; i++) {
    const gap = Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length);
    if (gap < bestGap) {
      bestGap = gap;
      best = i;
    }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

/**
 * Whether a pair's widest lines, side by side, outrun the phone's width at the
 * live line's size. Counted in characters, because the face is the app's own
 * and its average width is steady enough for a threshold: 24 is where a 375pt
 * phone runs out, and of the sixty pairs only "Insignificant cultural event /
 * Significant cultural event" is over it. That one steps down a size rather
 * than breaking onto a third line.
 */
function isLongPair(left: string, right: string): boolean {
  const widest = (end: string) => Math.max(...twoLines(end).map((part) => part.length));
  return widest(left) + widest(right) > 24;
}

/**
 * How long a departing live line is kept on screen. Short: the screen under it
 * has already changed, so this is a line leaving, not a beat being held.
 */
const LEAVE_MS = 160;

/** Back-to-Home affordance, the mode's name, and the live line under both. */
export function GameHeader({ title, subtitle, note, aside, onHelp, onBack }: GameHeaderProps) {
  /**
   * THE LINE LEAVES AS WELL AS ARRIVES.
   *
   * `subtitle` going undefined used to take the line off screen between two
   * frames. Every mode that hands the category back — Letter Rip returning to
   * its intro from a finished round is the one you see most — lost it with a
   * cut while everything around it moved.
   *
   * So the last line is held for a moment and animated out. What matters is
   * that the HOLD is a timeout and not an animation event: a timeout fires
   * whether or not anything painted, so a stalled animation costs the exit and
   * nothing else. Waiting on `animationend` would leave the OLD category on a
   * screen already showing a new one, which is the failure this file's FLIP
   * note is about — and worse here, because a line that lies is worse than a
   * line that jumps.
   */
  const [leaving, setLeaving] = useState<LiveLine | null>(null);
  const last = useRef(subtitle);

  useEffect(() => {
    const previous = last.current;
    last.current = subtitle;
    if (subtitle !== undefined || previous === undefined) return;
    setLeaving(previous);
    const t = window.setTimeout(() => setLeaving(null), LEAVE_MS);
    return () => window.clearTimeout(t);
  }, [subtitle]);

  const line = subtitle ?? leaving;

  return (
    <header className="gheader">
      <div className="gheader__bar">
        <h1 className="gheader__title">{title}</h1>

        {/* The same well as the X, so the two read as a pair of corner
            controls; see .gheader__help for the one rule that differs. */}
        {onHelp && (
          <button className="gheader__back gheader__help" onClick={onHelp} aria-label="How to play">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M9.1 9.1a2.95 2.95 0 0 1 5.75.95c0 1.95-2.85 2.75-2.85 2.75"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M12 17.25h.01" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
            </svg>
          </button>
        )}

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

      {line && (
        <div className="gheader__live" data-leaving={subtitle === undefined || undefined}>
          {typeof line === "string" ? (
            <p className="gheader__now">{line}</p>
          ) : (
            /* THE SPECTRUM AS A SCALE: a line with a dot at each end and each
               end's name under its own dot, left-aligned and right-aligned.
               "Old / New" in one centred line read as a title, and a long
               pair wrapped into a block where you had to hunt for the slash
               to see where one end stopped. Two columns keep each end on its
               own side however long it is, and the line is the dial the
               table is about to turn. */
            <p className="gheader__spectrum" aria-label={`${line.left} to ${line.right}`}>
              <span className="gheader__spectrum-line" aria-hidden="true" />
              <span
                className="gheader__spectrum-ends"
                data-long={isLongPair(line.left, line.right) || undefined}
                aria-hidden="true"
              >
                {[line.left, line.right].map((end, i) => (
                  <span key={i}>
                    {twoLines(end).map((part, j) => (
                      <span key={j} className="gheader__spectrum-part">
                        {part}
                      </span>
                    ))}
                  </span>
                ))}
              </span>
            </p>
          )}
          {note && <p className="gheader__note">{note}</p>}
          {aside && <div className="gheader__aside">{aside}</div>}
        </div>
      )}
    </header>
  );
}
