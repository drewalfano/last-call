/**
 * "UP NEXT  SAM" — whose turn the next card is, from the roster's order.
 *
 * A pill in a darker cut of the pack's colour — the deck card's edge recipe —
 * so it reads as part of the field rather than a button on it. It is not
 * pressable; it is the answer to "who's next?" before anyone asks it.
 */
export function UpNext({ name }: { name: string }) {
  return (
    <span className="upnext">
      Up next <b className="upnext__name">{name}</b>
    </span>
  );
}
