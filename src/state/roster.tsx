import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * THE ROSTER
 * ---------------------------------------------------------------
 * Who's at the table. Deliberately OPTIONAL: the app opens mid-conversation
 * at a bar, so nothing may block on setup. Every mode must play without a
 * roster exactly as it did before this existed.
 *
 * What a roster buys, when there is one:
 *   - prompts can name a real person instead of "the person on your left"
 *   - voting becomes a tally instead of a suggestion
 *   - turn order can actually move the phone around
 *
 * Persisted, unlike game state: a refresh mid-party shouldn't cost you the
 * table. `clear()` is the way out.
 */

const KEY = "lastcall.players";
const MAX_PLAYERS = 16;
const MAX_NAME = 16;

/** localStorage can throw in private mode / embedded webviews. Never let it break the party. */
function readPlayers(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((n): n is string => typeof n === "string")
      .map((n) => n.trim())
      .filter(Boolean)
      .slice(0, MAX_PLAYERS);
  } catch {
    return [];
  }
}

function writePlayers(players: string[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(players));
  } catch {
    /* storage unavailable — the roster still works for this session */
  }
}

interface RosterValue {
  players: string[];
  /** The one gate every caller should branch on. */
  hasRoster: boolean;
  /** Whose turn it is, or undefined with no roster. */
  currentPlayer: string | undefined;
  /** Move the phone one seat along. */
  advance: () => void;
  /** Anyone but the current player — for "pick someone else" prompts. */
  otherPlayer: () => string | undefined;
  add: (name: string) => void;
  remove: (name: string) => void;
  clear: () => void;
}

const RosterContext = createContext<RosterValue | null>(null);

export function RosterProvider({ children }: { children: ReactNode }) {
  const [players, setPlayers] = useState<string[]>(readPlayers);
  const [turn, setTurn] = useState(0);
  // Read by advance() so it doesn't have to nest a setState inside another
  // updater — which double-fires under StrictMode and skips a player.
  const playersRef = useRef(players);
  playersRef.current = players;

  useEffect(() => {
    writePlayers(players);
  }, [players]);

  const add = useCallback((name: string) => {
    const clean = name.trim().slice(0, MAX_NAME);
    if (!clean) return;
    setPlayers((prev) => {
      // Case-insensitive: "Sam" and "sam" are the same person at a table.
      if (prev.length >= MAX_PLAYERS) return prev;
      if (prev.some((p) => p.toLowerCase() === clean.toLowerCase())) return prev;
      return [...prev, clean];
    });
  }, []);

  const remove = useCallback((name: string) => {
    setPlayers((prev) => {
      const next = prev.filter((p) => p !== name);
      // Keep the turn pointer inside the list as it shrinks.
      setTurn((t) => (next.length === 0 ? 0 : t % next.length));
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setPlayers([]);
    setTurn(0);
  }, []);

  const advance = useCallback(() => {
    const count = playersRef.current.length;
    if (count > 0) setTurn((t) => (t + 1) % count);
  }, []);

  const currentPlayer = players.length > 0 ? players[turn % players.length] : undefined;

  const otherPlayer = useCallback(() => {
    if (players.length === 0) return undefined;
    if (players.length === 1) return players[0];
    const others = players.filter((p) => p !== currentPlayer);
    return others[Math.floor(Math.random() * others.length)];
  }, [players, currentPlayer]);

  const value = useMemo<RosterValue>(
    () => ({
      players,
      hasRoster: players.length > 0,
      currentPlayer,
      advance,
      otherPlayer,
      add,
      remove,
      clear,
    }),
    [players, currentPlayer, advance, otherPlayer, add, remove, clear],
  );

  return <RosterContext.Provider value={value}>{children}</RosterContext.Provider>;
}

export function useRoster(): RosterValue {
  const ctx = useContext(RosterContext);
  if (!ctx) throw new Error("useRoster must be used inside <RosterProvider>");
  return ctx;
}
