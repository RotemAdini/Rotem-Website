/**
 * The privacy guarantee, asserted rather than documented.
 *
 * Most of this file is one test repeated with different poison: every kind of
 * thing the couple can put into this game, handed to the bridge, and asserted
 * never to come out the other side. If somebody later widens `isSafeLabel` to
 * "make a label work", these are the tests that should stop them.
 */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  ANALYTICS_EVENT_NAME,
  emitAnalytics,
  isSafeLabel,
  sanitizeParams,
  type AnalyticsEventDetail,
} from './analyticsBridge.ts';

/** Records what a host site's listener would have received. */
function recorder() {
  const seen: AnalyticsEventDetail[] = [];
  return {
    seen,
    target: {
      dispatchEvent(event: Event): boolean {
        assert.equal(event.type, ANALYTICS_EVENT_NAME);
        seen.push((event as CustomEvent<AnalyticsEventDetail>).detail);
        return true;
      },
    },
  };
}

describe('the event contract', () => {
  test('is the name the host site listens for', () => {
    assert.equal(ANALYTICS_EVENT_NAME, 'rotem:analytics');
  });

  test('carries the name and the sanitised params, and nothing else', () => {
    const { seen, target } = recorder();
    assert.equal(
      emitAnalytics('game_step_complete', { game_id: 'enchanted-forest', station_number: 4 }, target),
      true,
    );
    assert.deepEqual(seen, [
      { name: 'game_step_complete', params: { game_id: 'enchanted-forest', station_number: 4 } },
    ]);
    assert.deepEqual(Object.keys(seen[0]!), ['name', 'params']);
  });
});

describe('free text can never leave the game', () => {
  /*
   * Everything a couple can type, plus the identifiers that must never be
   * reported. Each is offered under a key that IS on the allow-list, so the only
   * thing that can reject them is the value check — which is the point.
   */
  const poison: readonly [string, string][] = [
    ['a Hebrew memory', 'הרגע שבו נפגשנו בפעם הראשונה'],
    ['a Hebrew name', 'רותם'],
    ['an English sentence', 'we loved the campfire station'],
    ['an email address', 'rotemadini@gmail.com'],
    ['a feedback comment', 'Great game! The timer was confusing.'],
    ['a Supabase user id', '3f9a1c7e-2b84-4a11-9d0e-7c65b2a83f10'],
    ['a bearer token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abcdefg.hijklmnop'],
    ['a URL', 'https://rotemadini.com/games/enchanted-forest/play'],
    ['an uppercase label', 'Music-Bird'],
    ['a label with a space', 'music bird'],
  ];

  for (const [what, value] of poison) {
    test(`${what} is dropped`, () => {
      assert.equal(isSafeLabel(value), false, `${value} must not be a safe label`);
      assert.deepEqual(sanitizeParams({ station_slug: value, result: value }), {});
    });
  }

  test('a real station slug survives, so the check is not just rejecting everything', () => {
    assert.deepEqual(sanitizeParams({ station_slug: 'music-bird' }), { station_slug: 'music-bird' });
    assert.deepEqual(sanitizeParams({ result: 'completed' }), { result: 'completed' });
  });

  test('a 33-character slug is over the cap', () => {
    assert.equal(isSafeLabel('a'.repeat(32)), true);
    assert.equal(isSafeLabel('a'.repeat(33)), false);
  });
});

describe('the parameter allow-list', () => {
  test('drops a key nobody approved, however harmless its value looks', () => {
    assert.deepEqual(sanitizeParams({ user_id: 'abc', partner_name: 'dana', comment: 'nice' }), {});
  });

  test('keeps only sane numbers', () => {
    assert.deepEqual(sanitizeParams({ station_number: 4.6 }), { station_number: 5 });
    assert.deepEqual(sanitizeParams({ elapsed_seconds: -1 }), {});
    assert.deepEqual(sanitizeParams({ elapsed_seconds: Number.NaN }), {});
    assert.deepEqual(sanitizeParams({ elapsed_seconds: Number.POSITIVE_INFINITY }), {});
  });

  test('will not take a number where a label belongs, or the reverse', () => {
    assert.deepEqual(sanitizeParams({ station_slug: 12 as unknown as string }), {});
    assert.deepEqual(sanitizeParams({ station_number: '4' as unknown as number }), {});
  });

  test('keeps booleans as booleans', () => {
    assert.deepEqual(sanitizeParams({ resumed: true }), { resumed: true });
    assert.deepEqual(sanitizeParams({ resumed: 'true' as unknown as boolean }), {});
  });
});

describe('failing silently is the contract', () => {
  test('no target at all is a no-op, not a crash', () => {
    assert.equal(emitAnalytics('game_start', { game_id: 'enchanted-forest' }, null), false);
  });

  test('a host listener that throws does not take the game with it', () => {
    const exploding = {
      dispatchEvent(): boolean {
        throw new Error('the site\u2019s analytics provider is broken');
      },
    };
    assert.equal(emitAnalytics('game_complete', {}, exploding), false);
  });
});
