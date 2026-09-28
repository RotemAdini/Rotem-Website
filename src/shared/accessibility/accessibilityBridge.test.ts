import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  ACCESSIBILITY_OPEN_EVENT,
  openSiteAccessibilityPanel,
} from './accessibilityBridge.ts';

describe('the accessibility bridge', () => {
  test('is the event name the host site listens for', () => {
    assert.equal(ACCESSIBILITY_OPEN_EVENT, 'rotem:accessibility-open');
  });

  test('asks the host to open its panel, and carries no payload of its own', () => {
    const seen: Event[] = [];
    const dispatched = openSiteAccessibilityPanel({
      dispatchEvent(event: Event) {
        seen.push(event);
        return true;
      },
    });

    assert.equal(dispatched, true);
    assert.equal(seen.length, 1);
    assert.equal(seen[0]!.type, ACCESSIBILITY_OPEN_EVENT);
    // The game has no accessibility state to hand over — the site owns all of it.
    assert.equal((seen[0] as CustomEvent).detail, null);
  });

  test('is a no-op when there is nothing to dispatch to', () => {
    assert.equal(openSiteAccessibilityPanel(null), false);
  });

  test('a host listener that throws does not take the game with it', () => {
    assert.equal(
      openSiteAccessibilityPanel({
        dispatchEvent(): boolean {
          throw new Error('the site\u2019s panel is broken');
        },
      }),
      false,
    );
  });
});
