interface GameHeaderProps {
  title: string;
  /** Small uppercase line under the title — usually the current sub-state. */
  subtitle?: string;
  onBack: () => void;
}

/** Back-to-Home affordance plus the mode's name in its category color. */
export function GameHeader({ title, subtitle, onBack }: GameHeaderProps) {
  return (
    <header className="gheader">
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
        {subtitle && <span className="gheader__sub">{subtitle}</span>}
      </div>
    </header>
  );
}
