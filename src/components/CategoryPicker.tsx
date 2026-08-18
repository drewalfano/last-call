import { useState } from "react";

interface CategoryPickerProps {
  /** Every category the group can choose from. */
  categories: readonly string[];
  /** Chosen category, or custom text typed by the player. */
  onPick: (category: string) => void;
  /** Leave the picker without choosing. */
  onCancel: () => void;
  /** What a custom entry is called here — "category" or "word". */
  customNoun?: string;
  /** Shown under the custom field when it needs a caveat. */
  customNote?: string;
}

/**
 * Browse-and-choose for the modes built on categories. The fast path is still
 * a single Random tap on the screen before this one; this is the deliberate
 * choice, laid out as cards so a table can scan it together.
 *
 * Custom sits at the top because a group that wants their own inside joke
 * wants it immediately, not after scrolling sixty options.
 */
export function CategoryPicker({
  categories,
  onPick,
  onCancel,
  customNoun = "category",
  customNote,
}: CategoryPickerProps) {
  const [custom, setCustom] = useState("");
  const [writing, setWriting] = useState(false);

  return (
    <div className="picker">
      <div className="picker__scroll">
        {writing ? (
          <form
            className="picker__custom"
            onSubmit={(e) => {
              e.preventDefault();
              const clean = custom.trim();
              if (clean) onPick(clean);
            }}
          >
            <input
              className="text-input"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder={`Your own ${customNoun}`}
              aria-label={`Your own ${customNoun}`}
              maxLength={48}
              autoFocus
            />
            {customNote && <p className="picker__note">{customNote}</p>}
            <div className="actions--row">
              <button type="button" className="btn btn--ghost" onClick={() => setWriting(false)}>
                Back
              </button>
              <button className="btn" type="submit" disabled={!custom.trim()}>
                Use it
              </button>
            </div>
          </form>
        ) : (
          <div className="picker__grid">
            <button className="picker__card picker__card--custom" onClick={() => setWriting(true)}>
              Write your own
            </button>
            {categories.map((c) => (
              <button key={c} className="picker__card" onClick={() => onPick(c)}>
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {!writing && (
        <div className="actions">
          <button className="btn btn--ghost btn--block" onClick={onCancel}>
            Back
          </button>
        </div>
      )}
    </div>
  );
}
