/**
 * The contract with rotemadini.com, asserted so a refactor cannot quietly break it.
 *
 * Everything here is a fact the host site depends on and that nothing inside the
 * game would notice changing: the route it mounts on, the id every event and
 * feedback row is keyed by, the storage prefix it can clear, and the absence of
 * anything to do with money or accounts.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';

import {
  GAME_ID,
  GAME_PLAY_ROUTE,
  PROGRESS_STORAGE_KEY,
  STORAGE_NAMESPACE,
} from './constants.ts';
import { ACCESSIBILITY_OPEN_EVENT } from '../../shared/accessibility/accessibilityBridge.ts';
import { ANALYTICS_EVENT_NAME } from '../../shared/analytics/analyticsBridge.ts';

describe('the identifiers the host site keys off', () => {
  test('the URL slug and the game id are the same word', () => {
    assert.equal(GAME_ID, 'enchanted-forest');
    assert.equal(GAME_PLAY_ROUTE, '/games/enchanted-forest/play');
    // Derived rather than spelled out, so the route cannot drift from the id.
    // A `forest-game` slug was considered and rejected; this is what keeps it
    // from reappearing in a stray string somewhere.
    assert.equal(GAME_PLAY_ROUTE, `/games/${GAME_ID}/play`);
  });

  test('the two DOM event names are the ones the site listens for', () => {
    assert.equal(ANALYTICS_EVENT_NAME, 'rotem:analytics');
    assert.equal(ACCESSIBILITY_OPEN_EVENT, 'rotem:accessibility-open');
  });

  test('storage is under a prefix the site can enumerate and clear', () => {
    assert.equal(STORAGE_NAMESPACE, `rotem:${GAME_ID}`);
    assert.ok(PROGRESS_STORAGE_KEY.startsWith(`${STORAGE_NAMESPACE}:`));
  });
});

/* ------------------------------------------------------------------ *
 * What must NOT be in here
 * ------------------------------------------------------------------ */

const SOURCE_ROOT = join(import.meta.dirname, '..', '..');

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
    else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith('.test.ts')) out.push(path);
  }
  return out;
}

/** Every shipped source file, as `[path, contents]`. Tests are excluded. */
const SOURCES = sourceFiles(SOURCE_ROOT).map(
  (path) => [path.slice(SOURCE_ROOT.length + 1), readFileSync(path, 'utf8')] as const,
);

describe('the game owns none of the site\u2019s responsibilities', () => {
  test('there are source files to check, so these tests are not vacuous', () => {
    assert.ok(SOURCES.length > 40, `only found ${SOURCES.length} source files`);
  });

  test('no payment or checkout logic', () => {
    for (const [path, source] of SOURCES) {
      assert.doesNotMatch(
        source,
        /\b(stripe|paddle|checkout\.session|createPaymentIntent|tranzila|payplus)\b/i,
        `${path} looks like it handles payment — that belongs to the host site`,
      );
    }
  });

  test('no authentication, sign-in or entitlement check', () => {
    for (const [path, source] of SOURCES) {
      assert.doesNotMatch(
        source,
        /\b(signInWith|signOut|getSession\(|currentUser|isEntitled|hasPurchased|useAuth)\b/,
        `${path} looks like it decides who may play — the host site decides that`,
      );
    }
  });

  test('no GA4 and no Meta Pixel — analytics leaves only through the bridge', () => {
    for (const [path, source] of SOURCES) {
      assert.doesNotMatch(
        source,
        /\b(gtag|dataLayer|googletagmanager|fbq|connect\.facebook\.net|G-[A-Z0-9]{8,})\b/,
        `${path} talks to an analytics provider directly`,
      );
    }
  });

  test('no service-role or secret key is referenced anywhere in the frontend', () => {
    for (const [path, source] of SOURCES) {
      assert.doesNotMatch(
        source,
        /SERVICE_ROLE|SUPABASE_SECRET|sb_secret_|service_role/i,
        `${path} references a secret key`,
      );
    }
  });

  test('only public VITE_ variables are read from the environment', () => {
    /*
     * Matches every SUPABASE/KEY/SECRET-shaped identifier in the source, not
     * only the ones reached through `import.meta.env`, so a key smuggled in as
     * a string literal or through a helper is caught by the same rule.
     */
    for (const [path, source] of SOURCES) {
      for (const match of source.matchAll(/([A-Z][A-Z0-9_]{4,})/g)) {
        const name = match[1]!;
        if (!/SUPABASE|APIKEY|API_KEY|TOKEN|SECRET|PASSWORD/.test(name)) continue;
        assert.match(
          name,
          /^VITE_SUPABASE_(URL|PUBLISHABLE_KEY|ANON_KEY)$/,
          `${path} references ${name}, which is not one of the public config values`,
        );
      }
    }
  });
});

describe('the module does not assume it owns the page', () => {
  test('nothing styles html, body or :root outside the dev harness', () => {
    const globals = /^\s*(html|body|:root|\*)\s*[,{]/m;
    for (const entry of readdirSync(join(SOURCE_ROOT, 'games', 'enchanted-forest', 'styles'))) {
      const css = readFileSync(join(SOURCE_ROOT, 'games', 'enchanted-forest', 'styles', entry), 'utf8');
      assert.doesNotMatch(css, globals, `${entry} reaches outside the game root`);
    }
  });

  test('no source file hard-codes a localhost or dev-server URL', () => {
    for (const [path, source] of SOURCES) {
      assert.doesNotMatch(
        source,
        /https?:\/\/(localhost|127\.0\.0\.1)/,
        `${path} would only work on a dev machine`,
      );
    }
  });
});
