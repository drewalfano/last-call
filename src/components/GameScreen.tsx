import type { ReactNode } from "react";
import type { ModeDef } from "../data/modes";
import { categoryStyle } from "../lib/style";
import { GameHeader } from "./GameHeader";

interface GameScreenProps {
  mode: ModeDef;
  /** The live line, its standing rule, and the status strip under them. */
  subtitle?: string;
  note?: string;
  aside?: ReactNode;
  onBack: () => void;
  children: ReactNode;
}

/**
 * THE SHELL EVERY MODE IS BUILT ON.
 *
 * Three rows, and two of them are constants: a reserved header, the card
 * slot, and the footer band. That is the whole idea. The card used to be
 * centred in whatever vertical space the header and the footer left over,
 * which meant it sat somewhere different on every screen — Imposter's setup
 * put it 79px lower than its own reveal screen, because the setup screen has
 * a shorter header and a taller footer. Same game, same card, three
 * positions in one flow.
 *
 * Now the header reserves its tallest variant and the card gets a rectangle
 * of its own, so nothing above or below it can move it. See --gheader-h,
 * --gfooter-h and --card-size in tokens.css for the measured numbers.
 *
 * The mode owns everything under the header, because several modes render
 * one header over several phases.
 */
export function GameScreen({
  mode,
  subtitle,
  note,
  aside,
  onBack,
  children,
}: GameScreenProps) {
  return (
    <div className="screen" style={categoryStyle(mode.color)}>
      <GameHeader
        title={mode.title}
        subtitle={subtitle}
        note={note}
        aside={aside}
        onBack={onBack}
      />
      {children}
    </div>
  );
}

interface CardBodyProps {
  /** The focal card. Fills the fixed slot; may be any height inside it. */
  card: ReactNode;
  /** Everything below the card — counters, mechanics, the actions. */
  children?: ReactNode;
  /** Extra class on the focal element, for a mode with its own rules. */
  className?: string;
}

/**
 * A screen whose focal element is a card: slot on top, footer band below.
 *
 * Use this and the card cannot move. A screen with no card — a letter grid,
 * a felt, a list — renders a plain `.focal` instead and centres by its own
 * rules; there is nothing on it that has to hold still between screens.
 */
export function CardBody({ card, children, className }: CardBodyProps) {
  return (
    <div className={className ? `focal focal--slot ${className}` : "focal focal--slot"}>
      <div className="slot">{card}</div>
      <div className="gfoot">{children}</div>
    </div>
  );
}
