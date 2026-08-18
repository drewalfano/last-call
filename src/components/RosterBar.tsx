import { useState } from "react";
import { useRoster } from "../state/roster";

/**
 * Who's playing, on Home. Collapsed to a single line until someone taps it —
 * the app has to stay openable mid-conversation, so setup can never be the
 * first thing you meet.
 */
export function RosterBar() {
  const { players, hasRoster, add, remove, clear } = useRoster();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  if (!open && !hasRoster) {
    return (
      <button className="roster__prompt" onClick={() => setOpen(true)}>
        <span className="roster__prompt-label">Who's playing?</span>
        <span className="roster__prompt-hint">Optional — names make it better</span>
      </button>
    );
  }

  return (
    <div className="roster">
      <div className="roster__chips">
        {players.map((name) => (
          <button
            key={name}
            className="roster__chip"
            onClick={() => remove(name)}
            aria-label={`Remove ${name}`}
          >
            {name}
            <span aria-hidden="true">×</span>
          </button>
        ))}
      </div>

      <form
        className="roster__add"
        onSubmit={(e) => {
          e.preventDefault();
          add(draft);
          setDraft("");
        }}
      >
        <input
          className="roster__input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a name"
          aria-label="Add a player"
          maxLength={16}
          autoComplete="off"
          autoCapitalize="words"
        />
        <button className="roster__go" type="submit" disabled={!draft.trim()}>
          Add
        </button>
      </form>

      {hasRoster && (
        <button
          className="roster__clear"
          onClick={() => {
            clear();
            setOpen(false);
          }}
        >
          Clear players
        </button>
      )}
    </div>
  );
}
