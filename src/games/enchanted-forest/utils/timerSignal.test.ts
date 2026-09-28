/**
 * The completion signal for stations 14 and 18.
 *
 * What is actually being guarded here is not the sound — a sine wave cannot be
 * asserted usefully — but the contract that makes it reach a couple who are not
 * looking at the phone:
 *
 *   • the audio context is created and resumed by the START tap, because every
 *     browser refuses to start audio outside a user gesture and a countdown
 *     reaching zero is not one;
 *   • nothing throws on a device that supports none of it, because a phone with
 *     no Web Audio and no vibration must still finish the station.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  VIBRATION_PATTERN,
  createTimerSignal,
  type AudioContextLike,
  type GainLike,
  type OscillatorLike,
} from './timerSignal.ts';

interface Recorder {
  created: number;
  resumed: number;
  closed: number;
  oscillators: { hz: number; started: number; stopped: number }[];
}

function fakeAudio(options: { state?: string; throwOnConstruct?: boolean } = {}) {
  const log: Recorder = { created: 0, resumed: 0, closed: 0, oscillators: [] };

  class FakeContext implements AudioContextLike {
    currentTime = 0;
    state = options.state ?? 'suspended';
    destination = {};

    constructor() {
      if (options.throwOnConstruct) throw new Error('no audio on this device');
      log.created += 1;
    }

    createOscillator(): OscillatorLike {
      const entry = { hz: 0, started: -1, stopped: -1 };
      log.oscillators.push(entry);
      return {
        type: '',
        frequency: {
          setValueAtTime(value: number) {
            entry.hz = value;
          },
        },
        connect() {},
        start(when: number) {
          entry.started = when;
        },
        stop(when: number) {
          entry.stopped = when;
        },
      };
    }

    createGain(): GainLike {
      return {
        gain: {
          setValueAtTime() {},
          linearRampToValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        connect() {},
      };
    }

    async resume() {
      log.resumed += 1;
      this.state = 'running';
    }

    async close() {
      log.closed += 1;
    }
  }

  return { log, ctor: FakeContext as unknown as new () => AudioContextLike };
}

describe('timer completion signal', () => {
  test('arms the audio on the start tap, not when the countdown ends', () => {
    const { log, ctor } = fakeAudio();
    const signal = createTimerSignal({ audioContext: ctor });

    assert.equal(log.created, 0, 'nothing is constructed before the couple tap start');

    signal.prime();
    assert.equal(log.created, 1, 'the context is built inside the gesture');
    assert.equal(log.resumed, 1, 'and resumed there, which is what makes it audible later');

    signal.fire();
    assert.equal(log.created, 1, 'firing reuses the primed context');
  });

  test('plays a short rising phrase', () => {
    const { log, ctor } = fakeAudio();
    const signal = createTimerSignal({ audioContext: ctor });
    signal.prime();
    signal.fire();

    assert.equal(log.oscillators.length, 3, 'three notes');
    const pitches = log.oscillators.map((o) => o.hz);
    assert.deepEqual(
      pitches,
      [...pitches].sort((a, b) => a - b),
      'rising, so it reads as "finished" rather than as an alarm',
    );

    const last = log.oscillators[log.oscillators.length - 1];
    assert.ok(last);
    assert.ok(last.stopped > 0 && last.stopped < 1.5, 'the whole phrase is over inside 1.5s');
  });

  test('a phrase is never left half-scheduled when the context is dropped', () => {
    const { log, ctor } = fakeAudio();
    const signal = createTimerSignal({ audioContext: ctor });
    signal.prime();
    signal.dispose();
    assert.equal(log.closed, 1);

    // After disposal there is nothing to play, and asking for it is not an error.
    assert.doesNotThrow(() => signal.fire());
    assert.equal(log.oscillators.length, 0);
  });

  test('vibrates with a gentle two-pulse pattern', () => {
    const patterns: (number | number[])[] = [];
    const signal = createTimerSignal({
      vibrate: (pattern) => {
        patterns.push(pattern);
        return true;
      },
    });

    signal.prime();
    signal.fire();
    assert.deepEqual(patterns, [[...VIBRATION_PATTERN]]);
  });

  /*
   * The important case. iOS Safari has no `navigator.vibrate` at all, a locked-
   * down browser may have no AudioContext, and `vibrate` is allowed to throw.
   * None of that may stop the couple finishing the station, so every one of these
   * is a no-op rather than an error.
   */
  describe('degrades silently rather than failing the station', () => {
    test('with no capabilities whatsoever', () => {
      const signal = createTimerSignal({});
      assert.doesNotThrow(() => signal.prime());
      assert.doesNotThrow(() => signal.fire());
      assert.doesNotThrow(() => signal.dispose());
    });

    test('when constructing the audio context throws', () => {
      const { ctor } = fakeAudio({ throwOnConstruct: true });
      const signal = createTimerSignal({ audioContext: ctor });
      assert.doesNotThrow(() => signal.prime());
      assert.doesNotThrow(() => signal.fire());
    });

    test('when vibrate throws, the chime still plays', () => {
      const { log, ctor } = fakeAudio();
      const signal = createTimerSignal({
        audioContext: ctor,
        vibrate: () => {
          throw new Error('permissions policy');
        },
      });
      signal.prime();
      assert.doesNotThrow(() => signal.fire());
      assert.equal(log.oscillators.length, 3, 'a failed vibrate does not swallow the sound');
    });

    test('an already-running context is not resumed again', () => {
      const { log, ctor } = fakeAudio({ state: 'running' });
      const signal = createTimerSignal({ audioContext: ctor });
      signal.prime();
      assert.equal(log.resumed, 0);
    });
  });
});
