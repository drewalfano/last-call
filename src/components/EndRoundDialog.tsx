import { useEffect, useRef } from "react";

interface Props {
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * "END THIS ROUND?" — the one confirmation in the app, and it appears only
 * when leaving would throw a live round away. See state/exitGuard.tsx.
 *
 * Keep playing is the default and takes focus, because the tap that opened
 * this was very often a slip. Escape and the backdrop both keep playing.
 * Focus goes back to whatever opened it — the X — when it closes, so a
 * cancelled exit leaves the keyboard exactly where it was.
 */
export function EndRoundDialog({ title, onCancel, onConfirm }: Props) {
  const keepRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    keepRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      } else if (e.key === "Tab" && boxRef.current) {
        const items = Array.from(boxRef.current.querySelectorAll<HTMLElement>("button"));
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, [onCancel]);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="modal end-round"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="end-round-title"
        aria-describedby="end-round-body"
        ref={boxRef}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="modal__title" id="end-round-title">
          End this round?
        </h2>
        <p className="modal__body" id="end-round-body">
          {title} is mid-round. Leaving throws it away, secret and all.
        </p>
        <div className="end-round__actions">
          <button className="btn btn--block" ref={keepRef} onClick={onCancel}>
            Keep playing
          </button>
          {/* "Leave game", not "End round": Letter Rip has an End round button
              of its own that ends a TURN, and this one ends everything. */}
          <button className="btn btn--ghost btn--block" onClick={onConfirm}>
            Leave game
          </button>
        </div>
      </div>
    </div>
  );
}
