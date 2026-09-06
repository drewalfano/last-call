import { MODES, type ModeDef, type Pace, type PlayerRange } from "../data/modes";
import type { ContentMode } from "../state/contentMode";

/**
 * WHICH GAMES FIT THE TABLE IN FRONT OF THE PHONE.
 * ---------------------------------------------------------------
 * Two facts about a group are knowable without asking anyone anything: how
 * many names are on the roster, if there is one, and which content level is
 * set. This is the one place they are turned into "can this table play that
 * game", so Home's cue lines, the summary under Pick a game for me, and the
 * pick itself all agree.
 *
 * A group with no roster has no size. Nothing here asks for one — the app
 * has to stay openable mid-conversation, and a size guess would be wrong at
 * exactly the tables that skipped the roster. Unknown means "do not filter
 * on it", which is what the deck already did.
 *
 * Drinking games are a content question, not a size one. Mild says the table
 * plays sober, and Kings Cup's rules ARE drink instructions, so at Mild the
 * picker will not hand one over. The cards stay on the deck at every level:
 * a table that wants one can still tap it, and the cue line says what it is.
 */
export interface Group {
  /** Roster size, or undefined when nobody has entered names. */
  size?: number;
  content: ContentMode;
}

export type Misfit = "too-few" | "too-many" | "drinking";

export function misfit(mode: ModeDef, group: Group): Misfit | null {
  if (group.content === "safe" && mode.drinking) return "drinking";
  if (group.size !== undefined) {
    if (group.size < mode.players.min) return "too-few";
    if (mode.players.max !== undefined && group.size > mode.players.max) return "too-many";
  }
  return null;
}

export function fits(mode: ModeDef, group: Group): boolean {
  return misfit(mode, group) === null;
}

export function fitting(group: Group, modes: readonly ModeDef[] = MODES): ModeDef[] {
  return modes.filter((m) => fits(m, group));
}

/** One short clause per reason, for the card and the picker's explanation. */
export function whyNot(mode: ModeDef, why: Misfit): string {
  switch (why) {
    case "too-few":
      return `needs ${mode.players.min} or more`;
    case "too-many":
      return `plays up to ${mode.players.max}`;
    case "drinking":
      return "a drinking game";
  }
}

export interface Pick {
  pick: ModeDef | null;
  pool: ModeDef[];
  excluded: { mode: ModeDef; why: Misfit }[];
}

/**
 * The random pick, with its working shown. `rng` is injectable so a test can
 * pin the draw; Home passes nothing and gets Math.random.
 */
export function pickForGroup(
  group: Group,
  rng: () => number = Math.random,
  modes: readonly ModeDef[] = MODES,
): Pick {
  const pool: ModeDef[] = [];
  const excluded: Pick["excluded"] = [];
  for (const mode of modes) {
    const why = misfit(mode, group);
    if (why) excluded.push({ mode, why });
    else pool.push(mode);
  }
  const pick = pool.length ? pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))] : null;
  return { pick, pool, excluded };
}

/** "3–10 players", "2+ players". The en dash is the range's, not a hyphen. */
export function playersLabel(range: PlayerRange): string {
  return range.max === undefined
    ? `${range.min}+ players`
    : `${range.min}–${range.max} players`;
}

/** "~2 min a round", "~20 min a game". Always approximate, and it says so. */
export function paceLabel(pace: Pace): string {
  return `~${pace.minutes} min a ${pace.per}`;
}

/**
 * The line under Pick a game for me. It has to say what the pick is drawing
 * from without pretending to know more than it does: with no roster the size
 * is unknown, so only the content level can narrow the deck.
 */
export function fitSummary(group: Group, modes: readonly ModeDef[] = MODES): string {
  const n = fitting(group, modes).length;
  const total = modes.length;
  const who = group.size === undefined ? "" : ` for ${group.size}`;
  if (n === total) return `All ${total} games fit${who}.`;
  if (n === 0) return `Nothing fits${who} at this level.`;
  return `${n} of ${total} games fit${who}.`;
}

/**
 * What to do when nothing fits. Names the cheapest change rather than
 * shrugging: a table of two at Mild can add a name or raise the level, and
 * which one helps is knowable from the same two facts.
 */
export function noFitAdvice(group: Group, modes: readonly ModeDef[] = MODES): string {
  const { excluded } = pickForGroup(group, () => 0, modes);
  const smallest = Math.min(...modes.map((m) => m.players.min));
  if (group.size !== undefined && group.size < smallest) {
    return `Add names on the roster: the smallest game takes ${smallest}.`;
  }
  const drinkOnly = excluded.every((e) => e.why === "drinking");
  if (drinkOnly) return "Mild skips drinking games. Change the level to include them.";
  return "Add names or change the content level, or pick a card yourself.";
}
