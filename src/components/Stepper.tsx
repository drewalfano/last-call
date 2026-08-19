interface StepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  /** What one step means, for the two buttons' labels. */
  noun: string;
}

/**
 * A number you nudge, one at a time.
 *
 * Imposter's player count and the Number Game's table size — the same
 * control, the same range shape, so it lives here rather than twice. The
 * clamp is inside: a caller can pass value + 1 without checking, and the
 * disabled ends are derived from the same two numbers that do the clamping,
 * so the button can never be tappable into a value the stepper would refuse.
 */
export function Stepper({ value, min, max, onChange, noun }: StepperProps) {
  const set = (next: number) => onChange(Math.min(max, Math.max(min, next)));

  return (
    <div className="stepper">
      <button
        className="stepper__step"
        onClick={() => set(value - 1)}
        disabled={value <= min}
        aria-label={`One fewer ${noun}`}
      >
        <StepIcon minus />
      </button>
      <span className="stepper__n">{value}</span>
      <button
        className="stepper__step"
        onClick={() => set(value + 1)}
        disabled={value >= max}
        aria-label={`One more ${noun}`}
      >
        <StepIcon />
      </button>
    </div>
  );
}

/**
 * The stepper's − and +, drawn rather than typed.
 *
 * As text they were centred by their line box, not by their ink, and the
 * display font's ascent and descent overrun a `line-height: 1` box — which
 * dropped the baseline and left the glyph 2px below the middle of its
 * circle. A path has no metrics to fight: it is centred because it is drawn
 * centred. Same reason the back chevron is an svg.
 */
function StepIcon({ minus }: { minus?: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      {!minus && (
        <path d="M12 5v14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      )}
    </svg>
  );
}
