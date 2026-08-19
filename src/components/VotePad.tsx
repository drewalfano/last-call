import { type CSSProperties } from "react";
import { useRoster } from "../state/roster";

/**
 * PICKING A PLAYER.
 *
 * This file used to hold a voting mechanic too: a pad of tappable names with
 * a reveal and a running tally, dealt by Last Call's vote cards and Hot Seat's
 * group questions. Both are gone. A table votes by pointing at someone, and
 * asking it to queue up at a phone and tap instead was slower than the thing
 * it replaced, on the two card kinds with the least to decide. Those prompts
 * now say how they settle and leave the settling to the room.
 *
 * What's left is choosing ONE person, which the app does need to hold: Kings
 * Cup's 2 and 8, Hot Seat's subject. Renders nothing without a roster.
 */

/**
 * Columns that divide the players into even rows — no lone name stranded on
 * a row of its own. Prefers the fewest rows, then the narrowest grid, and
 * rejects any split that would leave a remainder of exactly one.
 */
export function balancedColumns(n: number): number {
  if (n <= 3) return Math.max(1, n);
  const options = [2, 3, 4].map((cols) => ({ cols, rows: Math.ceil(n / cols) }));
  const fewest = Math.min(...options.map((o) => o.rows));
  const tidy = options.filter((o) => o.rows === fewest && n % o.cols !== 1);
  const pick = (tidy.length ? tidy : options.filter((o) => o.rows === fewest))[0];
  return pick.cols;
}

/** Grid sizing shared by the player chips, the picker and the survivor row. */
export function gridStyle(n: number) {
  return { ["--cols" as string]: String(balancedColumns(n)) } as CSSProperties;
}

interface PlayerPickerProps {
  /** Called with the chosen name. */
  onPick: (name: string) => void;
  /** Optionally hide one player — "pick someone else". */
  exclude?: string;
  selected?: string;
}

/** "Choose one person" — Kings Cup's 2 and 8, Hot Seat's subject. */
export function PlayerPicker({ onPick, exclude, selected }: PlayerPickerProps) {
  const { players, hasRoster } = useRoster();
  if (!hasRoster) return null;

  const choices = players.filter((p) => p !== exclude);
  if (choices.length === 0) return null;

  return (
    <div className="votepad__grid" style={gridStyle(choices.length)}>
      {choices.map((name) => (
        <button
          key={name}
          className="votepad__player"
          data-voted={name === selected || undefined}
          onClick={() => onPick(name)}
        >
          <span className="votepad__name">{name}</span>
        </button>
      ))}
    </div>
  );
}
