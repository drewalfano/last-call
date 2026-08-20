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
        {/* The dashes are a stroke, not a border. A CSS `dashed` border cannot
            round its dashes and hands the corners to the browser, which is
            where it visibly gives up — see .roster__prompt-outline. */}
        <svg className="roster__prompt-outline" aria-hidden="true">
          <rect />
        </svg>
        <span className="roster__prompt-label">Who's playing?</span>
        <span className="roster__prompt-hint">Optional — names make it better</span>
      </button>
    );
  }

  return (
    <div className="roster">
      <div className="roster__head">
        <span className="roster__title">Who's playing?</span>
        {/* Rendered always, hidden until there is something to clear —
            `visibility`, so it leaves the tab order and the accessibility
            tree exactly as if it were not here, which is what an
            always-present control that does nothing would otherwise cost.
            The same trick .gfoot__skip uses, for the same reason: what it
            buys is that the row keeps its height, so the label beside it and
            the field under it do not shift when the first name lands. */}
        <button
          className="roster__clear"
          data-hidden={!hasRoster || undefined}
          onClick={() => {
            clear();
            setOpen(false);
          }}
          aria-label="Clear all players"
        >
          Clear
        </button>
      </div>

      {/* THE ROW THAT OPENS.

          Always mounted, and collapsed to nothing by the wrapper rather than
          unmounted, because a row that is not there cannot animate on its way
          in. Adding the first name used to relayout the whole tile in one
          frame: the row appeared at full height, the field jumped 48px down
          the screen and Clear blinked into existence beside a label that had
          just moved. Now the wrapper opens, and everything below it is
          carried down by that one continuous height rather than by a reflow.

          It measures its own contents — see .roster__chipwrap — so it works
          the same for one name as for a set that wraps onto three lines. */}
      <div className="roster__chipwrap" data-open={hasRoster || undefined}>
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
                {/* Drawn, not typed — see StepIcon in games/Imposter.tsx for why
                    a glyph will not sit in the middle of a round well. */}
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M3 3l6 6M9 3l-6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </button>
          ))}
        </div>
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
    </div>
  );
}
