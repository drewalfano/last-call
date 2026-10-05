import { useState } from "react";
import { fadeOnScroll } from "../lib/scrollFade";
import { audio } from "../lib/audio";

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
  /**
   * Whether the group can write their own.
   *
   * Off for Rank It, where an entry is not a word but a title AND the four or
   * five things being ranked — more than anyone is typing at a bar, and a
   * half-filled one would break the round rather than personalise it.
   */
  allowCustom?: boolean;
  /**
   * A line that finishes on every card, so the cards do not each repeat it.
   *
   * Rank It's forty prompts all open "Rank these…", which is forty copies of
   * the same three words competing with the part that differs. Said once, at
   * the top, and the cards carry only what changes.
   */
  heading?: string;
  /**
   * A pinned first choice meaning "no category": Odd One Out's Any, which
   * deals from everything and changes with every round. Named here rather
   * than smuggled into `categories` so picking it can mean null to the
   * caller instead of a string it has to recognise.
   */
  anyLabel?: string;
  onAny?: () => void;
}

/**
 * Browse-and-choose for the modes built on categories. The fast path is still
 * a single Random tap on the screen before this one; this is the deliberate
 * choice, laid out as cards so a table can scan it together.
 *
 * Any and Write your own lead the grid because a group that wants either
 * wants it immediately, not after scrolling sixty options.
 */
export function CategoryPicker({
  categories,
  onPick,
  onCancel,
  customNoun = "category",
  customNote,
  allowCustom = true,
  heading,
  anyLabel,
  onAny,
}: CategoryPickerProps) {
  const [custom, setCustom] = useState("");
  const [writing, setWriting] = useState(false);
  /** How many of the grid's first cards are Any / Write your own. */
  const pinned = (anyLabel && onAny ? 1 : 0) + (allowCustom ? 1 : 0);

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
          {heading && <p className="picker__heading">{heading}</p>}

          <div className="picker__scroll" onScroll={fadeOnScroll}>
            <div className="picker__grid">
              {/* THE TWO WAYS NOT TO PICK FROM THE LIST, as the first cards
                  in it. Same size and shape as a category, set apart by
                  being drawn in outline on the pack's colour rather than
                  printed on white, with an icon for what they do. They used
                  to be two full-width white slabs above the grid: the same
                  stock as the options in a different shape, which read as
                  two oddly stretched categories rather than as a different
                  kind of thing. */}
              {anyLabel && onAny && (
                <button
                  className="picker__card picker__card--pinned"
                  style={{ ["--i" as string]: 0 }}
                  onClick={onAny}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" />
                    <path d="m18 2 4 4-4 4" />
                    <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2" />
                    <path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8" />
                    <path d="m18 14 4 4-4 4" />
                  </svg>
                  {anyLabel}
                </button>
              )}
              {allowCustom && (
                <button
                  className="picker__card picker__card--pinned"
                  style={{ ["--i" as string]: pinned - 1 }}
                  onClick={() => setWriting(true)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z" />
                    <path d="m15 5 4 4" />
                  </svg>
                  Write your own
                </button>
              )}
              {categories.map((c, i) => (
                <button
                  key={c}
                  className="picker__card"
                  /* Stops counting at 8 — past that the delay is being spent
                     on cards below the fold. See .picker__card in games.css. */
                  style={{ ["--i" as string]: Math.min(i + pinned, 8) }}
                  onPointerDown={() => audio.play("tap")}
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
