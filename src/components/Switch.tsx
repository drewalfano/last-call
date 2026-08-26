import { audio } from "../lib/audio";

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** The setting's name, read as the control's label. */
  label: string;
  /** One line under the label saying what it costs you. Optional. */
  hint?: string;
  /** Extra class on the row, for a screen that has to place it. */
  className?: string;
}

/**
 * ONE SETTING, ON OR OFF, INSIDE A ROUND.
 *
 * The settings sheet has `.segmented` for this and it is the wrong control
 * here. Segmented spells its states out — ON | OFF, LIGHT | DARK | DEVICE —
 * which is right when you are reading a list of preferences and want to see
 * every option without pressing anything. On a setup screen the question is
 * already asked by the label, and a second row of words answering it competes
 * with the two buttons underneath that actually start the game.
 *
 * So: the label is the question and the track is the answer. `role="switch"`
 * rather than a checkbox because that is what it is, and because it lets the
 * whole row — label, hint and track — be one press target instead of a
 * 51x31px one at the end of a line, which is the size a thumb misses.
 */
export function Switch({ checked, onChange, label, hint, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={className ? `switch ${className}` : "switch"}
      /* On the press rather than on the click, like the stepper: the sound is
         confirming that the thumb landed on the control, and the state change
         it is reporting has not happened yet at pointerdown. */
      onPointerDown={() => audio.play("tap")}
      onClick={() => onChange(!checked)}
    >
      <span className="switch__label">
        <span className="switch__name">{label}</span>
        {hint && <span className="switch__hint">{hint}</span>}
      </span>
      {/* The track is decoration over an accessible name that is already
          complete — the button says what it is and aria-checked says which
          way it is set, so a reader that never sees this reads the same
          control. */}
      <span className="switch__track" aria-hidden="true">
        <span className="switch__thumb" />
      </span>
    </button>
  );
}
