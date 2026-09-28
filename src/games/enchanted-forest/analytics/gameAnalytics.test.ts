/**
 * What the game actually reports.
 *
 * The bridge's own tests prove that free text cannot get through the sanitiser.
 * These prove the layer above it: that the six events carry the right numbers —
 * in particular the JOURNEY number rather than the station id — and that a real
 * station's Hebrew title never reaches an event even when a caller hands it one.
 */

import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';

import type { AnalyticsEventDetail } from '../../../shared/analytics/analyticsBridge.ts';
import { GAME_ID, TOTAL_STATIONS } from '../constants.ts';
import { STATIONS } from '../data/stations.ts';
import { journeyNumber } from '../state/sequence.ts';
import {
  journeyElapsedSeconds,
  reportFeedbackSubmit,
  reportGameComplete,
  reportGameRestart,
  reportGameResume,
  reportGameStart,
  reportStationComplete,
  resetJourneyClock,
} from './gameAnalytics.ts';

function recorder() {
  const seen: AnalyticsEventDetail[] = [];
  return {
    seen,
    target: {
      dispatchEvent(event: Event): boolean {
        seen.push((event as CustomEvent<AnalyticsEventDetail>).detail);
        return true;
      },
    },
  };
}

beforeEach(() => resetJourneyClock());

describe('every event identifies the game the same way', () => {
  test('always the canonical product id, never the URL slug', () => {
    const { seen, target } = recorder();
    reportGameStart({ target });
    reportGameResume(3, { target });
    reportStationComplete({ order: 1, slug: 'music-bird', stationsCompleted: 1 }, { target });
    reportGameComplete({ target });
    reportGameRestart(5, { target });
    reportFeedbackSubmit(4, 'sent', { target });

    assert.equal(seen.length, 6, 'all six events are reportable');
    for (const event of seen) {
      assert.equal(event.params['game_id'], GAME_ID);
      assert.equal(event.params['game_id'], 'enchanted-forest');
      assert.equal(event.params['stations_total'], TOTAL_STATIONS);
    }
    assert.deepEqual(seen.map((e) => e.name), [
      'game_start',
      'game_resume',
      'game_step_complete',
      'game_complete',
      'game_restart',
      'game_feedback_submit',
    ]);
  });
});

describe('station_number is the couple\u2019s count, not the station id', () => {
  test('the gratitude flowers are reported as the SECOND station', () => {
    const { seen, target } = recorder();
    // order 3 is played second — see PROGRESSION_SEQUENCE.
    reportStationComplete({ order: 3, slug: 'gratitude-flowers', stationsCompleted: 2 }, { target });
    assert.equal(seen[0]!.params['station_number'], 2, 'must not report 3');
  });

  test('the gnome is reported as the THIRD station', () => {
    const { seen, target } = recorder();
    reportStationComplete({ order: 2, slug: 'chemistry-gnome', stationsCompleted: 3 }, { target });
    assert.equal(seen[0]!.params['station_number'], 3, 'must not report 2');
  });

  test('every station in the game reports its journey position', () => {
    for (const station of STATIONS) {
      const { seen, target } = recorder();
      reportStationComplete(
        { order: station.order, slug: station.slug, stationsCompleted: 1 },
        { target },
      );
      assert.equal(seen[0]!.params['station_number'], journeyNumber(station.order));
    }
  });

  test('a journey number is reported for all eighteen, with no gaps or repeats', () => {
    const numbers = STATIONS.map((station) => journeyNumber(station.order)).sort((a, b) => a - b);
    assert.deepEqual(numbers, Array.from({ length: TOTAL_STATIONS }, (_, i) => i + 1));
  });
});

describe('nothing the couple can read is ever reported', () => {
  test('no station\u2019s Hebrew title survives, even passed as the slug', () => {
    for (const station of STATIONS) {
      const { seen, target } = recorder();
      reportStationComplete(
        { order: station.order, slug: station.titleHe, stationsCompleted: 1 },
        { target },
      );
      assert.equal(
        seen[0]!.params['station_slug'],
        undefined,
        `${station.titleHe} reached an analytics event`,
      );
    }
  });

  test('every real slug in the game IS reportable, so the check is not vacuous', () => {
    for (const station of STATIONS) {
      const { seen, target } = recorder();
      reportStationComplete(
        { order: station.order, slug: station.slug, stationsCompleted: 1 },
        { target },
      );
      assert.equal(seen[0]!.params['station_slug'], station.slug);
    }
  });

  test('the feedback event carries a rating and an outcome — there is no comment field', () => {
    const { seen, target } = recorder();
    reportFeedbackSubmit(5, 'sent', { target });
    assert.deepEqual(Object.keys(seen[0]!.params).sort(), [
      'game_id',
      'rating',
      'result',
      'stations_total',
    ]);
  });
});

describe('session timing', () => {
  test('is unknown until a journey starts, and is never persisted anywhere', () => {
    assert.equal(journeyElapsedSeconds(), undefined);
  });

  test('game_complete reports whole seconds since the journey began', () => {
    const { seen, target } = recorder();
    let now = 1_000_000;
    reportGameStart({ target, now: () => now });
    now += 72_400; // 72.4 seconds later
    reportGameComplete({ target, now: () => now });

    assert.equal(seen[1]!.params['elapsed_seconds'], 72);
  });

  test('a restart forgets the clock rather than carrying it into the next journey', () => {
    const { target } = recorder();
    reportGameStart({ target, now: () => 1000 });
    reportGameRestart(4, { target });
    assert.equal(journeyElapsedSeconds(), undefined);
  });

  test('an unmeasured station reports no elapsed_seconds rather than a zero', () => {
    const { seen, target } = recorder();
    reportStationComplete({ order: 1, slug: 'music-bird', stationsCompleted: 1 }, { target });
    assert.equal('elapsed_seconds' in seen[0]!.params, false);
  });
});

describe('a host site with no analytics provider', () => {
  test('changes nothing — every report is a silent no-op', () => {
    assert.equal(reportGameStart({ target: null }), false);
    assert.equal(reportStationComplete({ order: 1, slug: 'music-bird', stationsCompleted: 1 }, { target: null }), false);
    assert.equal(reportGameComplete({ target: null }), false);
    assert.equal(reportFeedbackSubmit(3, 'failed', { target: null }), false);
  });
});
