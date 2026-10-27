import { useEffect, useRef, type ReactNode } from "react";
import { useSheetExit } from "../lib/useSheetExit";

/** The sheet's exit, matched. See Settings. */
const LEAVE_MS = 160;

interface SidePanelProps {
  title: string;
  /** Spoken name for the close button, e.g. "Close settings". */
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * THE SHEET, ON A BOARD, STANDS UP ALONG THE RIGHT EDGE.
 *
 * Settings and the roster are the same sheet they are on a phone — the same
 * surface, head, title, close well, rows and exit — and on a phone or an iPad
 * in portrait this IS that centred sheet. Only on a landscape board does it
 * take the full height against the right edge, with the page dimmed beside it
 * rather than under it: a centred card in a wide screen is a long reach from
 * every seat, and a panel at the edge is next to whoever is sitting there.
 *
 * Focus goes to the close button on open and returns to whatever had it on
 * close, as Settings does.
 */
export function SidePanel({ title, closeLabel, onClose, children }: SidePanelProps) {
  const { leaving, close } = useSheetExit(onClose, LEAVE_MS);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => back?.focus?.();
  }, []);

  return (
    <div className="modal-backdrop modal-backdrop--side" data-leaving={leaving || undefined} role="presentation" onClick={close}>
      <div className="sheet sheet--side" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <header className="sheet__head">
          <h2 className="sheet__title">{title}</h2>
          <button ref={closeRef} className="sheet__close" onClick={close} aria-label={closeLabel}>
            ×
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
