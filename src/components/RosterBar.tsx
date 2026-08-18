import { useState } from "react";
import { useRoster } from "../state/roster";

/**
 * Who's playing, on Home. Collapsed to a single line until someone taps it —
 * the app has to stay openable mid-conversation, so setup can never be the
 * first thing you meet.
 *
 * Open, it is a tile with three rows and a rule each row follows:
 *
 *   HEADER   what the tile is, and the one control that acts on all of it
 *   CHIPS    one pill per player, each removing itself
 *   ADD      a field and its button, matched in height
 *
 * The header exists so the tile says what it is once it has expanded — the
 * collapsed state asks "Who's playing?" and the open state used to drop the
 * question entirely, leaving a bare box of pills. It also gives Clear
 * somewhere to live: it was a text link under the field, which is a web
 * convention rather than an app one, and it sat below the tile's last real
 * control where nothing else in the app puts a destructive action.
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
      <div className="roster__head">
        <span className="roster__title">Who's playing?</span>
        {/* Only once there is something to clear. An always-present control
            that does nothing most of the time is furniture, not an action. */}
        {hasRoster && (
          <button
            className="roster__clear"
            onClick={() => {
              clear();
              setOpen(false);
            }}
            aria-label="Clear all players"
          >
            Clear
          </button>
        )}
      </div>

      {/* Rendered only when it has content. An empty flex child still consumes
          the column's gap, which left the collapsed tile 8px heavier at the
          top than the bottom — the field looked off-centre in its own box. */}
      {hasRoster && (
        <div className="roster__chips">
          {players.map((name) => (
            <button
              key={name}
              className="roster__chip"
              onClick={() => remove(name)}
              aria-label={`Remove ${name}`}
            >
              {name}
              <span className="roster__chip-x" aria-hidden="true">
                ×
              </span>
            </button>
          ))}
        </div>
      )}

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
    </div>
  );
}
