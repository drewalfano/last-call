import type { ModeDef } from "../data/modes";
import { playersCount, playersLabel } from "../lib/fit";

/**
 * THE WRITING ON A DECK CARD.
 *
 * Its name, the star if it is the namesake, how many it plays with, and the
 * one line underneath. Nothing else — the card itself supplies the colour,
 * the shape and the stroke.
 *
 * It is a component rather than markup inside Home because it is rendered
 * twice: once by the deck, and once by the overlay that closes a mode back
 * into that deck, which carries the card's own writing so the two can be the
 * same thing at the moment one replaces the other. Written out in both places
 * they would drift the first time a tagline or a weight changed, and the
 * failure would be invisible until someone closed that particular mode.
 *
 * The classes stay `deck-card__*` because the styling belongs to the card and
 * both users want exactly it. See .launch__face for the overlay's copy.
 */
export function DeckFace({ mode }: { mode: ModeDef }) {
  return (
    <>
      <span className="deck-card__title">
        {mode.title}
        {mode.signature && (
          <span className="deck-card__star" aria-label="the namesake mode">
            ★
          </span>
        )}
        {/* WHO IT PLAYS WITH, in the corner. The cue line that used to run
            under the tagline carried this, the pace and a tag, and the pace
            and the tag were the parts nobody used — so the count moved up
            beside the name and the line went. It rides in the title row so
            the peek keeps its two lines of writing, and so the overlay copy
            in App carries it for free. */}
        <span className="deck-card__players" aria-label={playersLabel(mode.players)}>
          <span aria-hidden="true">{playersCount(mode.players)}</span>
          {/* Two people, the nearer one larger. Drawn in icons/players.svg
              and copied here verbatim; the colour comes from the card, the
              stroke widths from the drawing — see that folder's README. The
              viewBox is the drawing's own extent, strokes included, rather
              than the artboard's, which cuts the outer strokes off. */}
          <svg viewBox="-6.4 11.7 257.8 180.3" aria-hidden="true">
            <path strokeWidth="17.8" d="M2.5,170.2c0-10.7,5.8-22.5,15.5-31.5,11.3-10.5,26.7-16.2,43.5-16.2,0,0,14.6,0,21.9,3.4" />
            <path strokeWidth="17.8" d="M85.3,64.9c0,14.9-10.7,24.4-23.7,24.4s-23.7-9.6-23.7-24.2,10.6-23.6,23.7-23.6,23.7,9,23.7,23.4Z" />
            <path strokeWidth="17.4" d="M132.8,55.1c0-21,16-34.7,34.4-34.7s34.5,13.3,34.5,34.5-15.9,35.5-34.5,35.5-34.4-14-34.4-35.4Z" />
            <path strokeWidth="17.8" d="M242.5,170.9c0,8-5,12.2-19.1,12.2h-112.4c-14.1,0-19.1-4.1-19.1-12.2,0-23.7,28.9-54.1,75.3-54.1s75.4,30.4,75.4,54.1Z" />
          </svg>
        </span>
      </span>
      <span className="deck-card__tagline">{mode.tagline}</span>
    </>
  );
}
