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
 * WHAT IOS THINKS THIS APP IS.
 *
 * `transient` — the category for notification sounds: short things that play
 * over whatever else is going on. That is exactly what every sound in this
 * file is, and asking for the right one turns out to matter twice.
 *
 * It was `playback`, the category for music and video, chosen because it plays
 * through the ringer switch. It cost two things nobody wanted. Now Playing
 * opened in the Dynamic Island, because a page claiming to be media gets media
 * controls; and `playback` is specified not to mix with other audio, so a
 * letter tap stopped whatever the table had on. A party app that silences the
 * party's music is worse than one a silent phone cannot hear.
 *
 * None of that could be settled off the device. An installed PWA and a Safari
 * tab are not treated alike — Safari owns the Now Playing session for its own
 * tabs, so a test page in a tab shows no difference at all. This was decided by
 * shipping a picker to Settings, trying each one in the installed app with
 * music playing, and taking it out again.
 */
const SESSION_TYPE = "transient";

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
   * Something taken back out: an item lifted off a Rank It list. Not a
   * refusal — the game did not say no, the player changed their mind — so it
   * is the tap gone quiet and dull rather than anything that sounds like a
   * correction.
   */
  | "undo"
  /**
   * One second gone, in the last three of a turn. Takes a `step` — these
   * climb, and the climb ends on `buzzer`, so the two are written as one
   * gesture and should be changed as one.
   */
  | "tick"
  /** The clock hit zero. The tone the ticks were climbing towards. */
  | "buzzer"
  /**
   * A ROUND STARTS. The end of a 3 · 2 · 1 that everyone acts ON — Point, Say
   * it. The same three pips lead into it as into `buzzer`, but this is a
   * starting gun and that is an ending, so it lands brighter and shorter. Two
   * opposite events should not wear the same sound however alike their run-ups
   * are.
   *
   * It also fires with NO run-up at all, on the last Hide role in Odd One Out:
   * the deal is done, the phone stops being private, and the table starts.
   * Named for the event rather than the noise, so the absence of pips does not
   * make it a different one — but it is worth knowing that this is the naked
   * case, and that the two it lands on elsewhere are simultaneous instants
   * where this is a round opening into talk.
   */
  | "go"
  /**
   * Two people landed on the same word, or a Rank It guess came back perfect.
   * The success — everything else confirms a press or runs a clock down — and
   * the one place a slightly bigger sound is earned.
   */
  | "match"
  /**
   * The opposite result: a guess that landed nothing at all. Deliberately
   * comic rather than corrective — falling, and over quickly. A miss in a
   * party game is the funny part, and the mode it belongs to is on record as
   * refusing to punish: "the drink was a consequence bolted onto a result."
   *
   * It fires far more often than `match` does — a clean sweep of five is one
   * guess in 120, a total miss closer to one in three — so it is written to be
   * survivable at that rate rather than to match the success in weight.
   */
  | "miss"
  /**
   * A CARD TURNS OVER — any card, anywhere. Prompt decks, the playing cards in
   * Kings Cup and Ride the Bus, a mode opening, a phase changing.
   *
   * One sound because it is one event. They were briefly two, on the argument
   * that a playing card is a physical object and a prompt card is the app
   * handing you something to read — but the app has always drawn them with a
   * single flip animation, and a table watching it sees one thing happen.
   *
   * Fired where a card is actually DRAWN — `useDeck`'s draw, and the two modes
   * that deal from a real 52-card deck. Not from the flip animation, which was
   * the obvious hook and the wrong one: every phase change flips a card too, so
   * it sounded Odd One Out's cover screens and every mode opening. Those are
   * transitions. A card being drawn is the game.
   *
   * The most frequent sound in the app by a distance, which is the only thing
   * that decided its level. See the note on the case.
   */
  | "card"
  /**
   * The phone is going to the next player, or a screen is handing on to the
   * next thing: each Hide role in Odd One Out except the last, and locking a
   * complete ranking in. Rising, because something is being passed rather than
   * finished — the last hand-over in a deal is `go`, not this.
   */
  | "advance"
  /**
   * A DETENT ON BALLPARK'S DIAL, every five units the needle crosses. Takes a
   * `step` — which notch of the twenty-one it just passed — and climbs across
   * them, so a sweep of the whole arc audibly travels.
   *
   * This is now the fastest-repeating sound in the app, past `tap`: a single
   * confident drag from end to end crosses twenty of them in under a second.
   * Everything about how it is written is that rate.
   */
  | "dial"
  /** The group commits to a position. Short, down, and done deciding. */
  | "lock"
  /**
   * THE RESULT OF A BALLPARK ROUND, and it takes the DISTANCE between the
   * guess and the answer as its step rather than a beat index — the one sound
   * in here whose shape is the game state.
   *
   * It was keyed to a score until the mode stopped keeping one. Distance is
   * the better handle anyway: it is the thing already printed on the screen
   * underneath it, so the sound and the line agree without a table of points
   * in between them deciding what the number means.
   */
  | "verdict";

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
  /**
   * Sweep the filter here across the burst. A fixed filter on noise is a
   * click; one that MOVES is something sliding, which is the whole difference
   * between a button and a card.
   */
  slideTo?: number | null;
  /**
   * How long to reach full level. Zero — the default — starts at full and
   * reads as a hit. Friction has to ramp into being, so anything that is
   * meant to sound like contact rather than impact needs this.
   */
  rise?: number;
  /**
   * Start at a random point in the noise instead of the beginning, so a sound
   * played over and over is never the identical waveform twice. Off by
   * default: the sounds that fire once per event do not need it, and the ones
   * already tuned should not quietly change.
   */
  vary?: boolean;
}

interface ToneOptions {
  freq?: number;
  duration?: number;
  gain?: number;
  type?: OscillatorType;
  slideTo?: number | null;
  /**
   * How long the tone takes to reach full level. The default is short enough
   * to read as a hit; a held tone wants a hair longer, or the onset clicks
   * before the note arrives.
   */
  attack?: number;
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

    this.applySession();

    if (this.ctx.state === "suspended") void this.ctx.resume();
    this.unlocked = true;
  }

  /** See SESSION_TYPE. Set on every unlock, because it costs nothing to. */
  private applySession(): void {
    const session = (navigator as AudioSessionNavigator).audioSession;
    if (!session) return;
    try {
      session.type = SESSION_TYPE;
    } catch {
      /* not supported, which is every browser but Safari */
    }
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
  private noiseBurst(
    t: number,
    { duration = 0.03, gain = 0.35, freq = 2400, q = 1.2, slideTo = null, rise = 0, vary = false }: NoiseOptions = {},
  ): void {
    if (!this.ctx || !this.master || !this.noise) return;

    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(freq, t);
    if (slideTo) filter.frequency.exponentialRampToValueAtTime(slideTo, t + duration);
    filter.Q.value = q;

    const env = this.ctx.createGain();
    if (rise > 0) {
      /* Ramped up rather than struck. Same 0.0001 floor as `tone` uses, and
         for the same reason: an exponential ramp cannot touch zero. */
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(gain, t + rise);
    } else {
      env.gain.setValueAtTime(gain, t);
    }
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    /* A different slice of the same noise each time — see `vary`. The buffer
       is a quarter second and these are hundredths, so there is plenty of it
       to be somewhere else in. */
    const offset = vary ? Math.random() * Math.max(0, NOISE_SECONDS - duration) : 0;

    src.connect(filter).connect(env).connect(this.master);
    src.start(t, offset, duration);
  }

  /**
   * A pitched BODY, which is what gives the click weight. Without it a tap is
   * a hiss; with it, something moved.
   *
   * Ramped to and from 0.0001 rather than 0 because an exponential ramp cannot
   * touch zero — the tiny floor is inaudible and keeps the envelope from
   * clicking at either end.
   */
  private tone(t: number, { freq = 180, duration = 0.06, gain = 0.3, type = "sine", slideTo = null, attack = 0.005 }: ToneOptions = {}): void {
    if (!this.ctx || !this.master) return;

    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain, t + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(env).connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  // --- the sounds --------------------------------------------------------

  /**
   * `step` is which beat of an escalating series this is, counted from 0. Only
   * `tick` reads it — three seconds of clock that tighten as they run out —
   * and it is clamped, so a caller that miscounts gets the last beat rather
   * than an undefined one.
   */
  play(name: Sound, step = 0): void {
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

      /* SOFT, LOW AND BRIEF — a correction, not a telling-off.
         It was a square wave at 130Hz falling to 90, which was the loudest
         thing in the app for the smallest event in it: square is the harshest
         shape there is, and 130 to 90 is under the floor where a phone speaker
         rattles instead of playing a note. Reaching for a letter that has gone
         is a very ordinary mistake and wants a very ordinary sound.

         Triangle rather than square for the same reason it is quiet — this has
         to say "not that one" and then get out of the way of a table mid-round. */
      case "reject":
        this.tone(t, { freq: 300, duration: 0.055, gain: 0.16, type: "triangle", slideTo: 240 });
        break;

      /* The tap with the life taken out of it — lower, shorter, quieter, and
         no pitch variation, because the rotation is what makes a run of taps
         sound alive and this is the one that should not. Same button, nothing
         happening. */
      case "undo":
        this.noiseBurst(t, { freq: 1100, q: 1.2, duration: 0.02, gain: 0.2 });
        break;

      /* A PIP THAT CLIMBS INTO THE SOUND IT LANDS ON.
         Three of these then the buzzer is one gesture rather than four
         events: 700 to 930 and then 1050, each step about the same distance,
         so the last three seconds audibly go somewhere. Getting louder as
         well as higher is what makes it read as running out rather than
         merely counting.

         Pitched rather than the noise burst this used to be, because the tap
         is noise now — a clock made of the same material sits in the same
         part of the spectrum and the two smear together under a thumb. */
      case "tick": {
        const i = Math.min(2, Math.max(0, step | 0));
        this.tone(t, {
          freq: [700, 810, 930][i],
          duration: [0.07, 0.075, 0.085][i],
          gain: [0.18, 0.23, 0.28][i],
        });
        break;
      }

      /* WHERE THE PIPS WERE GOING.
         It was two sawtooths beating against each other at 160Hz falling to
         90 — a klaxon on paper, and on a phone speaker a rattle, because that
         is below what a small driver can reproduce at all. It is the same
         mistake the tap's body layer was making.

         A held tone at the top of the climb instead, with a quiet octave
         underneath for body. Long enough to be an ending; the quiet octave is
         what stops it sounding like a fourth pip that forgot to stop. */
      case "buzzer":
        this.tone(t, { freq: 1050, duration: 0.5, gain: 0.24, type: "triangle", attack: 0.012 });
        this.tone(t, { freq: 525, duration: 0.5, gain: 0.1, attack: 0.012 });
        break;

      /* Brighter and shorter than the buzzer the same pips lead into. An
         ending settles; this one has to make a table move at the same instant,
         so it sits a fifth above and gets out of the way faster. The quiet
         octave underneath is the only thing it borrows from the ending. */
      case "go":
        this.tone(t, { freq: 1320, duration: 0.32, gain: 0.24, type: "triangle", attack: 0.008 });
        this.tone(t, { freq: 660, duration: 0.32, gain: 0.09, attack: 0.008 });
        break;

      /* Three notes up, the last one held. Everything else in this file is
         one event confirmed once; this is a round that went well, so it is
         allowed to take a beat longer than a confirmation would. */
      case "match": {
        const notes = [590, 740, 990];
        for (let i = 0; i < notes.length; i++) {
          this.tone(t + i * 0.075, {
            freq: notes[i],
            duration: i === notes.length - 1 ? 0.3 : 0.09,
            gain: 0.2,
            type: "triangle",
            attack: 0.006,
          });
        }
        break;
      }

      /* THE QUIETEST THING IN HERE, AND IT HAS TO BE.
         Last Call and Hot Seat are nothing but draws (so was Drink If, which
         is retired). This fires more often than the letter tap ever does, and a sound at that
         rate is judged on the tenth one, not the first. Anything with presence
         becomes a tic by the third game.

         A narrow BAND rather than a highpass, which is what took the rattle
         out: a highpass leaves everything above it in, all the way up, and
         that unbounded top is what beads sound like. 1700Hz is low enough not
         to read as hiss and high enough not to thicken into the body that made
         the playing-card attempts sound like a broom.

         It swells rather than strikes — see `rise` — because it sits under a
         460ms card flip and a struck sound at the front of a half-second turn
         detaches from it. */
      case "card":
        this.noiseBurst(t, {
          freq: 1700,
          q: 1.2,
          duration: 0.095,
          /* Judged on a bench where it was the only sound, which flattered it
             badly: 0.012 is an order of magnitude under everything else in
             this file, and on a phone it simply was not there. The swell
             compounds it — this ramps up over 43 of its 95ms, so it touches
             peak briefly, where `tap` sits at full level from its first
             sample. A number that looks quiet here is quieter still in the
             ear. Still the quietest thing in the app, by about three times. */
          gain: 0.05,
          rise: 0.043,
          vary: true,
        });
        break;

      /* One note sagging from 520 to 260. A slide rather than two steps,
         because steps read as a verdict being delivered and a slide reads as
         the air going out of something — which is the joke, and the joke is
         the right register here. */
      case "miss":
        this.tone(t, { freq: 520, slideTo: 260, duration: 0.3, gain: 0.2, type: "triangle", attack: 0.01 });
        break;

      /* Rising, because it hands over. The only sound here that goes up. */
      case "advance":
        this.tone(t, { freq: 420, duration: 0.07, gain: 0.24 });
        this.tone(t + 0.06, { freq: 630, duration: 0.09, gain: 0.24 });
        break;

      /* TRIANGLE, NOT SQUARE, AND NOWHERE NEAR THE BOTTOM OF THE RANGE.
         It was specified as a square wave, and this file has now twice
         written down what square costs: `reject` was one at 130Hz and was the
         loudest thing in the app for the smallest event in it, and `tap` had
         a pitched body at 190Hz that read as a boom in the hand. A detent
         firing twenty times a second inherits both faults at once, so it gets
         the shape those two ended up with.

         The climb is the dial's position, 880Hz at the left end to about
         1280 at the right — small enough that no single tick sounds like a
         note being played, wide enough that running the needle across the
         whole arc goes somewhere. It sits in the same region as `tap`
         deliberately: the two never sound in the same mode.

         The gain is the machine-gun guard. 0.06 is just above `card`, which
         is the quietest thing here, because twenty of these in a row is a
         texture and a texture is judged by its loudest moment. */
      case "dial": {
        const n = Math.min(20, Math.max(0, step | 0));
        this.tone(t, {
          freq: 880 + n * 20,
          duration: 0.015,
          gain: 0.06,
          type: "triangle",
          attack: 0.003,
        });
        break;
      }

      /* Two notes down. `advance` is the same gesture inverted and that is
         the point of the pair: one hands the phone on, this one closes a
         decision the table argued its way to. Down, and quick about it. */
      case "lock":
        this.tone(t, { freq: 780, duration: 0.06, gain: 0.22, type: "triangle" });
        this.tone(t + 0.055, { freq: 520, duration: 0.11, gain: 0.24, type: "triangle" });
        break;

      /* THREE OUTCOMES, ONE GESTURE, READ OFF HOW CLOSE THEY GOT.
         Notes get added the nearer the guess landed rather than the figure
         changing shape, so the outcomes are recognisably the same sound doing
         better or worse — which is what lets a table learn it in one round.

         COARSE ON PURPOSE. It would be easy to give this four steps and fine
         thresholds, and that would be a scoring table living in the audio
         file after the mode deliberately threw one away. Close, near, and
         nowhere is all a sound can say anyway.

         The miss is the odd one out and has to be: a sag rather than a short
         version of the others, borrowed from `miss`, which exists for exactly
         this feeling. It is quieter than the wins, not louder. A miss is the
         funny part. */
      case "verdict": {
        const gap = Math.max(0, step | 0);
        if (gap > 15) {
          this.tone(t, {
            freq: 440, slideTo: 240, duration: 0.28, gain: 0.18,
            type: "triangle", attack: 0.01,
          });
          break;
        }
        const figure = gap <= 5 ? [620, 780, 1040] : [620, 830];
        for (let i = 0; i < figure.length; i++) {
          this.tone(t + i * 0.075, {
            freq: figure[i],
            duration: i === figure.length - 1 ? 0.26 : 0.09,
            gain: 0.2,
            type: "triangle",
            attack: 0.006,
          });
        }
        break;
      }
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
