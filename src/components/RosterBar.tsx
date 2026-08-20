import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useRoster } from "../state/roster";

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

export function RosterBar() {
  const { players, hasRoster, add, remove, clear } = useRoster();
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
            {players.map((name) => (
              <button
                key={name}
                className="roster__chip"
                data-name={name}
                data-leaving={name === leaving || undefined}
                onClick={() => startRemove(name)}
                aria-label={`Remove ${name}`}
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
