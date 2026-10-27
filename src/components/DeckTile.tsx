import type { ModeDef } from "../data/modes";
import { categoryStyle } from "../lib/style";
import { DeckFace } from "./DeckFace";

/**
 * ONE GAME ON THE HOME GRID.
 *
 * The deck's card, dealt flat. Same face — DeckFace, so the title, the star,
 * the player count and the tagline are the card's own and cannot drift — in
 * the same pack colour with the same edge recipe. What changes is only that
 * it no longer overlaps a neighbour, so all four corners are rounded and the
 * tagline has the whole tile rather than a peek.
 */
export function DeckTile({ mode, onOpen }: { mode: ModeDef; onOpen: (el: HTMLElement) => void }) {
  return (
    <button
      type="button"
      className="deck-tile"
      style={categoryStyle(mode.color)}
      onClick={(e) => onOpen(e.currentTarget)}
    >
      <DeckFace mode={mode} />
    </button>
  );
}
