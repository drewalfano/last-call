import type { ReactNode } from "react";
import type { ModeDef } from "../data/modes";
import { categoryStyle } from "../lib/style";
import { GameHeader, type LiveLine } from "./GameHeader";

interface GameScreenProps {
  mode: ModeDef;
  /** The live line, its standing rule, and the status strip under them. */
  subtitle?: LiveLine;
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
  /** A ? beside the X that reopens the mode's intro. See GameHeader. */
  onHelp?: () => void;
  /**
   * Which landscape composition the screen takes on a board: the card beside
   * a rail, a full-width board over a row of choices, or a private handoff.
   * Pair it with the matching body below. Nothing changes off a board.
   */
  layout?: "prompt" | "board" | "secret";
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
  onHelp,
  layout,
  onBack,
  children,
}: GameScreenProps) {
  return (
    <div
      className={isPrivate ? "screen screen--private" : "screen"}
      data-layout={layout}
      style={categoryStyle(mode.color)}
    >
      {!hideHeader && (
        <GameHeader
          title={mode.title}
          subtitle={subtitle}
          note={note}
          aside={aside}
          onHelp={onHelp}
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

/* ---------------------------------------------------------------
   THE THREE LANDSCAPE BODIES.

   Each one is laid out by `.screen[data-layout]` in board.css under
   --board, and is a plain column everywhere else. They hold no game
   state and know nothing about the modes; Round 3 fills them.
   --------------------------------------------------------------- */

interface PromptBodyProps {
  /** The card, as for CardBody. Square on a board, to the full height. */
  card: ReactNode;
  /** The rail's top: the live line, its meta, an Up next chip. */
  rail?: ReactNode;
  /** The rail's foot: secondary controls, then the primary action last. */
  children?: ReactNode;
}

/** The card on the left, a 360px rail on the right. */
export function PromptBody({ card, rail, children }: PromptBodyProps) {
  return (
    <div className="focal focal--slot focal--prompt">
      <div className="slot">{card}</div>
      <div className="gfoot">
        {rail && <div className="rail">{rail}</div>}
        {children}
      </div>
    </div>
  );
}

interface BoardBodyProps {
  /** What the table is looking at: the cards, the dial, the letter board. */
  stage: ReactNode;
  /** One line under the stage, e.g. what a wrong guess costs. */
  rule?: ReactNode;
  /** The choices, in a Choices row. Always the bottom of the screen. */
  choices?: ReactNode;
}

/** Content across the width, choices in one row along the bottom. */
export function BoardBody({ stage, rule, choices }: BoardBodyProps) {
  return (
    <div className="focal focal--board">
      <div className="board__stage">{stage}</div>
      {rule && <p className="board__rule">{rule}</p>}
      {choices}
    </div>
  );
}

interface SecretBodyProps {
  /** Across the top: the seat strip on a handoff, the grey caps while held. */
  top?: ReactNode;
  /** The name on a handoff; the role card while held. */
  children: ReactNode;
  /** The hold button, beside the main content and centred on it. */
  side?: ReactNode;
  /** Along the bottom: Start over, the pass-it hint, who is next. */
  foot?: ReactNode;
  /**
   * The role is face up. The screen goes dark whatever the pack, and the
   * card and the held button sit side by side in the middle, so the hand on
   * the button never covers the card.
   */
  holding?: boolean;
}

/** The handoff and the private hold. */
export function SecretBody({ top, children, side, foot, holding }: SecretBodyProps) {
  return (
    <div className="focal secret" data-holding={holding || undefined}>
      {top && <div className="secret__top">{top}</div>}
      <div className="secret__main">{children}</div>
      {side && <div className="secret__side">{side}</div>}
      {foot && <div className="secret__foot">{foot}</div>}
    </div>
  );
}
