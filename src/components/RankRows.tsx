import { useLayoutEffect, useRef, useState } from "react";
import { audio } from "../lib/audio";
import { move, shiftFor, slotFor, stepKey } from "../lib/dragOrder";

/** How far a press travels before it is a drag rather than a tap. RosterBar's figure. */
const DRAG_SLOP = 6;

interface RankRowsProps {
  /** The order on screen. */
  items: string[];
  /** Called once, when a drag is dropped or an arrow key moves a row. */
  onReorder?: (next: string[]) => void;
  /**
   * The reveal: the same rows, in the ranker's order, each marked against the
   * guess. Rows do not move in this state.
   */
  guess?: string[];
  /**
   * A drag or a focus held still, for the lab, which has to show the states a
   * hand produces without a hand. Never passed by a game.
   */
  still?: { drag?: { index: number; dy: number }; focus?: number };
}

interface Drag {
  index: number;
  id: number;
  y: number;
  dy: number;
  live: boolean;
}

/** Rank It deals five to seven items, so the teens never come up. */
const ordinal = (n: number) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;

/**
 * RANK IT'S LIST, ORDERED BY DRAGGING.
 *
 * Five rows of one height in every phase, so the list never moves between
 * ranking, guessing and the reveal — only what the rows say changes.
 *
 * The press, slop and capture are RosterBar's chip drag, and the reasoning
 * there holds: the row owns the gesture, so a swipe that starts on a row
 * moves the row. The difference is that these rows are one height in one
 * column, so where a row lands is how many rows it has travelled — see
 * lib/dragOrder — and the rows it passes shift by exactly one step rather
 * than reflowing and being measured back.
 *
 * Told once, on the drop. The order the table sees moving is held here until
 * the finger lifts.
 */
export function RankRows({ items, onReorder, guess, still }: RankRowsProps) {
  const [drag, setDrag] = useState<Drag | null>(null);
  /**
   * THE DROP LANDS WHERE THE FINGER LEFT IT. Reordering moves every row to its
   * new slot in the DOM, and a row still carrying a translate from before the
   * move would be offset from the WRONG slot: the dropped one flew past its
   * place, out of the card, and slid back, and the rows it had pushed aside
   * jumped a step and returned. So every row is measured where it is on
   * screen the moment the finger lifts — the dropped one under the finger,
   * the others wherever their slide aside has got to — and for one frame each
   * is drawn exactly there, as an offset from its new slot, with nothing
   * animating. The frame after, they all glide home from where they were.
   */
  const [landing, setLanding] = useState<{ item: string; offsets: Record<string, number> } | null>(null);
  // The row gliding home after the landing frame, kept on top until it is.
  const [settling, setSettling] = useState<string | null>(null);
  useLayoutEffect(() => {
    if (!landing) return;
    const frame = requestAnimationFrame(() => {
      setSettling(landing.item);
      setLanding(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [landing]);
  useLayoutEffect(() => {
    if (!settling) return;
    const done = window.setTimeout(() => setSettling(null), 320);
    return () => window.clearTimeout(done);
  }, [settling]);
  const [said, setSaid] = useState("");
  const listRef = useRef<HTMLOListElement>(null);

  /* One row plus the gap. Every row is one height, so this one number is the
     whole geometry; kept current as the list resizes, which it does on a
     rotate mid-round. */
  const [step, setStep] = useState(0);
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const read = () => {
      const [a, b] = list.children as unknown as HTMLElement[];
      setStep(a && b ? b.offsetTop - a.offsetTop : 0);
    };
    read();
    const watch = new ResizeObserver(read);
    watch.observe(list);
    return () => watch.disconnect();
  }, [guess]);

  const shown = drag ?? (still?.drag ? { ...still.drag, id: -1, y: 0, live: true } : null);
  const to = shown ? slotFor(shown.index, shown.dy, step, items.length) : -1;

  if (guess) {
    return (
      <ol className="rank-rows" data-reveal ref={listRef}>
        {items.map((item, i) => {
          const had = guess.indexOf(item);
          const hit = had === i;
          return (
            <li key={item} className="rank-rows__row" data-hit={hit || undefined}>
              <span className="rank__pos">{i + 1}</span>
              <span className="rank-rows__label">{item}</span>
              {hit ? (
                <span className="rank-rows__tick" aria-label="You matched it">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                </span>
              ) : (
                <span className="rank-rows__had">you had it {ordinal(had + 1)}</span>
              )}
            </li>
          );
        })}
      </ol>
    );
  }

  const drop = () => {
    if (!drag) return;
    setDrag(null);
    if (!drag.live) return;
    const at = slotFor(drag.index, drag.dy, step, items.length);
    const next = move(items, drag.index, at);
    const list = listRef.current;
    const slot0 = (list?.children[0] as HTMLElement | undefined)?.getBoundingClientRect().top ?? 0;
    const offsets: Record<string, number> = {};
    list?.querySelectorAll<HTMLElement>(".rank-rows__row").forEach((row, i) => {
      offsets[items[i]] = row.getBoundingClientRect().top - (slot0 + next.indexOf(items[i]) * step);
    });
    setLanding({ item: items[drag.index], offsets });
    if (at !== drag.index) {
      onReorder?.(next);
      audio.play("tap");
    }
  };

  return (
    <>
      <ol className="rank-rows" ref={listRef} data-landing={landing ? "" : undefined}>
        {items.map((item, i) => {
          const lifted = shown?.live && shown.index === i;
          const shift = shown?.live ? shiftFor(i, shown.index, to) : 0;
          const y = lifted ? shown.dy : landing ? (landing.offsets[item] ?? 0) : shift * step;
          return (
            <li key={item} className="rank-rows__slot">
              <button
                type="button"
                className="rank-rows__row"
                data-lifted={lifted || undefined}
                data-landed={landing?.item === item || settling === item || undefined}
                data-focus={still?.focus === i || undefined}
                style={y ? { translate: `0 ${y}px` } : undefined}
                aria-label={`${item}, ${i + 1} of ${items.length}`}
                aria-roledescription="sortable"
                onPointerDown={(e) =>
                  setDrag({ index: i, id: e.pointerId, y: e.clientY, dy: 0, live: false })
                }
                onPointerMove={(e) => {
                  if (!drag || e.pointerId !== drag.id) return;
                  const dy = e.clientY - drag.y;
                  if (!drag.live) {
                    if (Math.abs(dy) < DRAG_SLOP) return;
                    e.currentTarget.setPointerCapture(drag.id);
                  }
                  setDrag({ ...drag, dy, live: true });
                }}
                onPointerUp={drop}
                onPointerCancel={() => setDrag(null)}
                onKeyDown={(e) => {
                  const next = stepKey(e.key, i, items.length);
                  if (next === null) return;
                  e.preventDefault();
                  onReorder?.(move(items, i, next));
                  setSaid(`${item}, ${next + 1} of ${items.length}`);
                  // The row moves under the focus; follow it.
                  requestAnimationFrame(() =>
                    listRef.current?.querySelectorAll<HTMLButtonElement>(".rank-rows__row")[next]?.focus(),
                  );
                }}
              >
                <span className="rank__pos">{i + 1}</span>
                <span className="rank-rows__label">{item}</span>
                <span className="rank-rows__grip" aria-hidden="true">
                  <svg viewBox="0 0 12 20">
                    {[3, 10, 17].map((cy) => (
                      <g key={cy}>
                        <circle cx="3" cy={cy} r="1.6" />
                        <circle cx="9" cy={cy} r="1.6" />
                      </g>
                    ))}
                  </svg>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="visually-hidden" aria-live="polite">
        {said}
      </p>
    </>
  );
}
