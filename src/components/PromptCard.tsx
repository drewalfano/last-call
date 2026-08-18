import type { ReactNode } from "react";

interface PromptCardProps {
  /** Small uppercase line above the prompt, e.g. "DRINK IF…". */
  eyebrow?: string;
  /** Changing this key flips the card over to reveal the next one. */
  dealKey: string | number;
  small?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * The focal card every prompt-based mode centers its screen on.
 *
 * One card, and it turns over to reveal the next — the same flip the playing
 * cards use in Ride the Bus and Kings Cup. Nothing behind it, no
 * exit animation: remounting on `dealKey` replays the flip.
 */
export function PromptCard({ eyebrow, dealKey, small, children, footer }: PromptCardProps) {
  return (
    <div className="cardstage">
      <article className="card card--dealt" key={dealKey}>
        {eyebrow && <span className="card__eyebrow">{eyebrow}</span>}
        <p className={small ? "card__prompt card__prompt--sm" : "card__prompt"}>{children}</p>
        {footer && <div className="card__meta">{footer}</div>}
      </article>
    </div>
  );
}
