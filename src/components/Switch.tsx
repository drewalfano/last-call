import { audio } from "../lib/audio";

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** The setting's name, and the whole of what the control says. */
  label: string;
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
 * whole row — the label and the track — be one press target instead of a
 * 52x32px one at the end of a line, which is the size a thumb misses.
 *
 * A LABEL AND NOTHING ELSE. This carried a second line under the name for a
 * while, explaining what the setting did, and it was the settings sheet's
 * `.setting__hint` turning up on a screen that is not a settings sheet: two
 * lines of small type between the card and the buttons that start the round,
 * saying what the label had already said. If a switch here needs a sentence
 * to be understood, the label is wrong.
 */
export function Switch({ checked, onChange, label, className }: SwitchProps) {
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
      <span className="switch__name">{label}</span>
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
