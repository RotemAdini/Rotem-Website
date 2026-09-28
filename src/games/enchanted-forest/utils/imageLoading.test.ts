/**
 * The deadline, and why it exists.
 *
 * Every screen holds its words and its forward control until its artwork is
 * paint-ready. That is what makes a scene change land in one frame — and it is
 * also the single point of failure this module exists to bound: an <img> that
 * neither loads nor errors has no timeout of its own, so without a deadline the
 * couple sit on a blank screen with nothing to tap.
 */

import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';

import {
  IMAGE_READY_TIMEOUT_MS,
  isImageReady,
  preloadImage,
  resetImageCache,
} from './imageLoading.ts';

type Listener = () => void;

/**
 * An <img> that does exactly what the test tells it to, and nothing by itself.
 *
 * Installed as the global `Image`, which is the seam the module already uses to
 * decide whether it is in a browser at all.
 */
class FakeImage {
  static last: FakeImage | null = null;

  decoding = '';
  fetchPriority = '';
  naturalWidth = 0;
  private listeners = new Map<string, Listener[]>();
  private source = '';

  constructor() {
    FakeImage.last = this;
  }

  set src(value: string) {
    this.source = value;
  }

  get src(): string {
    return this.source;
  }

  addEventListener(type: string, listener: Listener): void {
    const existing = this.listeners.get(type) ?? [];
    existing.push(listener);
    this.listeners.set(type, existing);
  }

  decode(): Promise<void> {
    return Promise.resolve();
  }

  emit(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) listener();
  }
}

function withFakeImage<T>(run: () => T): T {
  const globals = globalThis as { Image?: unknown };
  const original = globals.Image;
  globals.Image = FakeImage as unknown as typeof Image;
  try {
    return run();
  } finally {
    if (original === undefined) delete globals.Image;
    else globals.Image = original;
  }
}

beforeEach(() => {
  resetImageCache();
  FakeImage.last = null;
});

describe('a stalled image cannot strand a screen', () => {
  test('resolves "timeout" rather than hanging forever', async () => {
    const outcome = await withFakeImage(() =>
      // The failure seen in QA: a 200 OK in the network log, and no `load`
      // event ever. The fake simply never emits one.
      preloadImage('/stalled.jpg', 'high', 20),
    );
    assert.equal(outcome, 'timeout');
  });

  test('a timeout is not a failure — the image is left loading, not abandoned', async () => {
    await withFakeImage(async () => {
      const first = preloadImage('/late.jpg', 'high', 20);
      assert.equal(await first, 'timeout');

      // The same URL asked for again joins the same request rather than
      // opening a second one, which is what makes a late arrival a cache hit.
      const image = FakeImage.last!;
      FakeImage.last = null;
      const second = preloadImage('/late.jpg', 'high', 1000);
      assert.equal(FakeImage.last, null, 'no second request was opened');

      image.emit('load');
      assert.equal(await second, 'ready', 'a late arrival still counts as ready');

      // And the screen after it pays nothing: no new request, no waiting.
      FakeImage.last = null;
      assert.equal(await preloadImage('/late.jpg', 'high', 20), 'ready');
      assert.equal(FakeImage.last, null, 'the late arrival was cached, not re-fetched');
    });
  });

  /*
   * The regression that produced a blank station screen.
   *
   * The map warms the next station's artwork with no deadline, because nothing
   * on screen is waiting for it. The station screen that opens a moment later
   * asks for the same url WITH a deadline, because everything on it is waiting.
   * When the deadline lived on the shared request rather than on the call, the
   * second caller silently inherited the first one's "wait forever" — and the
   * gnome's last step rendered as an empty screen with no control on it.
   */
  test('a warm-up with no deadline cannot strip the deadline off a screen that has one', async () => {
    await withFakeImage(async () => {
      // The map's warm-up: no deadline, deliberately.
      let warmSettled = false;
      void preloadImage('/station.jpg', 'high', 0).then(() => {
        warmSettled = true;
      });

      // The station screen opens on the same artwork and must not inherit it.
      const screen = await preloadImage('/station.jpg', 'high', 20);

      assert.equal(screen, 'timeout', 'the screen keeps its own deadline');
      assert.equal(warmSettled, false, 'and the warm-up keeps waiting, as it asked to');
    });
  });

  test('the default deadline is short enough to feel like loading, not breakage', () => {
    assert.ok(IMAGE_READY_TIMEOUT_MS > 1000, 'too eager: a working slow connection would lose its scene change');
    assert.ok(IMAGE_READY_TIMEOUT_MS <= 6000, 'too patient: a stall would read as a dead screen');
  });
});

describe('the outcomes a caller branches on', () => {
  test('a loaded, decoded image is "ready"', async () => {
    const outcome = await withFakeImage(async () => {
      const pending = preloadImage('/good.jpg', 'high', 1000);
      FakeImage.last!.emit('load');
      return pending;
    });
    assert.equal(outcome, 'ready');
    assert.equal(isImageReady('/good.jpg'), true);
  });

  test('an errored request is "failed", and is never remembered as ready', async () => {
    const outcome = await withFakeImage(async () => {
      const pending = preloadImage('/missing.jpg', 'high', 1000);
      FakeImage.last!.emit('error');
      return pending;
    });
    assert.equal(outcome, 'failed');
    assert.equal(isImageReady('/missing.jpg'), false);
  });

  test('an already-ready url answers immediately, without a second request', async () => {
    await withFakeImage(async () => {
      const pending = preloadImage('/cached.jpg', 'high', 1000);
      FakeImage.last!.emit('load');
      await pending;

      FakeImage.last = null;
      assert.equal(await preloadImage('/cached.jpg'), 'ready');
      assert.equal(FakeImage.last, null, 'no new Image was constructed');
    });
  });

  test('passing 0 means no deadline — used by warm-ups nothing is waiting on', async () => {
    await withFakeImage(async () => {
      let settled = false;
      const pending = preloadImage('/warm.jpg', 'low', 0).then(() => {
        settled = true;
      });
      await new Promise((resolve) => setTimeout(resolve, 30));
      assert.equal(settled, false, 'a warm-up with no deadline waits for the real event');

      FakeImage.last!.emit('load');
      await pending;
      assert.equal(settled, true);
    });
  });
});

describe('outside a browser', () => {
  test('there is nothing to wait for, so nothing waits', async () => {
    const globals = globalThis as { Image?: unknown };
    const original = globals.Image;
    delete globals.Image;
    try {
      assert.equal(await preloadImage('/ssr.jpg'), 'ready');
    } finally {
      if (original !== undefined) globals.Image = original;
    }
  });
});
