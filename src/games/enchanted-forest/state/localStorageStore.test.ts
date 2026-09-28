/**
 * localStorage store: round trips, and the failure modes that must never crash
 * the game (private browsing, blocked site data, a full quota).
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  LEGACY_PROGRESS_STORAGE_KEYS,
  PROGRESS_STORAGE_KEY,
  PROGRESSION_SEQUENCE,
  STORAGE_NAMESPACE,
  TOTAL_STATIONS,
} from '../constants.ts';
import { applyStationCompletion, createInitialProgress, markGameStarted } from './progress.ts';
import { createLocalProgressStore, type StorageLike } from './localStorageStore.ts';

const clock = () => '2026-01-01T00:00:00.000Z';

function savedProgress(n: number) {
  let progress = markGameStarted(createInitialProgress(1, clock), clock);
  // Walk the first n legs of the JOURNEY. Completing 1..n numerically would
  // stall at the first re-ordered leg, because station 2 is not yet open.
  for (let leg = 1; leg <= n; leg += 1) {
    progress = applyStationCompletion(progress, PROGRESSION_SEQUENCE[leg - 1]!, TOTAL_STATIONS, clock);
  }
  return progress;
}

/** Minimal in-process stand-in for window.localStorage. */
function fakeStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

describe('happy path', () => {
  test('saves, reloads and clears', async () => {
    const storage = fakeStorage();
    const store = createLocalProgressStore(storage);
    assert.equal(store.persistent, true);

    assert.equal(await store.load(), null, 'nothing saved yet');

    const progress = savedProgress(4);
    await store.save(progress);
    assert.deepEqual(await store.load(), progress);

    await store.clear();
    assert.equal(await store.load(), null);
  });

  test('writes under the namespaced key', async () => {
    const storage = fakeStorage();
    await createLocalProgressStore(storage).save(savedProgress(1));
    assert.equal(storage.data.has(PROGRESS_STORAGE_KEY), true);
    assert.match(PROGRESS_STORAGE_KEY, /enchanted-forest/);
  });

  test('a save survives a fresh store instance — this is what "resume" relies on', async () => {
    const storage = fakeStorage();
    await createLocalProgressStore(storage).save(savedProgress(6));

    const reopened = await createLocalProgressStore(storage).load();
    assert.ok(reopened);
    assert.equal(reopened.currentStation, 7);
    assert.equal(reopened.gameStarted, true);
  });
});

describe('never crashes the game', () => {
  test('no storage at all falls back to memory', async () => {
    const store = createLocalProgressStore(null);
    assert.equal(store.persistent, false);

    const progress = savedProgress(2);
    await store.save(progress);
    assert.deepEqual(await store.load(), progress, 'still works within the session');
  });

  test('a throwing setItem is swallowed', async () => {
    const storage: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {},
    };
    const store = createLocalProgressStore(storage);
    await assert.doesNotReject(() => store.save(savedProgress(1)));
  });

  test('a throwing getItem reads as "no save"', async () => {
    const storage: StorageLike = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {},
      removeItem: () => {},
    };
    assert.equal(await createLocalProgressStore(storage).load(), null);
  });

  test('corrupt stored JSON reads as "no save" rather than throwing', async () => {
    const storage = fakeStorage();
    storage.data.set(PROGRESS_STORAGE_KEY, '{ this is not json');
    assert.equal(await createLocalProgressStore(storage).load(), null);
  });

  test('a tampered save is repaired, not trusted', async () => {
    const storage = fakeStorage();
    storage.data.set(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({ ...savedProgress(9), currentStation: 2, gameCompleted: true }),
    );

    const restored = await createLocalProgressStore(storage).load();
    assert.ok(restored);
    assert.equal(restored.currentStation, 10, 're-derived from completedStations');
    assert.equal(restored.gameCompleted, false, 're-derived, not trusted');
  });
});

describe('what is written', () => {
  test('the stored payload contains no personal answers', async () => {
    const storage = fakeStorage();
    await createLocalProgressStore(storage).save(savedProgress(3));

    const raw = storage.data.get(PROGRESS_STORAGE_KEY);
    assert.ok(raw);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    assert.deepEqual(Object.keys(parsed).sort(), [
      'completedStations',
      'contentVersion',
      'currentStation',
      'gameCompleted',
      'gameStarted',
      'schemaVersion',
      'updatedAt',
    ]);
  });
});

/*
 * The storage namespace, and the migration onto it.
 *
 * On rotemadini.com this origin is shared with the rest of the site and with
 * whatever game ships next, so both halves matter: keys must be unmistakably
 * this game's, and a couple mid-journey when the prefix changed must not be sent
 * back to the trailhead.
 */
describe('the storage namespace', () => {
  test('every key is under rotem:<game id>:', () => {
    assert.equal(STORAGE_NAMESPACE, 'rotem:enchanted-forest');
    assert.ok(
      PROGRESS_STORAGE_KEY.startsWith(`${STORAGE_NAMESPACE}:`),
      `${PROGRESS_STORAGE_KEY} is outside the namespace`,
    );
  });

  test('is specific enough that another game could not collide with it', () => {
    // The failure this guards against is a generic key — 'progress', 'state',
    // 'game' — colliding with a second game on the same origin.
    assert.match(PROGRESS_STORAGE_KEY, /^rotem:enchanted-forest:progress:v\d+$/);
  });

  test('no legacy key is also a live key', () => {
    assert.equal(LEGACY_PROGRESS_STORAGE_KEYS.includes(PROGRESS_STORAGE_KEY), false);
  });
});

describe('migrating a save written under an older key', () => {
  const legacyKey = LEGACY_PROGRESS_STORAGE_KEYS[0]!;

  test('a couple mid-journey keep their progress across the rename', async () => {
    const storage = fakeStorage();
    const progress = savedProgress(7);
    storage.data.set(legacyKey, JSON.stringify(progress));

    const restored = await createLocalProgressStore(storage).load();
    assert.deepEqual(restored, progress, 'seven stations must survive the prefix change');
  });

  test('the old key is moved, not copied — nothing is orphaned', async () => {
    const storage = fakeStorage();
    storage.data.set(legacyKey, JSON.stringify(savedProgress(2)));

    await createLocalProgressStore(storage).load();

    assert.equal(storage.data.has(legacyKey), false, 'the old key must be removed');
    assert.equal(storage.data.has(PROGRESS_STORAGE_KEY), true, 'and rewritten under the new one');
  });

  test('a live save is never overwritten by a stale one', async () => {
    const storage = fakeStorage();
    const current = savedProgress(9);
    storage.data.set(PROGRESS_STORAGE_KEY, JSON.stringify(current));
    storage.data.set(legacyKey, JSON.stringify(savedProgress(1)));

    const restored = await createLocalProgressStore(storage).load();
    assert.deepEqual(restored, current, 'the current key wins');
  });

  test('a corrupt legacy value reads as "no save" rather than throwing', async () => {
    const storage = fakeStorage();
    storage.data.set(legacyKey, '{ not json at all');

    assert.equal(await createLocalProgressStore(storage).load(), null);
    assert.equal(storage.data.has(legacyKey), false, 'and it is still cleaned up');
  });
});

describe('clearing is scoped to this game', () => {
  test('a restart touches this game\u2019s keys and nothing else on the origin', async () => {
    const storage = fakeStorage();
    // Two neighbours that a `storage.clear()` would have destroyed: another
    // game's save, and the host site's own state.
    storage.data.set('rotem:some-other-game:progress:v1', 'not mine');
    storage.data.set('rotem:site:consent', 'granted');
    storage.data.set(LEGACY_PROGRESS_STORAGE_KEYS[0]!, 'stale');

    const store = createLocalProgressStore(storage);
    await store.save(savedProgress(3));
    await store.clear();

    assert.equal(storage.data.has(PROGRESS_STORAGE_KEY), false, 'this game is cleared');
    assert.equal(storage.data.has(LEGACY_PROGRESS_STORAGE_KEYS[0]!), false, 'and so is its past');
    assert.equal(storage.data.get('rotem:some-other-game:progress:v1'), 'not mine');
    assert.equal(storage.data.get('rotem:site:consent'), 'granted');
  });
});
