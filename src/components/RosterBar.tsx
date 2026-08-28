import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useRoster } from "../state/roster";
import { buzz } from "../lib/useCountdown";

/**
 * Who's playing, on Home. Collapsed to a single line until someone taps it —
 * the app has to stay openable mid-conversation, so setup can never be the
 * first thing you meet.
 *
 * Open, it is a tile with three rows and a rule each row follows:
 *
 *   HEADER   what the tile is, and the one control that acts on all of it
 *   CHIPS    one pill per player, each removing itself
 *   ADD      a field and its button, matched in height
 *
 * ONE TILE, TWO STATES — NOT TWO TILES.
 *
 * This used to return two different subtrees, and the collapsed one asked
 * "Who's playing?" while the open one asked it again. React saw a `button`
 * become a `div` and threw the whole thing away, so opening was a hard cut:
 * 72px to 124px, dashed to solid, in one frame, in an app where nothing else
 * arrives without moving.
 *
 * So the shell is mounted in both states and `data-open` is the only thing
 * that changes. The header is shared — the question is the one element that
 * was always in both states, and now it is literally one element, which is
 * what lets it glide from invitation to label instead of being swapped for a
 * copy of itself. Everything else is a slot that opens or shuts; see
 * .roster__slot, which is .roster__chipwrap's idiom used twice more.
 *
 * The collapsed tap target is an overlay button rather than the shell itself,
 * because the open state puts Clear and a form inside, and nothing may nest
 * inside a `button`. It is a real button with a real accessible name — the
 * question and the hint below it, which is exactly what it looks like it says.
 */
/** One exit, on the app's one clock — --dur-base. Kept in step with games.css. */
const LEAVE_MS = 260;

/**
 * How far a finger travels before a press on a chip becomes a drag rather
 * than a tap.
 *
 * Small, because the chips carry `touch-action: none` and the browser is
 * therefore not competing for the gesture — see .roster__chip in games.css for
 * why that trade is made. Big enough that the wobble in a real tap on a 40px
 * pill never crosses it, so tapping still removes a name and nothing else.
 */
const DRAG_SLOP = 6;

/**
 * Where a name lands if it is dropped at (px, py).
 *
 * An index among the OTHER chips, so the caller can splice without an
 * off-by-one: it is the number of them that come before the pointer in
 * reading order.
 *
 * The row wraps, so this is not a sort on x. A chip is "after" the pointer if
 * the pointer is above its line at all, or on its line and left of its middle
 * — which is the order a person reads the row in, and therefore the order they
 * expect to drop into.
 */
function dropIndex(px: number, py: number, others: readonly HTMLElement[]): number {
  for (let i = 0; i < others.length; i++) {
    const r = others[i].getBoundingClientRect();
    if (py < r.top) return i;
    if (py <= r.bottom && px < r.left + r.width / 2) return i;
  }
  return others.length;
}

export function RosterBar() {
  const { players, hasRoster, add, remove, reorder, clear } = useRoster();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  /**
   * A NAME CANNOT LEAVE WHILE IT IS BEING UNMOUNTED.
   *
   * `remove()` used to be the click handler, so React tore the element out and
   * there was nothing left to animate. The name being removed is held here
   * instead, and the roster is not told until its exit has played — the same
   * shape SettingsSheet uses, and the same rule: THE HOLD IS A TIMEOUT, NOT
   * `animationend`. A timeout fires whether or not anything painted. Miss the
   * callback here and the name never comes off the roster at all, which is a
   * worse failure than a skipped animation.
   *
   * One at a time. Two names leaving at once would need two sets of measured
   * offsets and there is no way to tap two chips in the same frame.
   */
  const [leaving, setLeaving] = useState<string | null>(null);
  const exit = useRef<number>(undefined);

  const chipsRef = useRef<HTMLDivElement>(null);
  /** Where every chip sat before the one leaving was lifted out of flow. */
  const firstRects = useRef(new Map<string, DOMRect>());

  /**
   * DRAGGING A NAME TO ANOTHER PLACE IN THE LINE.
   *
   * The order is the seating — see `reorder` in state/roster.tsx — so getting
   * it wrong used to mean clearing the roster and typing it again.
   *
   * The order shown while a drag is in flight is LOCAL. Committing every
   * crossing to the roster would write the whole list to localStorage on every
   * frame the finger moves past a chip; the roster hears about it once, on
   * drop. `list` is what renders either way, so nothing downstream knows the
   * difference.
   */
  const [drag, setDrag] = useState<{ name: string; from: number } | null>(null);
  const [order, setOrder] = useState<string[] | null>(null);
  const list = order ?? players;

  /** The press that might become a drag, from pointerdown until it does. */
  const press = useRef<
    { name: string; index: number; x: number; y: number; id: number; origin: DOMRect } | null
  >(null);
  /** True from the moment a press crosses DRAG_SLOP, so the click can be eaten. */
  const dragged = useRef(false);
  const dragEl = useRef<HTMLElement | null>(null);
  /** The translate currently painted on the dragged chip, so the next one can be worked out. */
  const applied = useRef({ x: 0, y: 0 });
  /** Where the others sat before the order changed under them. */
  const shuffleFrom = useRef(new Map<string, DOMRect>());
  /** What an assistive technology is told after a keyboard move. */
  const [moveSaid, setMoveSaid] = useState("");

  const isOpen = open || hasRoster || leaving !== null;

  const startRemove = useCallback(
    (name: string) => {
      if (exit.current !== undefined) return;
      const box = chipsRef.current;
      if (box) {
        const map = new Map<string, DOMRect>();
        box.querySelectorAll<HTMLElement>(".roster__chip").forEach((el) => {
          if (el.dataset.name)
            map.set(el.dataset.name, el.getBoundingClientRect());
        });
        firstRects.current = map;
      }
      setLeaving(name);
      exit.current = window.setTimeout(() => {
        exit.current = undefined;
        remove(name);
        setLeaving(null);
      }, LEAVE_MS);
    },
    [remove],
  );

  useEffect(() => () => window.clearTimeout(exit.current), []);

  /** Every chip except the one in the hand, in the order they are laid out. */
  const otherChips = useCallback(
    (name: string) =>
      Array.from(
        chipsRef.current?.querySelectorAll<HTMLElement>(".roster__chip") ?? [],
      ).filter((el) => el.dataset.name !== name),
    [],
  );

  const onChipDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>, name: string, index: number) => {
      // Nothing to reorder with one name, and a name on its way out has been
      // lifted out of flow — there is no line for it to move along.
      if (leaving || players.length < 2) return;
      press.current = {
        name,
        index,
        x: e.clientX,
        y: e.clientY,
        id: e.pointerId,
        origin: e.currentTarget.getBoundingClientRect(),
      };
      dragged.current = false;
    },
    [leaving, players.length],
  );

  const onChipMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const p = press.current;
      if (!p || e.pointerId !== p.id) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;

      if (!dragged.current) {
        if (Math.hypot(dx, dy) < DRAG_SLOP) return;
        /* Capture, so the rest of the gesture arrives here even when the finger
           leaves the pill — which it does immediately, because the pill moves
           out from under it as the row reflows. */
        e.currentTarget.setPointerCapture(p.id);
        dragEl.current = e.currentTarget;
        applied.current = { x: 0, y: 0 };
        dragged.current = true;
        buzz(12);
        setOrder(players.slice());
        setDrag({ name: p.name, from: p.index });
        return;
      }

      const el = dragEl.current;
      if (!el) return;

      /* UNDER THE FINGER, WHEREVER THE ROW HAS PUT THE CHIP.
         The chip stays in flow and its slot moves as the order changes, so a
         plain translate of (dx, dy) would drift by however far the slot
         travelled. The layout position is read back each move — minus the
         translate already painted on it, which getBoundingClientRect includes
         — and the offset is whatever puts it back where the finger is. */
      const now = el.getBoundingClientRect();
      const tx = p.origin.left + dx - (now.left - applied.current.x);
      const ty = p.origin.top + dy - (now.top - applied.current.y);
      applied.current = { x: tx, y: ty };
      el.style.translate = `${tx}px ${ty}px`;

      const others = otherChips(p.name);
      const at = dropIndex(e.clientX, e.clientY, others);
      setOrder((prev) => {
        const from = prev ?? players;
        const rest = from.filter((n) => n !== p.name);
        const next = [...rest.slice(0, at), p.name, ...rest.slice(at)];
        if (next.every((n, i) => n === from[i])) return prev;
        // The others are about to be dealt new slots; remember where they were
        // so the effect below can slide them rather than let them jump.
        const map = new Map<string, DOMRect>();
        others.forEach((el2) => {
          if (el2.dataset.name) map.set(el2.dataset.name, el2.getBoundingClientRect());
        });
        shuffleFrom.current = map;
        return next;
      });
    },
    [players, otherChips],
  );

  const endDrag = useCallback(() => {
    const p = press.current;
    press.current = null;
    if (!p || !dragged.current) return;
    const el = dragEl.current;
    if (el) {
      el.style.translate = "";
      el.style.transition = "";
    }
    dragEl.current = null;
    const to = (order ?? players).indexOf(p.name);
    setDrag(null);
    setOrder(null);
    // Told once, at the end. See the note on `order` above.
    if (to >= 0) reorder(p.index, to);
  }, [order, players, reorder]);

  /**
   * The others slide into their new slots rather than jumping into them.
   *
   * The same FLIP the removal below runs, and deliberately a SECOND one rather
   * than a generalisation of it: that one also has to pin the leaving chip
   * where it was and is driven by a name, this one has to leave the chip in the
   * hand alone and is driven by the order. Folding them together would produce
   * one effect with two modes and a branch in every line of it.
   */
  useLayoutEffect(() => {
    const box = chipsRef.current;
    if (!box || shuffleFrom.current.size === 0) return;
    const els = Array.from(box.querySelectorAll<HTMLElement>(".roster__chip"));
    els.forEach((el) => {
      const name = el.dataset.name;
      if (!name || name === drag?.name) return;
      const first = shuffleFrom.current.get(name);
      if (!first) return;
      const now = el.getBoundingClientRect();
      const dx = first.left - now.left;
      const dy = first.top - now.top;
      if (dx === 0 && dy === 0) return;
      el.style.transition = "none";
      el.style.translate = `${dx}px ${dy}px`;
    });
    shuffleFrom.current.clear();
    const play = requestAnimationFrame(() => {
      els.forEach((el) => {
        if (el.dataset.name === drag?.name) return;
        el.style.transition = "";
        el.style.translate = "";
      });
    });
    return () => cancelAnimationFrame(play);
  }, [list, drag]);

  /**
   * THE SAME MOVE WITHOUT A FINGER.
   *
   * A drag is the only way to do this with a mouse or a thumb, and no way at
   * all with a keyboard or a switch — so the arrows do it too. Left and right
   * rather than up and down because the row reads left to right, even where it
   * wraps onto a second line.
   *
   * Announced, because the thing that changed is the ORDER, and a button whose
   * label changed under a focus that never moved is not something a screen
   * reader says on its own.
   */
  const onChipKey = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, name: string, index: number) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const to = index + (e.key === "ArrowLeft" ? -1 : 1);
      if (to < 0 || to >= players.length) return;
      e.preventDefault();
      reorder(index, to);
      setMoveSaid(`${name}, ${to + 1} of ${players.length}`);
    },
    [players.length, reorder],
  );

  const [rowHeight, setRowHeight] = useState(0);

  /**
   * THE ROW'S HEIGHT IS MEASURED, NOT `0fr -> 1fr`.
   *
   * The grid trick this used to run on only fires when its declared value
   * changes, which covers open and shut and nothing else. A name wrapping onto
   * a second line, or the fold when that name leaves, changes the row's
   * CONTENT while the declared value stays put — so no transition fires and
   * the row jumps 40px to 88px in one frame. Confirmed in the browser, and
   * `interpolate-size: allow-keywords` does not help either: `0 -> auto`
   * interpolates, `auto -> auto` with different content does not.
   *
   * Measuring covers all four cases with one mechanism — open, shut, wrap and
   * fold — which is why the two slots above keep the grid idiom and this row
   * does not. Their contents are a fixed 18px and 48px; this one is a person's
   * name and however many of them there are.
   *
   * IN-FLOW CHIPS ONLY, and that is the subtlety.
   *
   * `scrollHeight` was the obvious measurement and it is wrong here: the chip
   * on its way out is absolutely positioned inside this box, and an absolutely
   * positioned child still counts toward its positioned ancestor's scroll
   * height. So while a name was leaving from the last line, the row measured
   * its full height right up until the moment that name unmounted — and then
   * folded, 260ms late, as a separate little animation after the one you were
   * watching had finished. Two things disagreeing about when to happen, which
   * is all "choppy" ever is.
   *
   * Measuring the bottom of the last chip still IN the flow gives the final
   * height from the first frame, so the fold travels with the exit instead of
   * queueing behind it.
   */
  const measureRow = useCallback(() => {
    const box = chipsRef.current;
    if (!box) return;
    const inFlow = Array.from(
      box.querySelectorAll<HTMLElement>(".roster__chip"),
    ).filter((el) => !el.hasAttribute("data-leaving"));
    if (inFlow.length === 0) {
      setRowHeight(0);
      return;
    }
    /* LAYOUT METRICS, NOT RECTS. A chip arriving is mid-`roster-chip-in`, which
       starts at scale(0.96) — and getBoundingClientRect reports the TRANSFORMED
       box, so measuring that way sized the row to a chip that had not finished
       growing. It came out ~1.6px short and clipped the bottom of the pill for
       good once the animation landed. offsetTop/offsetHeight are layout, so they
       ignore the transform and describe where the chip is actually going to be. */
    setRowHeight(Math.max(...inFlow.map((el) => el.offsetTop + el.offsetHeight)));
  }, []);

  useLayoutEffect(() => {
    const box = chipsRef.current;
    if (!box) return;
    measureRow();
    // Catches a name being added, and the row rewrapping when the phone turns.
    const ro = new ResizeObserver(measureRow);
    ro.observe(box);
    return () => ro.disconnect();
  }, [measureRow, players]);

  /**
   * FLIP, because flex reflow is not animatable.
   *
   * Take one name out of the middle of eight and the row does not just close
   * up — a name from the line below comes up to fill the space, and it does
   * that between two frames or not at all. Measured: with the sixth of eight
   * names removed, one chip crossed 199px sideways and a whole line upward in
   * a single frame, in the middle of an animation whose entire point is that
   * nothing jumps.
   *
   * So the layout is settled FIRST — the leaving chip is out of flow from the
   * frame it starts leaving — and every other chip is then translated back to
   * where it used to be and released. Nothing reflows mid-flight, so nothing
   * can jump.
   *
   * useLayoutEffect, not useEffect: the inverted transform has to be on the
   * element before the browser paints, or the chips are visibly in their new
   * places for one frame first, which is the jump this exists to prevent.
   */
  useLayoutEffect(() => {
    const box = chipsRef.current;
    if (!leaving || !box) return;

    const els = Array.from(box.querySelectorAll<HTMLElement>(".roster__chip"));
    const boxNow = box.getBoundingClientRect();

    els.forEach((el) => {
      const name = el.dataset.name;
      if (!name) return;
      const first = firstRects.current.get(name);
      if (!first) return;

      if (name === leaving) {
        // Pinned where it was, so it stays put while it goes.
        el.style.left = `${first.left - boxNow.left}px`;
        el.style.top = `${first.top - boxNow.top}px`;
        el.style.width = `${first.width}px`;
        return;
      }

      const dx = first.left - el.getBoundingClientRect().left;
      const dy = first.top - el.getBoundingClientRect().top;
      if (dx === 0 && dy === 0) return;
      // `translate`, not `transform` — the press owns `transform`. See the
      // note on .roster__chip's transition list.
      el.style.transition = "none";
      el.style.translate = `${dx}px ${dy}px`;
    });

    // The leaving chip is out of flow as of this frame, so the row's final
    // height is knowable now — and the fold starts with the exit, not after it.
    measureRow();

    const play = requestAnimationFrame(() => {
      els.forEach((el) => {
        if (el.dataset.name === leaving) return;
        el.style.transition = "";
        el.style.translate = "";
      });
    });
    return () => cancelAnimationFrame(play);
  }, [leaving, measureRow]);

  const rowOpen = hasRoster || leaving !== null;

  return (
    <div className="roster" data-open={isOpen || undefined}>
      {/* The dashes are a stroke, not a border. A CSS `dashed` border cannot
          round its dashes and hands the corners to the browser, which is where
          it visibly gives up — see .roster__outline. It is also the same line
          in both states now: it knits itself shut rather than being replaced
          by a border when the tile opens. */}
      <svg className="roster__outline" aria-hidden="true">
        <rect />
      </svg>

      {!isOpen && (
        <button
          className="roster__tap"
          onClick={() => setOpen(true)}
          aria-labelledby="roster-title roster-hint"
        />
      )}

      {/* The clip lives here rather than on the tile, so the outline above —
          which sits outside the padding box — survives it. See .roster__body. */}
      <div className="roster__body">
        <div className="roster__head">
          {/* THE WAY BACK OUT OF AN EMPTY TILE.

            Clear is the only thing that collapses this, and Clear is hidden
            until there is something to clear — so opening the tile and adding
            nobody left you stuck looking at a field you did not want, with the
            deck pushed down the screen and no way to undo it. The tile could
            be opened and never closed.

            Only while it is empty: with names in it, Clear is present and is
            the control that does this, and a header that quietly means two
            different things depending on the roster would be worse than the
            gap it fixes. */}
          {isOpen && !hasRoster ? (
            <button
              className="roster__shut"
              onClick={() => setOpen(false)}
              aria-label="Close, nobody playing"
            >
              <span className="roster__title" id="roster-title">
                Who's playing?
              </span>
            </button>
          ) : (
            <span className="roster__title" id="roster-title">
              Who's playing?
            </span>
          )}
          {/* Rendered always, hidden until there is something to clear —
            `visibility`, so it leaves the tab order and the accessibility
            tree exactly as if it were not here, which is what an
            always-present control that does nothing would otherwise cost.
            The same trick .gfoot__skip uses, for the same reason: what it
            buys is that the row keeps its height, so the label beside it and
            the field under it do not shift when the first name lands. */}
          <button
            className="roster__clear"
            data-hidden={!hasRoster || undefined}
            onClick={() => {
              clear();
              setOpen(false);
            }}
            aria-label="Clear all players"
          >
            Clear
          </button>
        </div>

        {/* Shuts as the tile opens. The invitation is only worth the room while
          the tile is still an invitation. */}
        <div className="roster__slot roster__slot--hint">
          <span className="roster__hint" id="roster-hint">
            Optional. Names make it better
          </span>
        </div>

        {/* THE ROW THAT OPENS.

          Always mounted, and collapsed to nothing by the wrapper rather than
          unmounted, because a row that is not there cannot animate on its way
          in. Adding the first name used to relayout the whole tile in one
          frame: the row appeared at full height, the field jumped 48px down
          the screen and Clear blinked into existence beside a label that had
          just moved. Now the wrapper opens, and everything below it is
          carried down by that one continuous height rather than by a reflow.

          It measures its own contents — see .roster__chipwrap — so it works
          the same for one name as for a set that wraps onto three lines. */}
        <div
          className="roster__chipwrap"
          data-open={rowOpen || undefined}
          style={{ height: rowOpen ? rowHeight : 0 }}
        >
          <div className="roster__chips" ref={chipsRef}>
            {list.map((name, i) => (
              <button
                key={name}
                className="roster__chip"
                data-name={name}
                data-leaving={name === leaving || undefined}
                data-dragging={name === drag?.name || undefined}
                onPointerDown={(e) => onChipDown(e, name, i)}
                onPointerMove={onChipMove}
                onPointerUp={endDrag}
                /* A capture torn away — the sheet opening over it, the phone
                   ringing — leaves the chip mid-flight with no pointerup
                   coming. Same handler: the order it is in when the gesture
                   dies is the order it meant. */
                onPointerCancel={endDrag}
                onLostPointerCapture={endDrag}
                onKeyDown={(e) => onChipKey(e, name, i)}
                onClick={() => {
                  /* A drag ends in a click on the chip it started on, and this
                     chip's click removes a name. Eaten once, here, rather than
                     guarded for at the top of startRemove — a drag is the only
                     thing that sets it, and this is the only place it matters. */
                  if (dragged.current) {
                    dragged.current = false;
                    return;
                  }
                  startRemove(name);
                }}
                aria-label={`Remove ${name}, ${i + 1} of ${list.length}`}
                aria-keyshortcuts="ArrowLeft ArrowRight"
              >
                {name}
                <span className="roster__chip-x" aria-hidden="true">
                  {/* Drawn, not typed — see StepIcon in games/Imposter.tsx for why
                    a glyph will not sit in the middle of a round well. */}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M3 3l6 6M9 3l-6 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Says where a name landed, and only ever after a keyboard move — a
            drag is its own feedback, and announcing every chip the finger
            crossed would be a stream of noise. */}
        <p className="visually-hidden" aria-live="polite">
          {moveSaid}
        </p>

        <div className="roster__slot roster__slot--add">
          <form
            className="roster__add"
            onSubmit={(e) => {
              e.preventDefault();
              add(draft);
              setDraft("");
            }}
          >
            <input
              className="roster__input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a name"
              aria-label="Add a player"
              maxLength={16}
              autoComplete="off"
              autoCapitalize="words"
            />
            <button
              className="roster__go"
              type="submit"
              disabled={!draft.trim()}
            >
              Add
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
