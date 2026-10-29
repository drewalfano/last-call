import { useSyncExternalStore } from "react";

/**
 * IS THIS A TABLET — FOR THE ONE THING CSS CANNOT DECIDE.
 *
 * Every size and layout difference in the app is a media query, on purpose:
 * see --tablet in tokens.css. This is the exception, and only because what
 * changes is the GESTURE, not the look. A phone reveals a secret with a tap
 * and hands itself over; a tablet propped on a table is held to reveal, so
 * the secret is only up while a hand is on it. Those are different states
 * in the round, and a stylesheet cannot choose between reducers.
 *
 * It is the same query as --tablet, and it is SUBSCRIBED, not read once:
 * Split View and Stage Manager resize the window mid-round, and a value read
 * at mount would go stale exactly the way the note in tokens.css warns about.
 * Change the query in tokens.css and change it here.
 */
const TABLET = "(min-width: 640px) and (min-height: 600px)";

function subscribe(change: () => void): () => void {
  const list = window.matchMedia(TABLET);
  list.addEventListener("change", change);
  return () => list.removeEventListener("change", change);
}

const read = () => window.matchMedia(TABLET).matches;

export function useTablet(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}
