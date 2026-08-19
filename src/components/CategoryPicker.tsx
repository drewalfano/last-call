import { useState } from "react";
import { fadeOnScroll } from "../lib/scrollFade";

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
        <>
          {/* Fixed furniture, ABOVE the scroller rather than the first cell in
              it. It is an action, not one of the options — and inside the
              scroller its top edge was the first thing the scroll mask faded,
              so the button arrived on screen already clipped. */}
          {/* First card dealt, so the deal starts at the top of the screen and
              runs down into the grid rather than skipping this one. */}
          <button
            className="picker__card picker__card--custom"
            style={{ ["--i" as string]: 0 }}
            onClick={() => setWriting(true)}
          >
            Write your own
          </button>

          <div className="picker__scroll" onScroll={fadeOnScroll}>
            <div className="picker__grid">
              {categories.map((c, i) => (
                <button
                  key={c}
                  className="picker__card"
                  /* Stops counting at 8 — past that the delay is being spent
                     on cards below the fold. See .picker__card in games.css. */
                  style={{ ["--i" as string]: Math.min(i + 1, 8) }}
                  onClick={() => onPick(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Depth under the floating button: blur only, no scrim. It sits
              BELOW the button in the stack, so it softens the cards passing
              behind without touching the control itself — which is what went
              wrong with a full band over the whole strip. */}
          <div className="picker__depth" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>

          <div className="actions">
            <button className="btn btn--float btn--block" onClick={onCancel}>
              Back
            </button>
          </div>
        </>
      )}
    </div>
  );
}
