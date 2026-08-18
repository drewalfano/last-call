import { useCallback, useState } from "react";
import { useRoster } from "../state/roster";
import { gridStyle } from "./VotePad";

/**
 * Small per-mode mechanics that hang under a prompt card via DeckGame's
 * `afterCard` slot. Kept together because they share one job: turning a deck
 * that only printed sentences into something the table actually resolves.
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
