/**
 * Reducer-level enforcement. The point of these tests is that the access rules
 * hold even when the UI dispatches something it should not have.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { PROGRESSION_SEQUENCE, TOTAL_STATIONS } from '../constants.ts';
import type { GameAction, GameState } from '../types/state.ts';
import { STATIONS } from '../data/stations.ts';
import { createGameReducer, createInitialState, DEFAULT_GAME_RULES } from './reducer.ts';

const clock = () => '2026-01-01T00:00:00.000Z';
const reducer = createGameReducer(DEFAULT_GAME_RULES, clock);

const run = (state: GameState, actions: GameAction[]): GameState =>
  actions.reduce(reducer, state);

const started = (): GameState =>
  run(createInitialState(DEFAULT_GAME_RULES, clock), [
    { type: 'START_NEW' },
    { type: 'COMPLETE_INTRO' },
  ]);

/**
 * The journey, as an array. `nth(1)` is the station played first, which is not
 * the same thing as station 1 once the route stops matching the numbering.
 */
const JOURNEY = PROGRESSION_SEQUENCE;
const nth = (n: number): number => JOURNEY[n - 1]!;

/** Walk the first n legs of the journey legitimately: open, then complete. */
function playThrough(n: number): GameState {
  let state = started();
  for (let leg = 1; leg <= n; leg += 1) {
    state = run(state, [
      { type: 'OPEN_STATION', stationOrder: nth(leg) },
      { type: 'COMPLETE_STATION', stationOrder: nth(leg) },
    ]);
  }
  return state;
}

describe('entry and intro', () => {
  test('starts on the title screen, unhydrated', () => {
    const state = createInitialState(DEFAULT_GAME_RULES, clock);
    assert.equal(state.route.name, 'title');
    assert.equal(state.hydrated, false);
    assert.equal(state.progress.gameStarted, false);
  });

  test('gameStarted flips on reaching the map, not on START_NEW', () => {
    const afterStart = reducer(createInitialState(DEFAULT_GAME_RULES, clock), { type: 'START_NEW' });
    assert.equal(afterStart.route.name, 'flow');
    assert.equal(afterStart.progress.gameStarted, false, 'not yet');

    const afterIntro = reducer(afterStart, { type: 'COMPLETE_INTRO' });
    assert.equal(afterIntro.progress.gameStarted, true);
    assert.equal(afterIntro.route.name, 'map');
  });

  test('RESUME replays the intro when the map was never reached', () => {
    const state = reducer(createInitialState(DEFAULT_GAME_RULES, clock), { type: 'RESUME' });
    assert.equal(state.route.name, 'flow');
  });

  test('RESUME goes to the map once the game is really started', () => {
    const state = reducer(started(), { type: 'GO_TO_TITLE' });
    assert.equal(reducer(state, { type: 'RESUME' }).route.name, 'map');
  });

  test('7a. a station cannot be opened before the intro is finished', () => {
    const state = reducer(createInitialState(DEFAULT_GAME_RULES, clock), { type: 'START_NEW' });
    const after = reducer(state, { type: 'OPEN_STATION', stationOrder: 1 });
    assert.equal(after, state, 'rejected — same reference');
  });
});

describe('7. locked stations are rejected by the reducer', () => {
  test('opening a locked station is a no-op even if the UI dispatches it', () => {
    const state = started();
    for (const order of [2, 3, 10, TOTAL_STATIONS]) {
      const after = reducer(state, { type: 'OPEN_STATION', stationOrder: order });
      assert.equal(after, state, `station ${order} must be rejected`);
      assert.equal(after.route.name, 'map');
    }
  });

  test('completing a locked station cannot skip the queue', () => {
    const state = started();
    const after = reducer(state, { type: 'COMPLETE_STATION', stationOrder: 7 });
    assert.equal(after, state);
    assert.deepEqual(after.progress.completedStations, []);
    assert.equal(after.progress.currentStation, nth(1));
  });

  test('a station two legs ahead is still refused after legitimate progress', () => {
    const state = playThrough(4);
    assert.equal(state.progress.currentStation, nth(5));
    const after = reducer(state, { type: 'OPEN_STATION', stationOrder: nth(6) });
    assert.equal(after, state);
  });

  test('a station that is merely numbered next is refused when it is not next', () => {
    // Station 2 is the second NUMBER and the third PLACE. After station 1 the
    // map offers station 3, and dispatching 2 must be refused outright.
    const state = playThrough(1);
    assert.equal(state.progress.currentStation, 3);
    assert.equal(reducer(state, { type: 'OPEN_STATION', stationOrder: 2 }), state);
    assert.equal(reducer(state, { type: 'COMPLETE_STATION', stationOrder: 2 }), state);
  });
});

describe('completion via the explicit action', () => {
  test('opening the active station enters play mode', () => {
    const state = reducer(started(), { type: 'OPEN_STATION', stationOrder: 1 });
    assert.equal(state.route.name, 'station');
    if (state.route.name !== 'station') throw new Error('unreachable');
    assert.equal(state.route.stationOrder, 1);
    assert.equal(state.route.step, 0);
    assert.equal(state.route.mode, 'play');
  });

  test('completing returns to the map and unlocks the next station', () => {
    const state = playThrough(1);
    assert.equal(state.route.name, 'map');
    assert.deepEqual(state.progress.completedStations, [1]);
    assert.equal(state.progress.currentStation, 3, 'the journey goes 1 → 3');
  });

  test('BACK_TO_MAP leaves a station without completing it', () => {
    const open = reducer(started(), { type: 'OPEN_STATION', stationOrder: 1 });
    const back = reducer(open, { type: 'BACK_TO_MAP' });
    assert.equal(back.route.name, 'map');
    assert.equal(back.progress, open.progress, 'progress object untouched');
    assert.deepEqual(back.progress.completedStations, []);
  });

  test('exiting an automatically opened station keeps it current and playable', () => {
    // Complete the first station, then simulate the map's automatic hand-off to
    // the newly unlocked station 3.
    let state = playThrough(1);
    state = reducer(state, { type: 'OPEN_STATION', stationOrder: 3 });
    assert.equal(state.route.name, 'station');

    // Leaving early is navigation only: station 3 is neither completed nor
    // skipped, and reopening it starts a normal play visit.
    state = reducer(state, { type: 'BACK_TO_MAP' });
    assert.equal(state.route.name, 'map');
    assert.equal(state.progress.currentStation, 3);
    assert.deepEqual(state.progress.completedStations, [1]);

    state = reducer(state, { type: 'OPEN_STATION', stationOrder: 3 });
    assert.equal(state.route.name, 'station');
    if (state.route.name !== 'station') throw new Error('unreachable');
    assert.equal(state.route.mode, 'play');

    state = reducer(state, { type: 'COMPLETE_STATION', stationOrder: 3 });
    assert.equal(state.progress.currentStation, 2, 'the automatic journey resumes normally');
    assert.deepEqual(state.progress.completedStations, [1, 3]);
  });
});

describe('revisits do not modify progression', () => {
  test('5. revisiting station 3 while on station 13 keeps progress at 13', () => {
    const state = playThrough(11);
    assert.equal(state.progress.currentStation, 13);

    const opened = reducer(state, { type: 'OPEN_STATION', stationOrder: 3 });
    assert.equal(opened.route.name, 'station');
    if (opened.route.name !== 'station') throw new Error('unreachable');
    assert.equal(opened.route.mode, 'revisit', 'opens in revisit mode');

    const done = reducer(opened, { type: 'COMPLETE_STATION', stationOrder: 3 });
    assert.equal(done.route.name, 'map');
    assert.equal(done.progress.currentStation, 13, 'must not rewind to 2');
    assert.equal(done.progress, state.progress, 'progress object is identical');
  });

  test('4 & 6. repeated revisits never duplicate or reduce anything', () => {
    let state = playThrough(9);
    const before = state.progress;

    for (const order of [1, 4, 9, 4, 1]) {
      state = run(state, [
        { type: 'OPEN_STATION', stationOrder: order },
        { type: 'COMPLETE_STATION', stationOrder: order },
      ]);
    }

    assert.equal(state.progress, before, 'progress never changed');
    assert.deepEqual(state.progress.completedStations, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    assert.equal(state.progress.currentStation, 10);
  });

  test('revisiting the last place does not re-enter the ending', () => {
    let state = playThrough(TOTAL_STATIONS);
    assert.equal(state.route.name, 'ending');

    const last = nth(TOTAL_STATIONS);
    state = run(state, [
      { type: 'BACK_TO_MAP' },
      { type: 'OPEN_STATION', stationOrder: last },
      { type: 'COMPLETE_STATION', stationOrder: last },
    ]);
    assert.equal(state.route.name, 'map', 'revisit returns to the map, not the ending');
    assert.equal(state.progress.gameCompleted, true);
  });
});

describe('8. finishing the game', () => {
  test('completing the last leg sets gameCompleted and routes to the ending', () => {
    const state = playThrough(TOTAL_STATIONS);
    assert.equal(state.progress.gameCompleted, true);
    assert.equal(state.progress.currentStation, TOTAL_STATIONS + 1);
    assert.equal(state.route.name, 'ending');
  });

  test('the game is not complete one station early', () => {
    const state = playThrough(TOTAL_STATIONS - 1);
    assert.equal(state.progress.gameCompleted, false);
    assert.equal(state.route.name, 'map');
  });
});

describe('9. invalid actions cannot corrupt state', () => {
  test('unknown action types are ignored', () => {
    const state = playThrough(3);
    const after = reducer(state, { type: 'NOT_A_REAL_ACTION' } as unknown as GameAction);
    assert.equal(after, state);
  });

  test('out-of-range station orders are ignored', () => {
    const state = playThrough(3);
    for (const bad of [0, -5, 19, 999, 2.5, Number.NaN]) {
      assert.equal(reducer(state, { type: 'OPEN_STATION', stationOrder: bad }), state);
      assert.equal(reducer(state, { type: 'COMPLETE_STATION', stationOrder: bad }), state);
    }
  });

  test('step actions outside a stepped route are ignored', () => {
    const state = playThrough(2);
    assert.equal(state.route.name, 'map');
    assert.equal(reducer(state, { type: 'NEXT_STEP' }), state);
    assert.equal(reducer(state, { type: 'PREV_STEP' }), state);
  });

  test('steps clamp at both ends', () => {
    const open = reducer(started(), { type: 'OPEN_STATION', stationOrder: 1 });
    assert.equal(reducer(open, { type: 'PREV_STEP' }), open, 'cannot go below zero');

    const advanced = reducer(open, { type: 'NEXT_STEP', stepCount: 2 });
    if (advanced.route.name !== 'station') throw new Error('unreachable');
    assert.equal(advanced.route.step, 1);

    assert.equal(
      reducer(advanced, { type: 'NEXT_STEP', stepCount: 2 }),
      advanced,
      'cannot run past the last step',
    );
  });

  test('a full legal playthrough keeps every invariant', () => {
    let state = started();
    for (let leg = 1; leg <= TOTAL_STATIONS; leg += 1) {
      assert.equal(state.progress.currentStation, nth(leg));
      state = run(state, [
        { type: 'OPEN_STATION', stationOrder: nth(leg) },
        { type: 'COMPLETE_STATION', stationOrder: nth(leg) },
      ]);
      const { completedStations } = state.progress;
      assert.equal(new Set(completedStations).size, completedStations.length);
      assert.deepEqual(completedStations, [...completedStations].sort((a, b) => a - b));
      assert.equal(completedStations.length, leg);
    }
    assert.equal(state.progress.gameCompleted, true);
  });
});

describe('the whole journey, station by station', () => {
  test('all 18 stations play in journey order using their real step counts', () => {
    let state = started();

    for (const order of JOURNEY) {
      const station = STATIONS.find((s) => s.order === order)!;
      // The map only ever offers this one station.
      assert.equal(state.route.name, 'map', `before station ${station.order}`);
      assert.equal(state.progress.currentStation, station.order);

      state = reducer(state, { type: 'OPEN_STATION', stationOrder: station.order });
      assert.equal(state.route.name, 'station');
      if (state.route.name !== 'station') throw new Error('unreachable');
      assert.equal(state.route.mode, 'play');

      // Walk every step the station actually declares.
      for (let step = 0; step < station.steps.length - 1; step += 1) {
        state = reducer(state, { type: 'NEXT_STEP', stepCount: station.steps.length });
        if (state.route.name !== 'station') throw new Error('unreachable');
        assert.equal(state.route.step, step + 1, `${station.id} step ${step + 1}`);
      }

      // Running past the last step is refused; only the CTA completes.
      const atEnd = state;
      state = reducer(state, { type: 'NEXT_STEP', stepCount: station.steps.length });
      assert.equal(state, atEnd, `${station.id} cannot overrun its steps`);

      state = reducer(state, { type: 'COMPLETE_STATION', stationOrder: station.order });
      assert.ok(state.progress.completedStations.includes(station.order));
    }

    assert.equal(state.progress.completedStations.length, TOTAL_STATIONS);
    assert.equal(state.progress.gameCompleted, true);
    assert.equal(state.route.name, 'ending', 'station 18 leads to the ending, not the map');
  });

  test('the ending can be left and replayed', () => {
    let state = playThrough(TOTAL_STATIONS);
    assert.equal(state.route.name, 'ending');

    // Leaving the ending returns to a fully completed map.
    state = reducer(state, { type: 'BACK_TO_MAP' });
    assert.equal(state.route.name, 'map');
    assert.equal(state.progress.gameCompleted, true);

    // Replay clears everything and starts over at the title.
    state = reducer(state, { type: 'RESTART_CONFIRMED' });
    assert.equal(state.route.name, 'title');
    assert.equal(state.progress.gameCompleted, false);
    assert.deepEqual(state.progress.completedStations, []);
  });

  test('a finished game still lets every station be revisited read-only', () => {
    const finished = playThrough(TOTAL_STATIONS);
    for (const station of STATIONS) {
      const opened = reducer(finished, { type: 'OPEN_STATION', stationOrder: station.order });
      assert.equal(opened.route.name, 'station', station.id);
      if (opened.route.name !== 'station') throw new Error('unreachable');
      assert.equal(opened.route.mode, 'revisit', station.id);

      const done = reducer(opened, { type: 'COMPLETE_STATION', stationOrder: station.order });
      assert.equal(done.progress, finished.progress, `${station.id} must not alter progress`);
      assert.equal(done.route.name, 'map', 'a revisit returns to the map, never the ending');
    }
  });
});

describe('restart', () => {
  test('RESTART_CONFIRMED clears progress and returns to the title', () => {
    const state = playThrough(6);
    const after = reducer(state, { type: 'RESTART_CONFIRMED' });
    assert.equal(after.route.name, 'title');
    assert.equal(after.progress.gameStarted, false);
    assert.equal(after.progress.currentStation, nth(1));
    assert.deepEqual(after.progress.completedStations, []);
    assert.equal(after.progress.gameCompleted, false);
  });

  test('START_NEW discards an existing game', () => {
    const state = playThrough(6);
    const after = reducer(state, { type: 'START_NEW' });
    assert.deepEqual(after.progress.completedStations, []);
    assert.equal(after.route.name, 'flow');
  });
});

describe('hydration', () => {
  test('HYDRATE with null falls back to a fresh game', () => {
    const state = reducer(createInitialState(DEFAULT_GAME_RULES, clock), {
      type: 'HYDRATE',
      progress: null,
    });
    assert.equal(state.hydrated, true);
    assert.equal(state.progress.currentStation, nth(1));
  });

  test('HYDRATE adopts a saved game', () => {
    const saved = playThrough(5).progress;
    const state = reducer(createInitialState(DEFAULT_GAME_RULES, clock), {
      type: 'HYDRATE',
      progress: saved,
    });
    assert.equal(state.hydrated, true);
    assert.equal(state.progress.currentStation, nth(6));
    assert.equal(reducer(state, { type: 'RESUME' }).route.name, 'map');
  });
});

describe('reopening the ending', () => {
  test('OPEN_ENDING is refused while the journey is unfinished', () => {
        const state = reducer(createInitialState(DEFAULT_GAME_RULES), { type: 'COMPLETE_INTRO' });
    assert.equal(state.route.name, 'map');
    const after = reducer(state, { type: 'OPEN_ENDING' });
    assert.equal(after, state, 'refusing must not produce a new state object');
  });

  test('a finished journey can return to the ending after leaving it', () => {
        let state = reducer(createInitialState(DEFAULT_GAME_RULES), { type: 'COMPLETE_INTRO' });
    for (const order of JOURNEY) {
      state = reducer(state, { type: 'OPEN_STATION', stationOrder: order });
      state = reducer(state, { type: 'COMPLETE_STATION', stationOrder: order });
    }
    assert.equal(state.route.name, 'ending');

    state = reducer(state, { type: 'BACK_TO_MAP' });
    assert.equal(state.route.name, 'map');

    // Without this the ending became unreachable for good once you left it.
    state = reducer(state, { type: 'OPEN_ENDING' });
    assert.equal(state.route.name, 'ending');
    assert.equal(state.progress.completedStations.length, TOTAL_STATIONS);
  });
});
