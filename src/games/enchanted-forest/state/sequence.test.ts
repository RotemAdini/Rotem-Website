/**
 * The journey as data.
 *
 * `progress.test.ts` proves the progression *rules* hold under the live route.
 * This file proves the route itself is well-formed, and that the rules still
 * hold under a route nobody has seen — because the point of splitting identity
 * from order of play is that the order can change again without any of this
 * breaking.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { PROGRESSION_SEQUENCE, TOTAL_STATIONS } from '../constants.ts';
import {
  DEFAULT_SEQUENCE,
  firstInSequence,
  journeyNumber,
  nextInSequence,
  nextOpenStation,
  previousInSequence,
  sequenceIndex,
  validateSequence,
} from './sequence.ts';

describe('the live journey', () => {
  test('is the approved route', () => {
    assert.deepEqual(
      [...PROGRESSION_SEQUENCE],
      [1, 3, 2, 4, 5, 6, 7, 8, 9, 10, 11, 13, 12, 14, 15, 16, 17, 18],
    );
    assert.equal(DEFAULT_SEQUENCE, PROGRESSION_SEQUENCE);
  });

  test('is structurally sound', () => {
    assert.deepEqual(validateSequence(), []);
  });

  test('starts at the bird and ends at the gate', () => {
    assert.equal(firstInSequence(), 1);
    assert.equal(nextInSequence(18), null, 'nothing comes after the last leg');
  });

  test('walks the two swaps and nothing else', () => {
    const swapped = PROGRESSION_SEQUENCE.filter((order, index) => order !== index + 1);
    assert.deepEqual([...swapped], [3, 2, 13, 12], 'only 2↔3 and 12↔13 moved');
  });
});

/*
 * The four numbers a player actually reads.
 *
 * Each of these has been "corrected" at least once by someone reading the
 * station id and assuming the display was wrong, so they are pinned by name
 * rather than left to be re-derived from the sequence. If this block and
 * `PROGRESSION_SEQUENCE` ever disagree, the sequence is what changed and the
 * change needs approval — see the warning on the constant.
 */
describe('what the couple are told a station is called', () => {
  const DISPLAYED: readonly [number, string, number][] = [
    [1, 'ציפור המוזיקה', 1],
    [3, 'פרחי הטוב', 2],
    [2, 'גמד הכימיה', 3],
    [13, 'עץ החזון', 12],
    [12, 'מעגל הזמן', 13],
    [18, 'שער הנשיקות', 18],
  ];

  for (const [order, name, shown] of DISPLAYED) {
    test(`${name} (order ${order}) is תחנה ${shown}`, () => {
      assert.equal(journeyNumber(order), shown);
    });
  }

  test('every station gets a distinct number from 1 to 18', () => {
    const shown = Array.from({ length: TOTAL_STATIONS }, (_, i) => journeyNumber(i + 1));
    assert.deepEqual(
      [...shown].sort((a, b) => a - b),
      Array.from({ length: TOTAL_STATIONS }, (_, i) => i + 1),
      'a duplicate or a gap here means two stations share a number on the map',
    );
  });
});

describe('navigating it', () => {
  test('next and previous are inverses everywhere they are defined', () => {
    for (const order of PROGRESSION_SEQUENCE) {
      const next = nextInSequence(order);
      if (next === null) continue;
      assert.equal(previousInSequence(next), order, `${order} → ${next} → back`);
    }
  });

  test('the re-ordered legs hand over across the swap', () => {
    assert.equal(nextInSequence(1), 3);
    assert.equal(nextInSequence(3), 2);
    assert.equal(nextInSequence(2), 4);
    assert.equal(nextInSequence(11), 13);
    assert.equal(nextInSequence(13), 12);
    assert.equal(nextInSequence(12), 14);
  });

  test('a station outside the journey navigates to nothing', () => {
    for (const bad of [0, 19, -3, 1.5]) {
      assert.equal(sequenceIndex(bad), -1);
      assert.equal(nextInSequence(bad), null);
      assert.equal(previousInSequence(bad), null);
    }
  });

  test('the first leg has nothing before it', () => {
    assert.equal(previousInSequence(firstInSequence()), null);
  });
});

describe('nextOpenStation', () => {
  test('an empty save stands at the trailhead', () => {
    assert.equal(nextOpenStation([]), 1);
  });

  test('walks the journey one leg at a time', () => {
    const completed: number[] = [];
    for (let leg = 0; leg < TOTAL_STATIONS; leg += 1) {
      assert.equal(nextOpenStation(completed), PROGRESSION_SEQUENCE[leg]);
      completed.push(PROGRESSION_SEQUENCE[leg]!);
    }
    assert.equal(nextOpenStation(completed), TOTAL_STATIONS + 1, 'journey finished');
  });

  test('ignores the order the completed set happens to be in', () => {
    assert.equal(nextOpenStation([3, 1]), 2, 'stations 1 and 3 done → station 2 is next');
    assert.equal(nextOpenStation([1, 3]), 2);
  });

  test('a gap in the middle is where you are, however far past it you look', () => {
    // Only reachable from a hand-edited save. The answer is the earliest
    // unfinished leg, not the furthest one reached.
    assert.equal(nextOpenStation([1, 3, 2, 4, 6, 7]), 5);
  });
});

describe('validateSequence catches a mis-edited route', () => {
  test('a duplicate strands a station', () => {
    const errors = validateSequence([1, 1, 3], 3);
    assert.ok(errors.some((e) => /twice/.test(e)));
    assert.ok(errors.some((e) => /missing station 2/.test(e)));
  });

  test('a short route is refused', () => {
    assert.ok(validateSequence([1, 2], 3).some((e) => /expected 3/.test(e)));
  });

  test('an out-of-range entry is refused', () => {
    assert.ok(validateSequence([1, 2, 99], 3).some((e) => /out-of-range/.test(e)));
  });

  test('any permutation of the right size is acceptable', () => {
    assert.deepEqual(validateSequence([3, 1, 2], 3), []);
  });
});
