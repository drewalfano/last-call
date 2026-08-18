interface GameHeaderProps {
  title: string;
  /** Small uppercase line under the title — usually the current sub-state. */
  subtitle?: string;
  /**
   * What the subtitle IS, which decides where it goes and how loudly it reads.
   *
   * "label" is the default and covers the sub-state most screens put there —
   * "New round", "Deal in", "Time", a mode's standing hint. Those name where
   * you are. You read one once and never look again, so it tucks under the
   * mode name and sits back.
   *
   * "content" is live game data a player has to hold on to for the whole
   * round: the category in Last Word, whose turn it is in Ride the Bus and
   * Hot Seat, which reveal you are on in Imposter. That was styled exactly
   * like a state label — 12px, muted, 72% opacity, squeezed beside the back
   * button — which buried the single most important thing on the screen under
   * the name of the mode you already know you are in.
   *
   * So it does not sit beside the title at all. It gets its own line, centred
   * across the full width, at a size you can read from across a table while
   * the phone is being passed to you.
   */
  subtitleTone?: "label" | "content";
  /**
   * A short standing rule that goes with the content line — Last Word's "No
   * repeats". Only meaningful alongside a "content" subtitle: it qualifies
   * what you are playing, so it hangs off that line rather than floating on
   * its own somewhere else on the screen.
   */
  note?: string;
  onBack: () => void;
}

/** Back-to-Home affordance plus the mode's name in its category color. */
export function GameHeader({
  title,
  subtitle,
  subtitleTone = "label",
  note,
  onBack,
}: GameHeaderProps) {
  const isContent = subtitleTone === "content" && !!subtitle;

  return (
    <header className="gheader">
      <div className="gheader__bar">
        <button className="gheader__back" onClick={onBack} aria-label="Back to home">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M15 5l-7 7 7 7"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className="gheader__titles">
          <h1 className="gheader__title">{title}</h1>
          {subtitle && !isContent && <span className="gheader__sub">{subtitle}</span>}
        </div>
      </div>

      {isContent && (
        <div className="gheader__live">
          <p className="gheader__now">{subtitle}</p>
          {note && <p className="gheader__note">{note}</p>}
        </div>
      )}
    </header>
  );
}
