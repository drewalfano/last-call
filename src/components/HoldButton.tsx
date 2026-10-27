import { useCallback, useEffect, useReducer, useRef } from "react";
import { audio } from "../lib/audio";
import { holdReducer, initialHold, isShowing, type HoldState } from "../lib/holdReveal";
import { useWhenHidden } from "../lib/useWhenHidden";

/**
 * The hold, wired to the page: pointer and Space press and release it, and
 * the page going to the background lets go of it — see useWhenHidden.
 *
 * `onRelease` fires once per hold, after the secret is already off screen.
 * The caller moves to the next seat there.
 *
 * Space is listened for on the window rather than the button, so a keyboard
 * user does not have to find focus first — but only while `active`, so two
 * screens never answer the same key.
 */
export function useHoldReveal(
  active: boolean,
  onRelease?: (reason: "let-go" | "hidden") => void,
) {
  const [state, dispatch] = useReducer(holdReducer, initialHold);
  const showing = isShowing(state);

  const done = useRef(onRelease);
  done.current = onRelease;
  useEffect(() => {
    if (state.phase === "released") done.current?.(state.reason);
  }, [state]);

  useWhenHidden(showing, () => dispatch({ type: "hide" }));

  /* A finger that lifts anywhere ends its hold, not just over the button.
     Pressing swaps the handoff for the private screen, which remounts the
     button and moves it; the pointerup then lands on whatever is under the
     finger now, and a hold that missed its release would leave a role face up
     on the table. The reducer ignores a release from any other pointer. */
  const heldPointer = state.phase === "holding" && state.source === "pointer" ? state.pointerId : null;
  useEffect(() => {
    if (heldPointer === null) return;
    const up = (e: PointerEvent) => dispatch({ type: "release", source: "pointer", pointerId: e.pointerId });
    /* Sliding off is letting go, checked by where the finger IS rather than
       by pointerleave: a touch that the browser has captured, or a button that
       moved under a still finger, never sends one. */
    const move = (e: PointerEvent) => {
      if (!document.elementFromPoint(e.clientX, e.clientY)?.closest(".hold")) up(e);
    };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("pointermove", move);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("pointermove", move);
    };
  }, [heldPointer]);

  useEffect(() => {
    if (!active) return;
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      if (!e.repeat) dispatch({ type: "press", source: "key" });
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") dispatch({ type: "release", source: "key" });
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [active]);

  const reset = useCallback(() => dispatch({ type: "reset" }), []);
  /** The path useWhenHidden takes, for a caller that knows the page is going. */
  const hide = useCallback(() => dispatch({ type: "hide" }), []);

  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      /* Touch captures the pointer to its target by default, which holds back
         pointerleave until the finger lifts — so sliding off would not let
         go. Handing the capture back is what makes it work on a screen. */
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      dispatch({ type: "press", source: "pointer", pointerId: e.pointerId });
      audio.play("tap");
    },
    onPointerUp: (e: React.PointerEvent) =>
      dispatch({ type: "release", source: "pointer", pointerId: e.pointerId }),
    onPointerCancel: (e: React.PointerEvent) =>
      dispatch({ type: "release", source: "pointer", pointerId: e.pointerId }),
    onPointerLeave: (e: React.PointerEvent) =>
      dispatch({ type: "release", source: "pointer", pointerId: e.pointerId }),
  };

  return { state, showing, handlers, reset, hide };
}

interface HoldButtonProps {
  /** Wired from useHoldReveal. */
  handlers: ReturnType<typeof useHoldReveal>["handlers"];
  state: HoldState;
  /** What it says at rest. Two short lines at most. */
  label?: string;
  /** What it says while held. */
  heldLabel?: string;
}

/**
 * HOLD TO SEE.
 *
 * A round button rather than the pill every other action is, because it is
 * the one control on the screen that is pressed and KEPT pressed: a thumb
 * rests on it, so it is drawn to be rested on. The soft ring is the target
 * reaching past the button's edge — on a propped board the hand arrives at an
 * angle, and the ring is where it arrives.
 *
 * It never captures the pointer. Sliding off is letting go, on purpose:
 * a finger dragged away is a hand that has stopped holding, and the role goes
 * down with it. That is `pointerleave`, and capture would suppress it.
 *
 * `touch-action: none` and no callout, or iOS reads a long press as a request
 * for its own menu and cancels the hold to show it.
 */
export function HoldButton({ handlers, state, label = "Hold to see", heldLabel = "Holding" }: HoldButtonProps) {
  const held = isShowing(state);
  return (
    <button
      type="button"
      className="hold"
      data-held={held || undefined}
      aria-pressed={held}
      onContextMenu={(e) => e.preventDefault()}
      {...handlers}
    >
      <span className="hold__label">{held ? heldLabel : label}</span>
    </button>
  );
}
