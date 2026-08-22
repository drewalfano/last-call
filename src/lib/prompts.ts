/**
 * PROMPT TEMPLATING
 * ---------------------------------------------------------------
 * Resolves the name tokens a prompt may carry:
 *
 *   {name}   the player the prompt is aimed at
 *   {other}  someone else at the table
 *   {left}   the player to their left
 *
 * This is the single place the "roster is optional" promise is kept. Every
 * token has a generic fallback, so the exact same prompt string reads
 * correctly whether or not anyone entered names — which is why modes don't
 * each need two sets of copy.
 */

export interface PromptContext {
  name?: string;
  other?: string;
  left?: string;
}

const FALLBACK: Required<PromptContext> = {
  name: "whoever's turn it is",
  other: "someone else",
  left: "the person on your left",
};

export function fillPrompt(text: string, ctx: PromptContext = {}): string {
  const filled = text.replace(/\{(name|other|left)\}/g, (_, token: keyof PromptContext) => {
    return ctx[token]?.trim() || FALLBACK[token];
  });
  // Only when the prompt OPENS with a token does the substitution affect the
  // first letter — "{name}, what's…" falling back to a phrase needs lifting.
  // Everything else is left exactly as written, which matters wherever a
  // prompt completes its card's eyebrow rather than standing alone — Most
  // Likely To does, and the retired Drink If deck is written that way too.
  if (!text.startsWith("{")) return filled;
  return filled.charAt(0).toUpperCase() + filled.slice(1);
}

/** True if a prompt depends on knowing who's playing. */
export function needsRoster(text: string): boolean {
  return /\{(name|other|left)\}/.test(text);
}
