/**
 * Persistence boundary: validation, repair and the store interface.
 * No browser APIs are involved — localStorage arrives in Milestone 3.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { PROGRESS_SCHEMA_VERSION, PROGRESSION_SEQUENCE, TOTAL_STATIONS } from '../constants.ts';
import { applyStationCompletion, createInitialProgress, markGameStarted } from './progress.ts';
import {
  createMemoryProgressStore,
  deserializeProgress,
  parseProgress,
  progressOrInitial,
  serializeProgress,
} from './persistence.ts';

const clock = () => '2026-01-01T00:00:00.000Z';

function saved(n: number) {
  let progress = markGameStarted(createInitialProgress(1, clock), clock);
  // Walk the first n legs of the JOURNEY. Completing 1..n numerically would
  // stall at the first re-ordered leg, because station 2 is not yet open.
  for (let leg = 1; leg <= n; leg += 1) {
    progress = applyStationCompletion(progress, PROGRESSION_SEQUENCE[leg - 1]!, TOTAL_STATIONS, clock);
  }
  return progress;
}

describe('round trip', () => {
  test('serialize then deserialize preserves progress', () => {
    const original = saved(7);
    const restored = deserializeProgress(serializeProgress(original));
    assert.deepEqual(restored, original);
  });

  test('a store returns what it was given', async () => {
    const store = createMemoryProgressStore();
    assert.equal(await store.load(), null);

    const progress = saved(3);
    await store.save(progress);
    assert.deepEqual(await store.load(), progress);

    await store.clear();
    assert.equal(await store.load(), null);
  });
});

describe('untrusted input', () => {
  test('junk is rejected rather than trusted', () => {
    for (const bad of [null, undefined, 42, 'x', [], true]) {
      assert.equal(parseProgress(bad), null, String(bad));
    }
  });

  test('malformed JSON never throws', () => {
    assert.equal(deserializeProgress('{not json'), null);
    assert.equal(deserializeProgress(''), null);
    assert.equal(deserializeProgress(null), null);
  });

  test('a save from a different schema version is rejected', () => {
    const progress = { ...saved(4), schemaVersion: 999 };
    assert.equal(parseProgress(progress), null);
  });
});

describe('repair', () => {
  test('duplicate and out-of-range completions are cleaned up', () => {
    const restored = parseProgress({
      schemaVersion: PROGRESS_SCHEMA_VERSION,
      contentVersion: 1,
      gameStarted: true,
      currentStation: 4,
      completedStations: [3, 1, 3, 2, 0, 99, -1],
      gameCompleted: false,
      updatedAt: clock(),
    });
    assert.ok(restored);
    assert.deepEqual(restored.completedStations, [1, 2, 3]);
  });

  test('a rewound currentStation is repaired from the completed set', () => {
    // The dangerous corruption: pointer behind the real progress.
    const restored = parseProgress({
      schemaVersion: PROGRESS_SCHEMA_VERSION,
      contentVersion: 1,
      gameStarted: true,
      currentStation: 2,
      completedStations: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      gameCompleted: false,
      updatedAt: clock(),
    });
    assert.ok(restored);
    // 13, not 12: stations 1..11 are the first eleven legs of the journey — the
    // 2/3 swap is inside that run — and the twelfth leg is station 13. This is
    // also the whole migration story for a save written under an older route:
    // nothing to convert, because the pointer is recomputed against whatever the
    // journey is now rather than being trusted from storage.
    assert.equal(restored.currentStation, 13, 'derived from the completed set, not trusted');
  });

  test('gameCompleted is re-derived, not trusted', () => {
    const lying = parseProgress({
      schemaVersion: PROGRESS_SCHEMA_VERSION,
      contentVersion: 1,
      gameStarted: true,
      currentStation: 3,
      completedStations: [1, 2],
      gameCompleted: true,
      updatedAt: clock(),
    });
    assert.ok(lying);
    assert.equal(lying.gameCompleted, false);

    const genuine = parseProgress({ ...saved(TOTAL_STATIONS), gameCompleted: false });
    assert.ok(genuine);
    assert.equal(genuine.gameCompleted, true);
  });

  test('missing fields fall back to safe defaults', () => {
    const restored = parseProgress({ schemaVersion: PROGRESS_SCHEMA_VERSION });
    assert.ok(restored);
    assert.equal(restored.gameStarted, false);
    assert.equal(restored.currentStation, PROGRESSION_SEQUENCE[0]);
    assert.deepEqual(restored.completedStations, []);
    assert.equal(restored.gameCompleted, false);
  });

  test('progressOrInitial always yields a usable object', () => {
    assert.equal(progressOrInitial(null).currentStation, PROGRESSION_SEQUENCE[0]);
    const progress = saved(2);
    assert.equal(progressOrInitial(progress), progress);
  });
});

describe('what is NOT stored', () => {
  test('progress contains only the approved fields', () => {
    const keys = Object.keys(saved(5)).sort();
    assert.deepEqual(keys, [
      'completedStations',
      'contentVersion',
      'currentStation',
      'gameCompleted',
      'gameStarted',
      'schemaVersion',
      'updatedAt',
    ]);
  });

  test('unknown fields in a save are dropped, never carried forward', () => {
    const restored = parseProgress({
      ...saved(3),
      coupleAnswers: ['something personal'],
      // The gnome's round records nothing by design — no score, no winner. If a
      // build ever starts writing who was pointed at, a save from it must not
      // bring that back.
      pointedAt: ['her', 'him', 'her'],
      currentStep: 2,
    });
    assert.ok(restored);
    assert.equal('coupleAnswers' in restored, false);
    assert.equal('pointedAt' in restored, false);
    assert.equal('currentStep' in restored, false);
  });
});
