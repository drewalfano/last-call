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
  /**
   * Drop the header entirely and give the screen over to its content.
   *
   * For the category picker, which is a full page of choices reached from
   * inside a round. It has a Back of its own, at the bottom, that returns to
   * the round — but the header's chevron sits above it going somewhere quite
   * different, all the way out to Home, abandoning the round on the way. Two
   * backs on one screen, the more obvious-looking one being the destructive
   * one. So the picker gets no header, no chevron, and one way out.
   */
  hideHeader?: boolean;
  /**
   * This screen holds something ONE person is meant to read.
   *
   * Imposter's role and Rank It's private pass, and nothing else in the
   * app — every other screen is read aloud or shows public state. On a
   * tablet the whole point of the type ramp is that the table reads the
   * card together, which on these two is the failure mode rather than the
   * feature. Keeps the phone's prompt size and column width inside the
   * tablet's slot. See .screen--private in global.css.
   *
   * `isPrivate`, not `private`, because `private` is a reserved word in
   * strict mode and every module here is one.
   */
  isPrivate?: boolean;
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
  hideHeader,
  isPrivate,
  onBack,
  children,
}: GameScreenProps) {
  return (
    <div
      className={isPrivate ? "screen screen--private" : "screen"}
      style={categoryStyle(mode.color)}
    >
      {!hideHeader && (
        <GameHeader
          title={mode.title}
          subtitle={subtitle}
          note={note}
          aside={aside}
          onBack={onBack}
        />
      )}
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
