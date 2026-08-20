import type { ModeDef } from "../data/modes";

/**
 * THE WRITING ON A DECK CARD.
 *
 * Its name, the star if it is the namesake, and the one line underneath. Two
 * spans and nothing else — the card itself supplies the colour, the shape and
 * the stroke.
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
      </span>
      <span className="deck-card__tagline">{mode.tagline}</span>
    </>
  );
}
