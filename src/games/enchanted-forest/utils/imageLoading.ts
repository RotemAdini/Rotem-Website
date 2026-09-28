/**
 * Shared browser image cache.
 *
 * Loading is not enough for a scene transition: a large image may have arrived
 * over the network but still be waiting to be decoded. Screens use this helper
 * to keep the previous artwork in place until the next one can be painted in a
 * single frame, and the game shell uses it to warm the map during the intro.
 *
 * ── Why there is a deadline ────────────────────────────────────────────────
 *
 * Every screen in the game waits for its artwork before it renders its words
 * and its forward control, which is what makes a scene change land in one frame
 * instead of flashing. The cost of that is a single point of failure: an image
 * request that neither loads nor errors leaves the couple on a blank screen
 * with nothing to tap and no way to know anything is wrong.
 *
 * That is not hypothetical. A `load` event can simply never arrive — a stalled
 * connection on a phone that has wandered off Wi-Fi, a request the browser has
 * parked behind others, a `decode()` that never settles — and `<img>` has no
 * timeout of its own. During QA this happened with a 200 OK already in the
 * network log and the title screen still empty after sixteen seconds.
 *
 * So every wait has a deadline, and passing it is reported as `'timeout'`
 * rather than `'failed'`. The distinction matters at the call site: a failure
 * means the asset is not coming and a placeholder is honest, while a timeout
 * means it is merely late — so the screen renders its words now and lets the
 * browser paint the artwork underneath them whenever it finally arrives.
 *
 * Nothing is aborted. The image element is left loading and will still populate
 * the browser's own cache, so a late arrival is a cache hit for the next screen
 * that asks for it rather than a second request.
 */

export type ImagePriority = 'high' | 'low' | 'auto';

/**
 * 'ready'   — loaded AND decoded; safe to paint in a single frame.
 * 'failed'  — the request errored. The asset is not coming.
 * 'timeout' — still outstanding past the deadline. It may yet arrive.
 */
export type ImageOutcome = 'ready' | 'failed' | 'timeout';

/**
 * How long a screen will wait for its artwork before showing itself anyway.
 *
 * Long enough that a slow-but-working connection still gets the intended
 * single-frame scene change, short enough that a stall does not read as a
 * broken game. Four seconds is roughly the point where a person stops assuming
 * a screen is loading and starts assuming it is dead.
 */
export const IMAGE_READY_TIMEOUT_MS = 4000;

const readyUrls = new Set<string>();

/**
 * In-flight requests, keyed by url. These settle only when the image really
 * does, and carry NO deadline of their own — see `preloadImage`.
 */
const pendingUrls = new Map<string, Promise<'ready' | 'failed'>>();

export function isImageReady(url: string): boolean {
  return readyUrls.has(url);
}

/** Test seam: forget everything this module has cached. */
export function resetImageCache(): void {
  readyUrls.clear();
  pendingUrls.clear();
}

/** Starts (or joins) the real request. Never rejects, never times out. */
function loadImage(url: string, priority: ImagePriority): Promise<'ready' | 'failed'> {
  const pending = pendingUrls.get(url);
  if (pending) return pending;

  const image = new Image();
  image.decoding = 'async';
  image.fetchPriority = priority;

  const request = new Promise<'ready' | 'failed'>((resolve) => {
    image.addEventListener(
      'load',
      () => {
        // `decode()` can reject; that must not turn a loaded image into a failure.
        const decoded = typeof image.decode === 'function' ? image.decode() : Promise.resolve();
        void decoded
          .catch(() => undefined)
          .then(() => {
            readyUrls.add(url);
            pendingUrls.delete(url);
            resolve('ready');
          });
      },
      { once: true },
    );

    image.addEventListener(
      'error',
      () => {
        pendingUrls.delete(url);
        resolve('failed');
      },
      { once: true },
    );

    image.src = url;
  });

  pendingUrls.set(url, request);
  return request;
}

/**
 * Fetch and decode `url`, resolving once it is paint-ready — or once this
 * caller's deadline passes, whichever comes first.
 *
 * ⚠️ The deadline belongs to the CALLER, not to the request, and the two must
 * stay separate. The first version of this attached the timeout to the shared
 * in-flight promise, which quietly meant the FIRST caller decided the deadline
 * for everybody after it. In practice the first caller was always a warm-up
 * asking to wait indefinitely — the map warms the next station's artwork before
 * the couple open it — so the screen that actually had a deadline inherited
 * "wait forever" instead, and the gnome's last step rendered as a blank screen
 * with no control on it. Racing per call is what makes the deadline mean
 * anything.
 *
 * Never rejects. A resolved `'timeout'` cancels nothing: the request is left
 * running and a late arrival still counts as ready for whoever asks next.
 */
export function preloadImage(
  url: string,
  priority: ImagePriority = 'auto',
  timeoutMs: number = IMAGE_READY_TIMEOUT_MS,
): Promise<ImageOutcome> {
  if (readyUrls.has(url)) return Promise.resolve<ImageOutcome>('ready');

  // No Image constructor means a non-DOM environment; there is nothing to wait for.
  if (typeof Image === 'undefined') return Promise.resolve<ImageOutcome>('ready');

  const request = loadImage(url, priority);
  if (timeoutMs <= 0) return request;

  return new Promise<ImageOutcome>((resolve) => {
    const timer = setTimeout(() => resolve('timeout'), timeoutMs);
    void request.then((outcome) => {
      clearTimeout(timer);
      resolve(outcome);
    });
  });
}
