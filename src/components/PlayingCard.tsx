import type { Card } from "../lib/cards";

interface Props {
  card: Card | null;
  /** Face-down slot for cards not yet revealed. */
  placeholder?: boolean;
  small?: boolean;
}

export function PlayingCard({ card, placeholder, small }: Props) {
  if (!card || placeholder) {
    return <div key="back" className={cx("pcard pcard--back", small)} aria-label="Face-down card" />;
  }
  return (
    <div
      /* Keyed by the card itself so React remounts on every new one. Without
         this the element persists across draws and the CSS flip — which only
         runs on mount — never replays. */
      key={`${card.rank}-${card.suit}`}
      className={cx("pcard", small)}
      data-red={card.red || undefined}
      aria-label={`${card.label} of ${card.suit}`}
    >
      <span className="pcard__corner">{card.label}</span>
      <span className="pcard__pip">{card.symbol}</span>
      <span className="pcard__corner pcard__corner--flip">{card.label}</span>
    </div>
  );
}

function cx(base: string, small?: boolean) {
  return small ? `${base} pcard--sm` : base;
}
