/**
 * Every asset the manifest names must resolve to a URL, and every URL must
 * point at a file that actually ships.
 *
 * This is the guard that would have caught the 16 station backgrounds sitting
 * in the source archive while the game rendered "חסר נכס גרפי" placeholders.
 *
 * Source and master artwork is deliberately NOT in this repo — it lives in the
 * external backup — so nothing here asserts that a master is present. What it
 * asserts is that everything the game asks for resolves, exists, and sits
 * somewhere the build will actually copy it from.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { ENCHANTED_FOREST } from '../data/game.ts';
import type { AssetId } from '../types/content.ts';
import { assetUrl, isAssetAvailable, MISSING_ASSETS } from './assets.ts';

const PUBLIC_ROOT = fileURLToPath(new URL('../../../../public', import.meta.url));

/** Every asset id the manifest references, in one flat list. */
function manifestAssetIds(): AssetId[] {
  const ids: AssetId[] = [ENCHANTED_FOREST.title.background, ENCHANTED_FOREST.ending.background];
  ids.push(ENCHANTED_FOREST.map.background, ENCHANTED_FOREST.map.marker);
  for (const flow of ENCHANTED_FOREST.flows) for (const step of flow.steps) ids.push(step.background);
  for (const station of ENCHANTED_FOREST.stations) ids.push(station.background);
  return [...new Set(ids)];
}

describe('asset resolution', () => {
  test('every asset the manifest names resolves to a URL', () => {
    const unresolved = manifestAssetIds().filter((id) => !isAssetAvailable(id));
    assert.deepEqual(unresolved, [], 'a referenced asset has no URL — the UI would show a placeholder');
  });

  test('every resolved URL points at a file in public/', () => {
    const broken = manifestAssetIds()
      .map((id) => assetUrl(id))
      .filter((url): url is string => url !== null)
      .filter((url) => !existsSync(PUBLIC_ROOT + url));
    assert.deepEqual(broken, [], 'a resolved asset URL has no file behind it');
  });

  test('the missing-asset list and the resolver never disagree', () => {
    const both = Object.keys(MISSING_ASSETS).filter((id) => isAssetAvailable(id));
    assert.deepEqual(both, [], 'an asset cannot be both installed and listed as missing');
  });

  test('an unknown id resolves to null rather than a broken path', () => {
    assert.equal(assetUrl('bg-does-not-exist'), null);
    assert.equal(isAssetAvailable('bg-does-not-exist'), false);
  });
});

/*
 * The heaviest asset in the game, and the two places that name it.
 *
 * The hub's artwork ships as a derived WebP beside its PNG source. Both files
 * exist, which is the point — but it means a stale reference does not 404, it
 * silently fetches 3.35 MB instead of 745 KB, on the critical path, where
 * nobody would notice it in a passing test suite.
 */
/*
 * The backgrounds.
 *
 * They ship as derived WebP encodings made from lossless PNG masters. Neither
 * those masters nor the JPEGs they replaced live in this repo any more — they
 * were verified by sha256 and moved to the external backup at
 * `C:\גיבויים של דברים מהאתר\היער הקסום\public-images\`, because the repo has no
 * use for 73 MB of source art it never serves.
 *
 * So these tests no longer check that sources are present. What they check
 * instead is the thing that would actually break production: that every
 * background resolves, resolves to a WebP, and resolves to a file that is really
 * there. Falling back to a JPEG is still possible, but it now means restoring
 * one from the backup first — which is exactly what the resolver's own comment
 * says.
 */
describe('the station and story backgrounds', () => {
  const BACKGROUNDS = `${PUBLIC_ROOT}/games/enchanted-forest/images/backgrounds`;

  /** Every background the manifest names, as an asset id. */
  function backgroundIds(): AssetId[] {
    return manifestAssetIds().filter((id) => String(id).startsWith('bg-'));
  }

  test('there are backgrounds to check, so these tests are not vacuous', () => {
    assert.equal(backgroundIds().length, 24);
  });

  test('every one resolves to a WebP that exists', () => {
    for (const id of backgroundIds()) {
      const url = assetUrl(id);
      assert.ok(url, `${id} must resolve`);
      assert.match(url, /\.webp$/, `${id} does not point at the derived WebP`);
      assert.equal(existsSync(PUBLIC_ROOT + url), true, `${id} resolves to ${url}, which is not on disk`);
    }
  });

  test('the directory holds nothing but those 24 files', () => {
    // The repo serves artwork; it is not where source art is kept. A stray .jpg
    // or .png here means somebody restored a master and left it behind, which
    // would ride along into the next deploy.
    const present = readdirSync(BACKGROUNDS).sort();
    assert.equal(present.length, 24, `unexpected files in backgrounds/: ${present.join(', ')}`);
    assert.deepEqual(
      present.filter((f) => !f.endsWith('.webp')),
      [],
      'only derived WebP artwork belongs in this directory',
    );
  });

  test('each one is small enough to have been worth deriving', () => {
    // The JPEGs they replaced averaged 375 KB and are no longer here to compare
    // against, so this is an absolute ceiling rather than a ratio. Measured
    // range today is 208-386 KB; 450 KB catches a re-encode at a quality that
    // gives the whole exercise away.
    for (const id of backgroundIds()) {
      const bytes = statSync(`${BACKGROUNDS}/${String(id)}.webp`).size;
      assert.ok(bytes < 450_000, `${id} is ${Math.round(bytes / 1024)} KB — too big for a phone background`);
      assert.ok(bytes > 20_000, `${id} is only ${Math.round(bytes / 1024)} KB — suspiciously small`);
    }
  });
});

describe('the map artwork', () => {
  const MAP = `${PUBLIC_ROOT}/games/enchanted-forest/images/map`;

  test('resolves to the derived WebP, and it is really there', () => {
    const url = assetUrl('map-forest-prototype');
    assert.ok(url, 'the map must resolve');
    assert.match(url, /\.webp$/, 'the 3.3 MB PNG source must not be what ships to a phone');
    assert.equal(existsSync(PUBLIC_ROOT + url), true, `${url} is not on disk`);
  });

  test('is small enough to have been worth deriving', () => {
    // The 3.3 MB PNG master it came from now lives in the external backup, so
    // this is an absolute ceiling rather than a ratio against the source.
    const bytes = statSync(`${MAP}/map-forest-prototype.webp`).size;
    assert.ok(bytes < 1_200_000, `the map is ${Math.round(bytes / 1024)} KB`);
  });

  test('the directory holds only what the game requests', () => {
    assert.deepEqual(
      readdirSync(MAP).sort(),
      ['map-couple-silhouette.png', 'map-forest-prototype.webp'],
      'the map directory should hold the board and the couple, and nothing else',
    );
  });

  /*
   * The missing-asset protection, stated once for everything.
   *
   * Every id the manifest can reach at runtime must resolve, and must resolve to
   * a file that exists inside a directory the build actually copies. That last
   * clause is the one worth having: `public/` is not deployed wholesale, so a
   * file can be present here and still 404 in production. This catches the
   * resolver being pointed at anything outside the ship list — including a
   * master restored from the backup for a fallback experiment.
   */
  test('every resolved asset exists AND sits inside a directory the build ships', () => {
    const config = readFileSync(fileURLToPath(new URL('../../../../vite.config.ts', import.meta.url)), 'utf8');
    const shipped = [...config.matchAll(/^\s*'(games\/[^']+)',$/gm)].map((m) => `/${m[1]}/`);
    assert.ok(shipped.length > 0, 'could not read the ship list out of vite.config.ts');

    const ids = manifestAssetIds();
    assert.ok(ids.length > 20, `only ${ids.length} assets to check`);

    for (const id of ids) {
      const url = assetUrl(id);
      assert.ok(url, `${id} does not resolve`);
      assert.equal(existsSync(PUBLIC_ROOT + url), true, `${id} resolves to ${url}, which is not on disk`);
      assert.ok(
        shipped.some((dir) => url.startsWith(dir)),
        `${id} resolves to ${url}, which is outside every shipped directory — it would 404 in production`,
      );
    }
  });
});
