/**
 * SOUND
 * ---------------------------------------------------------------
 * Every sound in this app is synthesised on the device. There are no audio
 * files, which means there is nothing to precache, nothing to 404, and nothing
 * that can be missing the first time a phone opens the app on a pub's wifi.
 * An installed PWA that works with no signal is the whole point of the build
 * stamp in Settings; a folder of mp3s would quietly undo it.
 *
 * It is also the reason these are all short. A synthesised sound is a shape
 * described in code, and the shapes that survive being written down are the
 * ones a physical object would make: a click, a thud, a buzz, two notes. That
 * is the right register anyway — this is feedback, not a soundtrack. Nothing
 * here plays for longer than half a second.
 *
 * THIS IS THE SECOND CHANNEL OF THE SAME FEEDBACK, and it goes where `buzz`
 * already goes — see useCountdown.ts. A letter locking, a clock running out, a
 * phone changing hands: each of those is one event the app wants to confirm,
 * and haptics and sound are two ways of confirming it to a table that is
 * looking at each other rather than at the screen. Where you find one you
 * should generally find the other, and neither is load-bearing on its own —
 * iOS has no Vibration API and a silenced phone has no sound, so every one of
 * these moments still has to read from the screen alone.
 */

const MUTE_KEY = "lastcall.audio.muted";

/**
 * The vocabulary. Deliberately small and named for the EVENT rather than the
 * noise, so a call site says what happened and this file decides what that
 * sounds like.
 */
export type Sound =
  /** A letter goes down in Letter Rip. The fastest-repeating sound here. */
  | "tap"
  /** A press the game refuses — a letter that is already gone. */
  | "reject"
  /**
   * The three below are written and deliberately UNWIRED. Letter Rip is the
   * only mode making a sound so far, and it is carrying the tap on its own on
   * purpose: a tick and a buzzer in the same round are the two loudest things
   * here, and they would settle how the tap reads before anyone has heard the
   * tap. They go in once it is judged on a real phone, one at a time.
   */
  /** One second gone, in the last few of a clock. */
  | "tick"
  /** The clock hit zero. */
  | "buzzer"
  /** The phone is going to the next player. */
  | "advance";

/**
 * iOS lets a page opt into playing through the ringer switch, and it is not in
 * lib.dom yet. Declared narrowly rather than reaching for `any`, so the one
 * unchecked assumption in the file is a single named property.
 */
interface AudioSessionNavigator extends Navigator {
  audioSession?: { type: string };
}

interface NoiseOptions {
  duration?: number;
  gain?: number;
  freq?: number;
  q?: number;
}

interface ToneOptions {
  freq?: number;
  duration?: number;
  gain?: number;
  type?: OscillatorType;
  slideTo?: number | null;
}

/** How much noise is minted up front, in seconds. See `_noise`. */
const NOISE_SECONDS = 0.25;

class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  /** One buffer of white noise, reused by every burst. See `_noise`. */
  private noise: AudioBuffer | null = null;
  private muted = readMuted();
  private unlocked = false;
  private tapIndex = 0;

  // --- settings ----------------------------------------------------------

  setMuted(value: boolean): void {
    this.muted = value;
    try {
      localStorage.setItem(MUTE_KEY, String(value));
    } catch {
      /* private mode: the setting holds for this session and no longer */
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  // --- lifecycle ---------------------------------------------------------

  /**
   * MUST BE CALLED FROM INSIDE A REAL GESTURE HANDLER.
   *
   * Every mobile browser starts its audio suspended and only lets a page
   * resume it while a user's touch is still being handled. Call this from a
   * touch or a click — not from an effect, a timeout or a promise `then`,
   * where the gesture is over and the resume is silently ignored.
   *
   * Safe to call on every gesture; it does its work once.
   */
  unlock(): void {
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.6;
      this.master.connect(this.ctx.destination);
      this.noise = makeNoise(this.ctx);
    }

    /* iOS treats a page as media by default, which the ringer switch mutes.
       This is a party app played on a phone that has been in a pocket all
       evening — assume the switch is off and ask for playback anyway. */
    const session = (navigator as AudioSessionNavigator).audioSession;
    try {
      if (session) session.type = "playback";
    } catch {
      /* not supported, which is every browser but Safari */
    }

    if (this.ctx.state === "suspended") void this.ctx.resume();
    this.unlocked = true;
  }

  /**
   * The context, if there is one and it is allowed to make a sound right now —
   * otherwise null, and the caller returns without doing anything. Every way a
   * sound can legitimately not happen is gathered here: muted, never unlocked,
   * or a browser with no Web Audio at all.
   */
  private live(): AudioContext | null {
    if (this.muted || !this.ctx || !this.unlocked) return null;
    /* Backgrounding the phone suspends the context, and coming back does not
       resume it on its own. This runs inside the tap that wants the sound, so
       the gesture is live and the resume is allowed — the tap that wakes it
       may still land silent, and the one after it will not. */
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  // --- the two things every sound here is made of ------------------------

  /**
   * A filtered burst of noise — the CLICK. Noise is what a physical contact
   * actually sounds like; a pure tone on its own reads as a beep from a
   * machine rather than a thing being pressed.
   *
   * The noise is minted ONCE and every burst is a window onto it, rather than
   * a fresh buffer filled with `Math.random()` per sound. A quarter of a
   * second of it is a few kilobytes held for the life of the app, and the
   * alternative is allocating and filling a buffer on the same frames that
   * twenty letter tiles are animating and a sweep is being redrawn — on the
   * one screen in this app that already has the most to do, driven at the
   * speed of a thumb. Nobody can hear the difference between two random
   * buffers, so there is no reason to pay for the second one.
   *
   * The decay lives entirely in the gain envelope for the same reason: it is
   * one scheduled ramp instead of a per-sample multiply.
   */
  private noiseBurst(t: number, { duration = 0.03, gain = 0.35, freq = 2400, q = 1.2 }: NoiseOptions = {}): void {
    if (!this.ctx || !this.master || !this.noise) return;

    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq;
    filter.Q.value = q;

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(gain, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    src.connect(filter).connect(env).connect(this.master);
    src.start(t, 0, duration);
  }

  /**
   * A pitched BODY, which is what gives the click weight. Without it a tap is
   * a hiss; with it, something moved.
   *
   * Ramped to and from 0.0001 rather than 0 because an exponential ramp cannot
   * touch zero — the tiny floor is inaudible and keeps the envelope from
   * clicking at either end.
   */
  private tone(t: number, { freq = 180, duration = 0.06, gain = 0.3, type = "sine", slideTo = null }: ToneOptions = {}): void {
    if (!this.ctx || !this.master) return;

    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain, t + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(env).connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  // --- the sounds --------------------------------------------------------

  play(name: Sound): void {
    const ctx = this.live();
    if (!ctx) return;
    const t = ctx.currentTime;

    switch (name) {
      /* Four pitches on a rotation, because the same sample twenty times in a
         row is the sound of a machine, not of twenty buttons. The variation is
         small enough that nobody notices it and large enough that a fast run
         down the letter bank stops sounding like one key stuck down. */
      /* NOISE ONLY, AND NO PITCHED BODY.
         It had one: 190Hz falling to 120, which is the frequency a phone
         speaker turns into buzz rather than weight. On a desk it read as a
         button; in a hand it read as a boom, and the click it was supposed to
         be giving weight to was the part that got buried. Taking the layer out
         was better than balancing it — judged against four alternatives on the
         device, which is the only place this question can be settled.

         1700Hz is low enough to have a surface to it rather than reading as a
         tick, and far enough from the 3kHz region that it does not turn shrill
         on a small speaker. The level is up a little from the burst that used
         to sit under the body, because now it is carrying the whole sound. */
      case "tap": {
        const detune = [1, 1.06, 0.95, 1.02][this.tapIndex++ % 4];
        this.noiseBurst(t, { duration: 0.022, gain: 0.4, freq: 1700 * detune, q: 1.2 });
        break;
      }

      /* Low, square and falling — the shape of "no". */
      case "reject":
        this.tone(t, { freq: 130, duration: 0.09, gain: 0.22, type: "square", slideTo: 90 });
        break;

      /* Quieter than everything else on purpose. It fires once a second while
         a player is under pressure, and a tick you notice is a tick that
         becomes the thing they are listening to. */
      case "tick":
        this.noiseBurst(t, { duration: 0.018, gain: 0.16, freq: 3200, q: 2 });
        break;

      /* Two saws a hair apart. The beating between them is what makes it sound
         like a buzzer rather than a note — one oscillator here is a game show
         answer, two is a klaxon. */
      case "buzzer":
        this.tone(t, { freq: 160, duration: 0.5, gain: 0.3, type: "sawtooth", slideTo: 90 });
        this.tone(t, { freq: 161.5, duration: 0.5, gain: 0.25, type: "sawtooth", slideTo: 91 });
        break;

      /* Rising, because it hands over. The only sound here that goes up. */
      case "advance":
        this.tone(t, { freq: 420, duration: 0.07, gain: 0.24 });
        this.tone(t + 0.06, { freq: 630, duration: 0.09, gain: 0.24 });
        break;
    }
  }
}

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "true";
  } catch {
    return false;
  }
}

function makeNoise(ctx: AudioContext): AudioBuffer {
  const frames = Math.floor(ctx.sampleRate * NOISE_SECONDS);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export const audio = new AudioManager();

/**
 * Wire the unlock to the first touch the app gets, wherever it lands.
 *
 * Not hung off a particular button, because there isn't one: the first thing a
 * player touches might be a mode card, the settings gear, or the scroll of the
 * deck. `once` retires the listener the moment it has fired, and `pointerdown`
 * is the earliest event in a press — so by the time the tap that opened a mode
 * completes, audio has already been running for a few milliseconds.
 *
 * Returns its own teardown, for the effect that owns it.
 */
export function unlockOnFirstGesture(): () => void {
  const open = () => audio.unlock();
  window.addEventListener("pointerdown", open, { once: true });
  window.addEventListener("touchend", open, { once: true });
  window.addEventListener("keydown", open, { once: true });
  return () => {
    window.removeEventListener("pointerdown", open);
    window.removeEventListener("touchend", open);
    window.removeEventListener("keydown", open);
  };
}
