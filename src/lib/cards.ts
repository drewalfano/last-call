import { shuffle } from "./deck";

export type Suit = "spades" | "hearts" | "diamonds" | "clubs";

export interface Card {
  /** 2–14, where 11–14 are J, Q, K, A. Aces are always high. */
  rank: number;
  label: string;
  suit: Suit;
  symbol: string;
  red: boolean;
}

export const SUITS: { suit: Suit; symbol: string; red: boolean }[] = [
  { suit: "spades", symbol: "♠", red: false },
  { suit: "hearts", symbol: "♥", red: true },
  { suit: "diamonds", symbol: "♦", red: true },
  { suit: "clubs", symbol: "♣", red: false },
];

const LABELS: Record<number, string> = { 11: "J", 12: "Q", 13: "K", 14: "A" };

/** What a rank is called on the face of a card. */
export function rankLabel(rank: number): string {
  return LABELS[rank] ?? String(rank);
}

/** A real, complete 52-card deck, shuffled. */
export function freshDeck(): Card[] {
  const cards: Card[] = [];
  for (const { suit, symbol, red } of SUITS) {
    for (let rank = 2; rank <= 14; rank++) {
      cards.push({ rank, label: rankLabel(rank), suit, symbol, red });
    }
  }
  return shuffle(cards);
}

/**
 * Deal one card. If the shoe is empty it reshuffles a new deck, which only
 * ever comes up on a very long stint on the bus.
 */
export function deal(deck: Card[]): { card: Card; rest: Card[] } {
  const shoe = deck.length > 0 ? deck : freshDeck();
  return { card: shoe[0], rest: shoe.slice(1) };
}
