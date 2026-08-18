import { useCallback, useState } from "react";
import { useRoster } from "../state/roster";
import { gridStyle } from "./VotePad";

/**
 * Small per-mode mechanics that hang under a prompt card via DeckGame's
 * `afterCard` slot. Kept together because they share one job: turning a deck
 * that only printed sentences into something the table actually resolves.
 */

interface SplitVoteProps {
  a: string;
  b: string;
  /** Resets the split on a new card. */
  round: string | number;
}

/**
 * WOULD YOU RATHER — the split is the whole game, and until now the app
 * never asked. Deliberately roster-free: it's counting hands, so it works
 * for a table that never entered names.
 */
export function SplitVote({ a, b, round }: SplitVoteProps) {
  const [votes, setVotes] = useState<[number, number]>([0, 0]);
  const [roundKey, setRoundKey] = useState(round);
  const [revealed, setRevealed] = useState(false);

  if (roundKey !== round) {
    setRoundKey(round);
    setVotes([0, 0]);
    setRevealed(false);
  }

  const total = votes[0] + votes[1];
  const minority = votes[0] === votes[1] ? null : votes[0] < votes[1] ? a : b;

  return (
    <div className="split">
      <div className="split__halves">
        <button
          className="split__half"
          onClick={() => setVotes(([x, y]) => [x + 1, y])}
          aria-label={`Vote for: ${a}`}
        >
          <span className="split__count">{votes[0]}</span>
          <span className="split__label">{a}</span>
        </button>
        <button
          className="split__half"
          onClick={() => setVotes(([x, y]) => [x, y + 1])}
          aria-label={`Vote for: ${b}`}
        >
          <span className="split__count">{votes[1]}</span>
          <span className="split__label">{b}</span>
        </button>
      </div>

      {revealed ? (
        <p className="split__verdict">
          {minority === null
            ? "Dead even. Everyone drinks."
            : `Minority drinks — whoever said "${minority}".`}
        </p>
      ) : (
        <button
          className="btn btn--ghost btn--block split__reveal"
          onClick={() => setRevealed(true)}
          disabled={total === 0}
        >
          {total === 0 ? "Tap your pick" : `Settle it (${total})`}
        </button>
      )}
    </div>
  );
}

/**
 * DRINK IF — an optional last-one-standing layer. Fingers stay physical;
 * the app only remembers who's out, which is the part a drunk table loses
 * track of. State deliberately survives across cards: elimination runs for
 * the whole session, not one prompt.
 */
export function SurvivorTracker() {
  const { players, hasRoster } = useRoster();
  const [out, setOut] = useState<string[]>([]);

  const knockOut = useCallback((name: string) => {
    setOut((prev) => (prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]));
  }, []);

  if (!hasRoster) return null;

  const standing = players.filter((p) => !out.includes(p));

  return (
    <div className="survivor">
      <div className="survivor__row" style={gridStyle(players.length)}>
        {players.map((name) => (
          <button
            key={name}
            className="survivor__player"
            data-out={out.includes(name) || undefined}
            onClick={() => knockOut(name)}
          >
            {name}
          </button>
        ))}
      </div>
      {standing.length === 1 && players.length > 1 && (
        <p className="survivor__verdict">{standing[0]} is the last one standing.</p>
      )}
      {out.length > 0 && standing.length !== 1 && (
        <button className="survivor__reset" onClick={() => setOut([])}>
          Everyone back in
        </button>
      )}
    </div>
  );
}
