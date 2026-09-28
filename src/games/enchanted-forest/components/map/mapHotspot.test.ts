/**
 * The one thing about a hotspot that cannot be checked by driving the page.
 *
 * The station overlay is `pointer-events: none` so the map does not blanket the
 * screen and swallow taps meant for the chrome underneath it. That property
 * inherits, so every station button has to opt back in — and when it does not,
 * the map looks perfect and is completely dead: nothing can be opened, and the
 * journey stops at the first station.
 *
 * It slipped through the map's own QA because `element.click()` dispatches
 * straight at the node and never hit-tests, so a hotspot with no pointer events
 * still "works" when a script drives it. Only a real tap, or a rule like this
 * one, can tell the difference.
 *
 * These tests read the stylesheet as text. That is unusual, and deliberate:
 * there is no DOM here, the declaration IS the behaviour, and a rule that reads
 * the file is the cheapest thing that would have caught the bug.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const hotspotCss = readFileSync(join(here, 'MapHotspot.module.css'), 'utf8');
const mapCss = readFileSync(
  join(here, '..', 'screens', 'ForestMap.module.css'),
  'utf8',
);

/**
 * Every declaration that applies to `selector`, joined.
 *
 * A class is usually split across several rules — `.overlay` is sized in a
 * shared `.art, .overlay` rule and given its behaviour in one of its own — so
 * reading only the first match would ask the wrong question.
 */
function ruleBody(css: string, selector: string): string {
  const pattern = new RegExp(
    `(?:^|[},])\\s*([^{}]*\\${selector}\\b[^{}]*)\\{([^}]*)\\}`,
    'gm',
  );
  const bodies: string[] = [];
  for (const match of css.matchAll(pattern)) {
    // `.locked` must not pick up `.unlocked`; the \b above allows a leading
    // word character, so check the class really starts where we think it does.
    const selectors = match[1]!.split(',').map((s) => s.trim());
    if (selectors.some((s) => new RegExp(`(^|[\\s>+~])\\${selector}([^\\w-]|$)`).test(s))) {
      bodies.push(match[2]!);
    }
  }
  assert.ok(bodies.length > 0, `no rule found for ${selector}`);
  return bodies.join('\n');
}

describe('the overlay stays out of the way', () => {
  test('it is inert, so the map never swallows a tap meant for the chrome', () => {
    assert.match(ruleBody(mapCss, '.overlay'), /pointer-events:\s*none/);
  });
});

describe('a station opts back in', () => {
  test('the hotspot declares pointer-events: auto', () => {
    // Without this the map renders correctly and cannot be used at all.
    assert.match(
      ruleBody(hotspotCss, '.hotspot'),
      /pointer-events:\s*auto/,
      'MapHotspot .hotspot must re-enable pointer events — see this file’s header',
    );
  });

  test('a locked hotspot opts back OUT, so it cannot steal a neighbour’s tap', () => {
    assert.match(ruleBody(hotspotCss, '.locked'), /pointer-events:\s*none/);
  });
});

describe('overlapping hotspots resolve in the player’s favour', () => {
  test('the station they can open is stacked above the ones they cannot', () => {
    const active = Number(/\.active\s*\{[^}]*z-index:\s*(\d+)/.exec(hotspotCss)?.[1]);
    const completed = Number(/\.completed\s*\{[^}]*z-index:\s*(\d+)/.exec(hotspotCss)?.[1]);
    const base = Number(/z-index:\s*(\d+);/.exec(ruleBody(hotspotCss, '.hotspot'))?.[1]);
    assert.ok(Number.isFinite(active) && Number.isFinite(completed) && Number.isFinite(base));
    assert.ok(active > completed, 'active must sit above completed');
    assert.ok(completed > base, 'completed must sit above a plain hotspot');
  });
});
