/**
 * The prototype map's geometry.
 *
 * These coordinates were measured off the artwork by eye, so they cannot be
 * proved correct here — what *can* be proved is that all eighteen exist, that
 * none has drifted off the board, that no two landmarks have been given the same
 * spot. A bad number
 * typed into `mapLayout.ts` shows up as a station sitting in empty forest, which
 * is the one class of bug a reader cannot see in a diff.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { PROGRESSION_SEQUENCE, TOTAL_STATIONS } from '../constants.ts';
import { ACTIVE_MAP } from './game.ts';
import {
  MAP_DESIGN_FRAME,
  STATION_HOTSPOTS,
  mapHotspotFor,
} from './mapLayout.ts';
import { STATIONS } from './stations.ts';

const ORDERS = Array.from({ length: TOTAL_STATIONS }, (_, i) => i + 1);

/**
 * What is actually drawn at each place, in the order the couple walk it.
 * This is the list the brief was written against, and it is the reason a wrong
 * hotspot is caught here rather than on someone's phone.
 */
const JOURNEY_LANDMARKS: readonly [number, string][] = [
  [1, 'bird'],
  [3, 'flowers'],
  [2, 'gnome'],
  [4, 'stone'],
  [5, 'campfire'],
  [6, 'fairy'],
  [7, 'butterflies'],
  [8, 'spirit'],
  [9, 'demons'],
  [10, 'river'],
  [11, 'raft'],
  [13, 'vision-tree'],
  [12, 'time-circle'],
  [14, 'star'],
  [15, 'lake'],
  [16, 'book'],
  [17, 'unicorn'],
  [18, 'gate'],
];

describe('the board', () => {
  test('is the shape of the artwork that is actually shipped', () => {
    assert.deepEqual(MAP_DESIGN_FRAME, { width: 941, height: 1672 });
  });

  test('every station has a hotspot', () => {
    for (const order of ORDERS) {
      assert.ok(STATION_HOTSPOTS[order], `station ${order} has no hotspot`);
      assert.doesNotThrow(() => mapHotspotFor(order));
    }
    assert.equal(Object.keys(STATION_HOTSPOTS).length, TOTAL_STATIONS);
  });

  test('mapHotspotFor refuses a station that does not exist', () => {
    for (const bad of [0, 19, -1, 1.5]) {
      assert.throws(() => mapHotspotFor(bad), /No hotspot/);
    }
  });

  test('nothing sits off the board', () => {
    for (const order of ORDERS) {
      const { position, marker, size } = mapHotspotFor(order);
      for (const [name, point] of [
        ['position', position],
        ['marker', marker],
      ] as const) {
        assert.ok(point.x > 0 && point.x < 100, `station ${order} ${name}.x is off the board`);
        assert.ok(point.y > 0 && point.y < 100, `station ${order} ${name}.y is off the board`);
      }
      // Big enough to be a comfortable target on a 320px board, small enough not
      // to blanket a quarter of the map.
      assert.ok(size >= 10 && size <= 25, `station ${order} has an implausible size: ${size}`);
    }
  });

  test('the couple never stand on the landmark they are being asked to tap', () => {
    for (const order of ORDERS) {
      const { position, marker } = mapHotspotFor(order);
      const dx = Math.abs(position.x - marker.x);
      const dy = Math.abs(position.y - marker.y);
      assert.ok(dx > 1 || dy > 1, `station ${order}: the marker sits on top of its landmark`);
    }
  });

  test('no two landmarks were given the same spot', () => {
    const seen = new Map<string, number>();
    for (const order of ORDERS) {
      const { position } = mapHotspotFor(order);
      const key = `${position.x},${position.y}`;
      const clash = seen.get(key);
      assert.equal(clash, undefined, `stations ${clash} and ${order} share a coordinate`);
      seen.set(key, order);
    }
  });

  test('consecutive legs are far enough apart to tell apart', () => {
    // Measured in units of the board's WIDTH, which is what the hotspot's size
    // is a percentage of; the board is 1.777x taller than it is wide.
    const ratio = MAP_DESIGN_FRAME.height / MAP_DESIGN_FRAME.width;
    for (let leg = 1; leg < TOTAL_STATIONS; leg += 1) {
      const a = mapHotspotFor(PROGRESSION_SEQUENCE[leg - 1]!).position;
      const b = mapHotspotFor(PROGRESSION_SEQUENCE[leg]!).position;
      const distance = Math.hypot(a.x - b.x, (a.y - b.y) * ratio);
      assert.ok(distance > 8, `legs ${leg} and ${leg + 1} are only ${distance.toFixed(1)} apart`);
    }
  });
});

describe('the journey and the artwork agree', () => {
  test('all 18 landmarks are mapped, in the approved order', () => {
    assert.deepEqual(
      PROGRESSION_SEQUENCE.map((order) => [order, mapHotspotFor(order).landmark]),
      JOURNEY_LANDMARKS.map(([order, landmark]) => [order, landmark]),
    );
  });

  test("a landmark's name matches the station whose artwork it is", () => {
    // Each station's background asset is named after its scene, so the landmark
    // label and the station's own asset must contain the same word. This is what
    // catches two hotspots being swapped.
    const expected: Readonly<Record<string, string>> = {
      bird: 'bird',
      gnome: 'gnome',
      flowers: 'flowers',
      stone: 'stone',
      campfire: 'bonfire',
      fairy: 'fairy',
      butterflies: 'butterflies',
      spirit: 'spirit',
      demons: 'demons',
      river: 'river',
      raft: 'raft',
      'time-circle': 'time-circle',
      'vision-tree': 'vision-tree',
      star: 'star',
      lake: 'lake',
      book: 'book',
      unicorn: 'unicorn',
      gate: 'gate',
    };
    for (const station of STATIONS) {
      const { landmark } = station.mapHotspot;
      const word = expected[landmark];
      assert.ok(word, `unknown landmark '${landmark}' on station ${station.order}`);
      assert.match(
        station.background,
        new RegExp(word),
        `station ${station.order} is drawn as '${landmark}' but its scene is ${station.background}`,
      );
    }
  });
});

describe('the active map', () => {
  test('is the illustrated board, and it is the only one', () => {
    assert.equal(ACTIVE_MAP.background, 'map-forest-prototype');
    assert.deepEqual(ACTIVE_MAP.designFrame, MAP_DESIGN_FRAME);
    // The classic variant is gone: no `variant` discriminator, and no second
    // set of coordinates to pick between.
    assert.equal('variant' in ACTIVE_MAP, false);
  });

  test('every station carries the one set of coordinates the map needs', () => {
    for (const station of STATIONS) {
      assert.ok(station.mapHotspot, `station ${station.order} lost its hotspot`);
      assert.equal('mapPosition' in station, false, `station ${station.order} kept a classic position`);
      assert.equal('icon' in station, false, `station ${station.order} kept a classic icon`);
    }
  });

  test('still shows the couple', () => {
    assert.equal(ACTIVE_MAP.marker, 'map-couple-silhouette');
  });
});
