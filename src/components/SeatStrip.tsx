/**
 * WHO HAS LOOKED, WHO IS LOOKING, WHO IS NEXT.
 *
 * The strip across the top of a handoff. The table can see it from every
 * seat, so the person reaching for the device knows it is their turn and the
 * person who just had it knows they are done — without anyone reading the
 * name aloud.
 *
 * Three states in the pack's own two colours: done is ink faded into the
 * field with a tick, current is solid ink, waiting is an outline. The pill is
 * the roster chip's shape at its height.
 */
export function SeatStrip({ seats, current, label }: { seats: string[]; current: number; label?: string }) {
  return (
    <div className="seats">
      {label && <span className="seats__label">{label}</span>}
      <ol className="seats__list">
        {seats.map((name, i) => {
          const state = i < current ? "done" : i === current ? "current" : "waiting";
          return (
            <li key={`${name}-${i}`} className="seats__seat" data-state={state} aria-current={state === "current" || undefined}>
              {state === "done" && (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              )}
              {name}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
