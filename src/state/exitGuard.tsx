import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";

/**
 * "END THIS ROUND?" — BUT ONLY ONCE THERE IS A ROUND TO END.
 * ---------------------------------------------------------------
 * The X in every game header closes the mode and unmounts it, which is the
 * right thing on a setup screen and the wrong thing on the third reveal of
 * Odd One Out: someone reaching for the button below it loses the whole
 * deal, and the word with it.
 *
 * The games know when they are mid-round; App owns the exit. So a game
 * declares it with `useExitGuard(true)` for the phases that matter, and App
 * checks the flag before leaving. Held in a ref rather than state because
 * nothing renders on it — it is read at the moment of the tap.
 *
 * Deliberately narrow. Setup screens, intro cards and results are not
 * guarded; a confirmation on every ordinary action would be worse than the
 * loss it prevents. Each game names its own live phases.
 */
interface ExitGuardValue {
  set: (active: boolean) => void;
}

const ExitGuardContext = createContext<ExitGuardValue>({ set: () => {} });

export function ExitGuardProvider({
  guardRef,
  children,
}: {
  guardRef: React.RefObject<boolean>;
  children: ReactNode;
}) {
  const value = useRef<ExitGuardValue>({
    set: (active) => {
      guardRef.current = active;
    },
  });
  return <ExitGuardContext.Provider value={value.current}>{children}</ExitGuardContext.Provider>;
}

/** Declare that leaving now would throw a round away. Clears itself on unmount. */
export function useExitGuard(active: boolean): void {
  const { set } = useContext(ExitGuardContext);
  useEffect(() => {
    set(active);
    return () => set(false);
  }, [active, set]);
}
