/**
 * THE ROUND'S ONE SETTING, AS ONE CONTROL.
 *
 * A pill with the setting's name stacked over its value and a chevron, so it
 * says what is set and that tapping changes it — a setting, not the action,
 * which is why it is drawn in the quiet outline and never filled.
 *
 * With `onShuffle`, a round button rides beside it that deals a new one in one
 * tap. That pair replaces the two equal ghost buttons the category modes used
 * to have — "Random" and "Spectrums" — which read as two choices of the same
 * kind, said nothing about what was set, and left tables unsure which one
 * picked a spectrum.
 */
interface ChoicePillProps {
  /**
   * The setting's name, stacked over the value: "Category" over "Mixed". Left
   * out when the value is an action rather than an answer — "Change
   * spectrum" on one line, because the screen already shows what is set and
   * "Spectrum" over "Change" read as a sentence broken in two.
   */
  label?: string;
  /** What is set, or the action when the screen already shows what is set. */
  value: string;
  onOpen: () => void;
  /** Spoken name for the pill — the visible text is a label and a value. */
  ariaLabel: string;
  /** Deal a new one without opening the list. */
  onShuffle?: () => void;
  shuffleLabel?: string;
  className?: string;
}

export function ChoicePill({
  label,
  value,
  onOpen,
  ariaLabel,
  onShuffle,
  shuffleLabel,
  className,
}: ChoicePillProps) {
  const pill = (
    <button
      className={["choice", onShuffle ? undefined : className].filter(Boolean).join(" ")}
      onClick={onOpen}
      aria-label={ariaLabel}
    >
      <span className="choice__text">
        {label && <span className="choice__label">{label}</span>}
        <span className="choice__value">{value}</span>
      </span>
      <svg className="choice__chev" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  );

  if (!onShuffle) return pill;

  return (
    <div className={["choice-row", className].filter(Boolean).join(" ")}>
      {pill}
      <button className="choice-shuffle" onClick={onShuffle} aria-label={shuffleLabel}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" />
          <path d="m18 2 4 4-4 4" />
          <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2" />
          <path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8" />
          <path d="m18 14 4 4-4 4" />
        </svg>
      </button>
    </div>
  );
}
