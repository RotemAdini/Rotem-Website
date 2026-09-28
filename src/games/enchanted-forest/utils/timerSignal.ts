/**
 * The sound the two timed stations end on.
 *
 * Stations 14 and 18 ask the couple to look at each other for three minutes and
 * to kiss for one — that is, to spend the whole of the countdown NOT looking at
 * the phone. Until now the only thing that happened at 0:00 was a line of text
 * appearing on a screen nobody was watching, so the timers could only be read by
 * breaking the very thing they were timing. This module is what lets the phone
 * say "you're done" without being looked at.
 *
 * Three things matter about the implementation:
 *
 *  • The tone is synthesised, not loaded. A chime file would be another asset to
 *    ship, another request to fail, and another thing to get stuck decoding at
 *    the exact moment it is needed. Three soft sine notes cost nothing and are
 *    always ready.
 *
 *  • Audio is armed by the START tap, not by the timer. Every browser refuses to
 *    start audio outside a user gesture, and a countdown finishing is not one.
 *    `prime()` is called from the button handler — inside the gesture — which is
 *    what makes `fire()` audible three minutes later.
 *
 *  • Nothing here is allowed to throw. Every capability is optional and every
 *    call is guarded: no AudioContext, a refused resume, a vibrate that is absent
 *    or throws. A phone that can do none of it still shows the finished state on
 *    screen, which is why `fire()` never reports success or failure — there is no
 *    caller decision to make.
 *
 * Known limitation, deliberately not worked around: on iOS the hardware mute
 * switch silences Web Audio. Vibration covers that on Android; iOS Safari does
 * not implement `navigator.vibrate` at all, so a muted iPhone falls back to the
 * visible "הזמן הסתיים" state. There is no web API that reaches past both.
 */

/** The browser capabilities this needs, injected so the behaviour is testable. */
export interface TimerSignalEnv {
  /** `window.AudioContext`, or the prefixed Safari spelling, or nothing. */
  audioContext?: (new () => AudioContextLike) | undefined;
  /** `navigator.vibrate`, already bound. */
  vibrate?: ((pattern: number | number[]) => boolean) | undefined;
}

/** The slice of AudioContext used here. Kept narrow so a fake is a few lines. */
export interface AudioContextLike {
  readonly currentTime: number;
  readonly state: string;
  readonly destination: unknown;
  createOscillator(): OscillatorLike;
  createGain(): GainLike;
  resume(): Promise<void>;
  close(): Promise<void>;
}

export interface OscillatorLike {
  type: string;
  frequency: { setValueAtTime(value: number, when: number): void };
  connect(target: unknown): void;
  start(when: number): void;
  stop(when: number): void;
}

export interface GainLike {
  gain: {
    setValueAtTime(value: number, when: number): void;
    linearRampToValueAtTime(value: number, when: number): void;
    exponentialRampToValueAtTime(value: number, when: number): void;
  };
  connect(target: unknown): void;
}

export interface TimerSignal {
  /** Call from the start-button handler, inside the user gesture. */
  prime(): void;
  /** Call once when the countdown reaches zero. Silent if nothing is available. */
  fire(): void;
  /** Release the audio hardware. Call on unmount. */
  dispose(): void;
}

/**
 * A rising three-note phrase — A5, C#6, E6 — the notes of an A major triad.
 *
 * Rising and consonant, so it reads as "finished" rather than "alarm": these two
 * stations end on a kiss and on three minutes of held eye contact, and the last
 * thing either moment needs is a buzzer. Each note is a soft sine with a 40ms
 * fade in and a long fade out, and they overlap, so the phrase rings rather than
 * clicks. Total length ≈ 1.1s.
 */
const NOTES: readonly { hz: number; at: number; hold: number }[] = [
  { hz: 880.0, at: 0.0, hold: 0.55 },
  { hz: 1108.73, at: 0.16, hold: 0.55 },
  { hz: 1318.51, at: 0.32, hold: 0.78 },
];

/** Gentle, and well under the level at which a sine reads as a beep. */
const PEAK_GAIN = 0.16;
const ATTACK = 0.04;

/** Two soft pulses rather than one long buzz. Ignored where unsupported. */
export const VIBRATION_PATTERN: readonly number[] = [170, 90, 170];

/** Reads the real browser. Returns empty capabilities outside one. */
export function browserSignalEnv(): TimerSignalEnv {
  if (typeof window === 'undefined') return {};

  const w = window as unknown as {
    AudioContext?: new () => AudioContextLike;
    webkitAudioContext?: new () => AudioContextLike;
  };

  const audioContext = w.AudioContext ?? w.webkitAudioContext;

  // `navigator.vibrate` must keep its receiver, and is absent on iOS Safari and
  // on every desktop browser.
  const vibrate =
    typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
      ? (pattern: number | number[]) => navigator.vibrate(pattern)
      : undefined;

  return { ...(audioContext ? { audioContext } : {}), ...(vibrate ? { vibrate } : {}) };
}

export function createTimerSignal(env: TimerSignalEnv = browserSignalEnv()): TimerSignal {
  let context: AudioContextLike | null = null;

  const ensureContext = (): AudioContextLike | null => {
    if (context) return context;
    if (!env.audioContext) return null;
    try {
      context = new env.audioContext();
    } catch {
      context = null;
    }
    return context;
  };

  return {
    prime() {
      const ctx = ensureContext();
      if (!ctx) return;
      // Created inside the gesture, so this resolves; if a browser refuses it
      // anyway, `fire()` will simply have nothing to play.
      if (ctx.state !== 'running') {
        try {
          void ctx.resume().catch(() => undefined);
        } catch {
          /* nothing to recover: the visible finished state still applies */
        }
      }
    },

    fire() {
      if (env.vibrate) {
        try {
          env.vibrate([...VIBRATION_PATTERN]);
        } catch {
          /* a vibrate that throws is not worth failing the chime over */
        }
      }

      const ctx = context;
      if (!ctx) return;

      try {
        const start = ctx.currentTime + 0.02;
        for (const note of NOTES) {
          const oscillator = ctx.createOscillator();
          const gain = ctx.createGain();
          const at = start + note.at;
          const end = at + note.hold;

          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(note.hz, at);

          gain.gain.setValueAtTime(0.0001, at);
          gain.gain.linearRampToValueAtTime(PEAK_GAIN, at + ATTACK);
          // Exponential, because a linear fade on a sine is heard as a cut.
          gain.gain.exponentialRampToValueAtTime(0.0001, end);

          oscillator.connect(gain);
          gain.connect(ctx.destination);
          oscillator.start(at);
          oscillator.stop(end + 0.02);
        }
      } catch {
        /* the finished state on screen is the fallback */
      }
    },

    dispose() {
      const ctx = context;
      context = null;
      if (!ctx) return;
      try {
        void ctx.close().catch(() => undefined);
      } catch {
        /* closing a context that is already gone is not an error worth raising */
      }
    },
  };
}
