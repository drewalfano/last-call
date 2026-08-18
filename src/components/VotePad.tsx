import { useCallback, useMemo, type CSSProperties } from "react";
import { useState } from "react";
import { useRoster } from "../state/roster";

/**
 * THE VOTING MECHANIC
 * ---------------------------------------------------------------
 * Three modes were written as if this existed — Most Likely To's "count down
 * from three, then point", Hot Seat's group questions, Last Call's vote cards
 * — and until now all three showed a sentence and stepped back.
 *
 * One implementation, used by all of them. Renders NOTHING without a roster,
 * which is how those modes keep playing exactly as they did before.
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

/** Grid sizing shared by the vote pad, the picker and the survivor row. */
export function gridStyle(n: number) {
  return { ["--cols" as string]: String(balancedColumns(n)) } as CSSProperties;
}

interface VotePadProps {
  /** Resets the tally when it changes — pass the prompt's deal key. */
  round: string | number;
  /** Copy for the result line, given the winner's name. */
  verdict?: (winner: string) => string;
}

export function VotePad({ round, verdict }: VotePadProps) {
  const { players, hasRoster } = useRoster();
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [roundKey, setRoundKey] = useState(round);
  const [revealed, setRevealed] = useState(false);

  // Reset on a new prompt without an effect — deriving from props during
  // render avoids the extra paint an effect-based reset would cause.
  if (roundKey !== round) {
    setRoundKey(round);
    setVotes({});
    setRevealed(false);
  }

  const cast = useCallback((name: string) => {
    setVotes((prev) => ({ ...prev, [name]: (prev[name] ?? 0) + 1 }));
  }, []);

  const total = useMemo(() => Object.values(votes).reduce((a, b) => a + b, 0), [votes]);

  const leaders = useMemo(() => {
    const top = Math.max(0, ...Object.values(votes));
    if (top === 0) return [];
    return Object.entries(votes)
      .filter(([, n]) => n === top)
      .map(([name]) => name);
  }, [votes]);

  if (!hasRoster) return null;

  return (
    <div className="votepad">
      <div className="votepad__grid" style={gridStyle(players.length)}>
        {players.map((name) => {
          const count = votes[name] ?? 0;
          return (
            <button
              key={name}
              className="votepad__player"
              /* Nothing about the tally shows until the reveal — a filled chip
                 would tell the next person what everyone before them picked,
                 which is the whole thing you're trying to find out. */
              data-voted={(revealed && count > 0) || undefined}
              onClick={() => cast(name)}
              disabled={revealed}
            >
              <span className="votepad__name">{name}</span>
              {revealed && count > 0 && <span className="votepad__count">{count}</span>}
            </button>
          );
        })}
      </div>

      {revealed && leaders.length > 0 ? (
        <p className="votepad__verdict">
          {/* A tie is a real outcome at a table, not an error — say so. */}
          {leaders.length === 1
            ? (verdict ?? defaultVerdict)(leaders[0])
            : `Tied — ${leaders.join(" and ")} both drink.`}
        </p>
      ) : (
        <button
          className="btn btn--ghost btn--block votepad__reveal"
          onClick={() => setRevealed(true)}
          disabled={total === 0}
        >
          {total === 0 ? "Tap a name to vote" : `Reveal (${total})`}
        </button>
      )}
    </div>
  );
}

const defaultVerdict = (winner: string) => `${winner} drinks.`;

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
