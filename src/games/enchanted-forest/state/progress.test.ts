/**
 * Progression rules. Covers required cases 1-6 and 8 at the pure-function level;
 * `reducer.test.ts` covers the same rules at the dispatch level.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { PROGRESSION_SEQUENCE, TOTAL_STATIONS } from '../constants.ts';
import type { Progress } from '../types/state.ts';
import {
  applyStationCompletion,
  autoAdvanceTarget,
  canEnterStation,
  completedCount,
  createInitialProgress,
  hasResumableProgress,
  isValidStationOrder,
  markGameStarted,
  normalizeCompletedStations,
  stationMode,
  stationState,
} from './progress.ts';
import { nextInSequence, nextOpenStation, validateSequence } from './sequence.ts';

const clock = () => '2026-01-01T00:00:00.000Z';

const fresh = (): Progress => createInitialProgress(1, clock);

/** The journey, as an array: PROGRESSION_SEQUENCE[0] is played first. */
const JOURNEY = PROGRESSION_SEQUENCE;

/** The station played nth (1-based), which is NOT the station numbered n. */
const nth = (n: number): number => JOURNEY[n - 1]!;

/** Walk the first n legs of the journey — the only legal way to advance. */
function progressThrough(n: number): Progress {
  let progress = markGameStarted(fresh(), clock);
  for (let leg = 1; leg <= n; leg += 1) {
    progress = applyStationCompletion(progress, nth(leg), TOTAL_STATIONS, clock);
  }
  return progress;
}

describe('the journey', () => {
  test('is a permutation of the 18 stations — nothing lost, nothing twice', () => {
    assert.deepEqual(validateSequence(), []);
    assert.deepEqual([...JOURNEY].sort((a, b) => a - b), [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
    ]);
  });

  test('is the approved route: 3 before 2, and 13 before 12', () => {
    assert.deepEqual(
      [...JOURNEY],
      [1, 3, 2, 4, 5, 6, 7, 8, 9, 10, 11, 13, 12, 14, 15, 16, 17, 18],
    );
  });
});

describe('initial state', () => {
  test('1. the first station of the journey is initially accessible', () => {
    const progress = fresh();
    assert.equal(progress.currentStation, nth(1));
    assert.equal(stationState(nth(1), progress), 'active');
    assert.equal(canEnterStation(nth(1), progress), true);
  });

  test('2. every other station is initially locked', () => {
    const progress = fresh();
    for (let order = 1; order <= TOTAL_STATIONS; order += 1) {
      if (order === nth(1)) continue;
      assert.equal(stationState(order, progress), 'locked', `station ${order}`);
      assert.equal(canEnterStation(order, progress), false, `station ${order}`);
    }
  });

  test('station 2 is locked at the start even though it is numbered second', () => {
    const progress = fresh();
    assert.equal(stationState(2, progress), 'locked');
    assert.equal(canEnterStation(2, progress), false);
  });

  test('a fresh game stores nothing but defaults', () => {
    const progress = fresh();
    assert.equal(progress.gameStarted, false);
    assert.equal(progress.gameCompleted, false);
    assert.deepEqual(progress.completedStations, []);
    assert.equal(hasResumableProgress(progress), false);
  });
});

describe('unlocking', () => {
  test('3. completing a station unlocks the next one in the journey', () => {
    let progress = fresh();
    for (let leg = 1; leg < TOTAL_STATIONS; leg += 1) {
      const order = nth(leg);
      progress = applyStationCompletion(progress, order, TOTAL_STATIONS, clock);
      assert.equal(stationState(order, progress), 'completed', `station ${order} completed`);
      assert.equal(stationState(nth(leg + 1), progress), 'active', `leg ${leg + 1} active`);
      if (leg + 2 <= TOTAL_STATIONS) {
        assert.equal(stationState(nth(leg + 2), progress), 'locked', `leg ${leg + 2} locked`);
      }
    }
  });

  test('the two re-ordered legs unlock their neighbour, not their successor', () => {
    const afterOne = applyStationCompletion(fresh(), 1, TOTAL_STATIONS, clock);
    assert.equal(stationState(3, afterOne), 'active', 'station 1 hands over to 3');
    assert.equal(stationState(2, afterOne), 'locked', 'station 2 waits its turn');

    const afterEleven = progressThrough(11);
    assert.equal(afterEleven.currentStation, 13, 'station 11 hands over to 13');
    assert.equal(stationState(12, afterEleven), 'locked', 'station 12 waits its turn');
  });

  test('completing a locked station is rejected and changes nothing', () => {
    const progress = fresh();
    const after = applyStationCompletion(progress, 5, TOTAL_STATIONS, clock);
    assert.equal(after, progress, 'same reference — no change at all');
    assert.deepEqual(after.completedStations, []);
    assert.equal(after.currentStation, nth(1));
  });

  test('only one station is ever active', () => {
    const progress = progressThrough(7);
    const active = Array.from({ length: TOTAL_STATIONS }, (_, i) => i + 1).filter(
      (order) => stationState(order, progress) === 'active',
    );
    assert.deepEqual(active, [nth(8)]);
  });
});

describe('revisits — the rewind edge case', () => {
  test('4. completing an already-completed station does not reduce progress', () => {
    const progress = progressThrough(12);
    assert.equal(progress.currentStation, nth(13));

    const after = applyStationCompletion(progress, 5, TOTAL_STATIONS, clock);
    assert.equal(after.currentStation, nth(13));
    assert.equal(after, progress, 'no-op returns the same reference');
  });

  test('5. revisiting station 3 while on station 13 keeps progress at station 13', () => {
    const progress = progressThrough(11);
    assert.equal(progress.currentStation, 13, 'precondition: standing on station 13');

    assert.equal(stationState(3, progress), 'completed');
    assert.equal(canEnterStation(3, progress), true, 'revisit is allowed');
    assert.equal(stationMode(3, progress), 'revisit');

    const after = applyStationCompletion(progress, 3, TOTAL_STATIONS, clock);

    assert.equal(after.currentStation, 13, 'currentStation must NOT rewind to 2');
    assert.equal(after.gameCompleted, false);
    assert.deepEqual(after.completedStations, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  test('6. revisiting does not duplicate or corrupt completedStations', () => {
    let progress = progressThrough(6);
    const before = [...progress.completedStations];

    for (const order of [1, 3, 6, 3, 1]) {
      progress = applyStationCompletion(progress, order, TOTAL_STATIONS, clock);
    }

    assert.deepEqual(progress.completedStations, before);
    assert.equal(
      new Set(progress.completedStations).size,
      progress.completedStations.length,
      'no duplicates',
    );
    const sorted = [...progress.completedStations].sort((a, b) => a - b);
    assert.deepEqual(progress.completedStations, sorted, 'still ascending');
    assert.equal(progress.currentStation, nth(7));
  });

  test('a completed station stays enterable, a locked one does not', () => {
    const progress = progressThrough(4);
    assert.equal(canEnterStation(nth(2), progress), true, 'completed');
    assert.equal(canEnterStation(nth(5), progress), true, 'active');
    assert.equal(canEnterStation(nth(6), progress), false, 'locked');
  });

  test('completedStations is stored by station number, not by leg', () => {
    // The set is the record of which PLACES were visited; the journey's order
    // lives in the sequence, not in the save.
    const progress = progressThrough(3);
    assert.deepEqual(progress.completedStations, [1, 2, 3], 'sorted by station number');
    assert.equal(progress.currentStation, 4);
  });
});

describe('game completion', () => {
  test('8. completing the last leg sets gameCompleted', () => {
    const progress = progressThrough(TOTAL_STATIONS);
    assert.equal(progress.gameCompleted, true);
    assert.equal(completedCount(progress), TOTAL_STATIONS);
    assert.equal(progress.currentStation, TOTAL_STATIONS + 1);
  });

  test('gameCompleted stays false until the very last leg', () => {
    const progress = progressThrough(TOTAL_STATIONS - 1);
    assert.equal(progress.gameCompleted, false);
    assert.equal(stationState(nth(TOTAL_STATIONS), progress), 'active');
  });

  test('no station is active once the game is complete', () => {
    const progress = progressThrough(TOTAL_STATIONS);
    for (let order = 1; order <= TOTAL_STATIONS; order += 1) {
      assert.equal(stationState(order, progress), 'completed');
    }
  });
});

describe('defensive input handling', () => {
  test('nextOpenStation is the single definition of "where you are"', () => {
    for (let leg = 0; leg <= TOTAL_STATIONS; leg += 1) {
      const progress = progressThrough(leg);
      assert.equal(
        progress.currentStation,
        nextOpenStation(progress.completedStations),
        `after ${leg} legs`,
      );
    }
  });

  test('9. out-of-range station orders are rejected', () => {
    const progress = progressThrough(3);
    for (const bad of [0, -1, 19, 999, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      assert.equal(isValidStationOrder(bad), false, `order ${bad}`);
      assert.equal(canEnterStation(bad, progress), false, `order ${bad}`);
      assert.equal(applyStationCompletion(progress, bad, TOTAL_STATIONS, clock), progress);
    }
  });

  test('normalizeCompletedStations repairs duplicates, order and junk', () => {
    assert.deepEqual(normalizeCompletedStations([3, 1, 3, 2, 1]), [1, 2, 3]);
    assert.deepEqual(normalizeCompletedStations([0, 19, -4, 2, 1.5]), [2]);
    assert.deepEqual(normalizeCompletedStations([]), []);
  });

  test('markGameStarted is idempotent', () => {
    const started = markGameStarted(fresh(), clock);
    assert.equal(started.gameStarted, true);
    assert.equal(markGameStarted(started, clock), started, 'same reference');
  });
});

describe('automatic chapter change', () => {
/** The progress a first-time completion of the `leg`th station produces. */
  const after = (leg: number): Progress =>
    applyStationCompletion(progressThrough(leg - 1), nth(leg), TOTAL_STATIONS, clock);

  test('finishing a station points at the one it just unlocked', () => {
    for (let leg = 1; leg < TOTAL_STATIONS; leg += 1) {
      const order = nth(leg);
      assert.equal(
        autoAdvanceTarget(order, 'play', after(leg), TOTAL_STATIONS),
        nextInSequence(order),
        `station ${order} should hand over to ${nextInSequence(order)}`,
      );
    }
  });

  test('the hand-over follows the journey, not the numbering', () => {
    assert.equal(autoAdvanceTarget(1, 'play', after(1), TOTAL_STATIONS), 3);
    assert.equal(autoAdvanceTarget(3, 'play', after(2), TOTAL_STATIONS), 2);
    assert.equal(autoAdvanceTarget(11, 'play', after(11), TOTAL_STATIONS), 13);
    assert.equal(autoAdvanceTarget(13, 'play', after(12), TOTAL_STATIONS), 12);
    assert.equal(autoAdvanceTarget(12, 'play', after(13), TOTAL_STATIONS), 14);
  });

  test('the target it names is actually open', () => {
    const progress = after(5);
    const target = autoAdvanceTarget(nth(5), 'play', progress, TOTAL_STATIONS);
    assert.equal(target, nth(6));
    assert.notEqual(stationState(target!, progress), 'locked');
  });

  test('the last leg hands over to the ending, never to a nineteenth station', () => {
    const progress = after(TOTAL_STATIONS);
    assert.equal(progress.gameCompleted, true);
    assert.equal(autoAdvanceTarget(nth(TOTAL_STATIONS), 'play', progress, TOTAL_STATIONS), null);
  });

  test('a revisit never advances anything', () => {
    const progress = progressThrough(TOTAL_STATIONS - 1);
    // Replaying station 3 changes nothing and must not pull them to station 4.
    assert.equal(stationMode(3, progress), 'revisit');
    assert.equal(autoAdvanceTarget(3, 'revisit', progress, TOTAL_STATIONS), null);
  });

  test('a revisit of the last-played station still does not advance', () => {
    const progress = progressThrough(6);
    assert.equal(autoAdvanceTarget(nth(6), 'revisit', progress, TOTAL_STATIONS), null);
  });

  test('a completed journey never advances, even from an earlier station', () => {
    const progress = after(TOTAL_STATIONS);
    assert.equal(autoAdvanceTarget(4, 'play', progress, TOTAL_STATIONS), null);
  });

  test('an out-of-range order is refused rather than guessed at', () => {
    const progress = after(5);
    assert.equal(autoAdvanceTarget(0, 'play', progress, TOTAL_STATIONS), null);
    assert.equal(autoAdvanceTarget(99, 'play', progress, TOTAL_STATIONS), null);
  });

  test('progress is already written before any hand-over is decided', () => {
    // The orchestration reads the progress a completion produces, so the save is
    // complete whether or not the animation that follows ever finishes.
    const progress = after(7);
    assert.ok(progress.completedStations.includes(nth(7)));
    assert.equal(progress.currentStation, nth(8));
    assert.equal(autoAdvanceTarget(nth(7), 'play', progress, TOTAL_STATIONS), nth(8));
  });
});
