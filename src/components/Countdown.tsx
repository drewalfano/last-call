import { useEffect, useRef, useState } from "react";
import { buzz } from "../lib/useCountdown";
import { audio } from "../lib/audio";

interface CountdownProps {
  /** The word on the final beat — "POINT", "SAY IT". */
  action: string;
  /** Fires once the action beat has been shown. */
  onDone: () => void;
  /** Beats before the action. Default 3, 2, 1. */
  from?: number;
}

/** How long each numeral holds. Fast enough to feel like a starting gun. */
const BEAT_MS = 700;
/** How long the action word holds before handing back. */
const ACTION_MS = 1100;

/**
 * The 3 · 2 · 1 · GO beat.
 *
 * Shared by Most Likely To and Say the Same Thing, because both need the same
 * thing: a countdown big enough to read from across a table, ending on a word
 * that makes everyone act at the same instant. The synchronised moment is the
 * mechanic in both games — if players act at different times the game doesn't
 * work — so the beat is deliberately large, loud and unskippable.
 *
 * Haptics escalate into the action beat and no-op where unsupported.
 */
export function Countdown({ action, onDone, from = 3 }: CountdownProps) {
  const [n, setN] = useState(from);
  const done = useRef(false);

  useEffect(() => {
    done.current = false;
    setN(from);
    const timers: number[] = [];

    /* The first numeral is already on screen when this mounts, so it gets its
       pip here rather than waiting a beat — otherwise the count is silent on
       "3" and the climb starts halfway up. */
    audio.play("tick", 0);

    for (let i = 1; i <= from; i++) {
      timers.push(
        window.setTimeout(() => {
          setN(from - i);
          buzz(i === from ? [40, 40, 90] : 25);
          /* The last beat is the word, not a number — everyone acts on it, so
             it gets `go` rather than the next pip up. The pips lead into it
             the same way they lead into a clock running out, which is why
             they climb; what lands is what makes the two different. */
          if (i === from) audio.play("go");
          else audio.play("tick", i);
        }, BEAT_MS * i),
      );
    }

    timers.push(
      window.setTimeout(() => {
        if (done.current) return;
        done.current = true;
        onDone();
      }, BEAT_MS * from + ACTION_MS),
    );

    return () => timers.forEach(clearTimeout);
    // Runs once per mount; the parent remounts it with a key to replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showAction = n <= 0;

  return (
    <div className="countdown" role="status" aria-live="assertive">
      <span
        key={showAction ? "action" : n}
        className={showAction ? "countdown__word" : "countdown__n"}
      >
        {showAction ? action : n}
      </span>
    </div>
  );
}
