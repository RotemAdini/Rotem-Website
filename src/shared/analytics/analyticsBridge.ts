/**
 * The site's shared analytics bridge.
 *
 * The game never talks to GA4, Meta Pixel or any other provider, and never
 * loads one. It dispatches a DOM event on `window` and stops caring:
 *
 *   window.dispatchEvent(new CustomEvent('rotem:analytics', {
 *     detail: { name: 'game_step_complete', params: { game_id: 'enchanted-forest', … } },
 *   }))
 *
 * rotemadini.com listens for that event and forwards it to whatever it has
 * configured. If nothing is listening — a standalone build, a consent banner the
 * visitor declined, a preview deploy — the event is simply dropped by the
 * browser. That is the whole failure mode: silent, synchronous and free.
 *
 * ── What may NEVER leave this file ──────────────────────────────────────────
 *
 * Analytics is the easiest place in a codebase to leak somebody's evening. The
 * couple type memories, stories, names and a feedback comment into this game,
 * and none of it may ever appear in an event — not once, not "just the first
 * word", not hashed.
 *
 * So the sanitiser below is an ALLOW-list on both axes: a key that is not in
 * `ALLOWED_PARAMS` is dropped, and a string that is not a short ASCII slug is
 * dropped. That second rule is the one doing the real work. Every dangerous
 * value is structurally excluded rather than remembered about:
 *
 *   • Hebrew free text  — non-ASCII, rejected
 *   • an email address  — contains '@' and '.', rejected
 *   • a sentence        — contains spaces, rejected
 *   • a Supabase user id — a 36-char UUID, longer than the 32-char cap
 *   • a JWT or API token — far over the cap, and contains '.'
 *
 * A caller therefore cannot leak free text by mistake, even by passing the wrong
 * variable. If a future label legitimately needs to be sent, add it to
 * `ALLOWED_PARAMS` deliberately — never widen `isSafeLabel`.
 */

/** The DOM event the host site listens for. Contractual: do not rename. */
export const ANALYTICS_EVENT_NAME = 'rotem:analytics';

/** The events this game is allowed to report. */
export type AnalyticsEventName =
  | 'game_start'
  | 'game_resume'
  | 'game_step_complete'
  | 'game_complete'
  | 'game_restart'
  | 'game_feedback_submit';

export type AnalyticsParamValue = string | number | boolean;
export type AnalyticsParams = Readonly<Record<string, AnalyticsParamValue>>;

export interface AnalyticsEventDetail {
  name: AnalyticsEventName;
  params: Record<string, AnalyticsParamValue>;
}

/**
 * Every parameter key that may be sent, and how its value is checked.
 *
 * 'label'  — a short lowercase ASCII slug (see `isSafeLabel`).
 * 'count'  — a finite, non-negative integer.
 * 'flag'   — a boolean.
 */
const ALLOWED_PARAMS: Readonly<Record<string, 'label' | 'count' | 'flag'>> = {
  /** Always `enchanted-forest`. The canonical product id, never the URL slug. */
  game_id: 'label',
  /** 1-based position in the journey — `journeyNumber()`, never `station.order`. */
  station_number: 'count',
  /** The station's own ASCII slug, e.g. `music-bird`. Content identity, not input. */
  station_slug: 'label',
  stations_total: 'count',
  stations_completed: 'count',
  /** Whole seconds. Session-scoped; nothing about timing is persisted. */
  elapsed_seconds: 'count',
  /** A fixed outcome word: `completed`, `revisit`, `sent`, `failed`, `unavailable`. */
  result: 'label',
  /** 1..5. A rating is a number, never the comment that may accompany it. */
  rating: 'count',
  /** Whether the visit was a fresh start or a resumed save. */
  resumed: 'flag',
};

const MAX_LABEL_LENGTH = 32;

/**
 * A label is lowercase ASCII letters, digits, `-` and `_`, at most 32 characters.
 *
 * Deliberately narrower than "a string with no personal data in it", because
 * that is not a property code can check. Widening this rule is how free text
 * gets into analytics, so it has no escape hatch.
 */
export function isSafeLabel(value: string): boolean {
  return /^[a-z0-9][a-z0-9_-]{0,31}$/.test(value) && value.length <= MAX_LABEL_LENGTH;
}

/**
 * Drop everything that is not explicitly permitted.
 *
 * Silently omits a bad entry rather than throwing: an analytics call must never
 * be able to break a station, and a missing dimension is a far better outcome
 * than a crash in the middle of the couple's evening.
 */
export function sanitizeParams(params: AnalyticsParams): Record<string, AnalyticsParamValue> {
  const safe: Record<string, AnalyticsParamValue> = {};

  for (const [key, value] of Object.entries(params)) {
    const kind = ALLOWED_PARAMS[key];
    if (!kind) continue;

    if (kind === 'flag') {
      if (typeof value === 'boolean') safe[key] = value;
      continue;
    }

    if (kind === 'count') {
      if (typeof value !== 'number') continue;
      if (!Number.isFinite(value) || value < 0) continue;
      safe[key] = Math.round(value);
      continue;
    }

    if (typeof value === 'string' && isSafeLabel(value)) safe[key] = value;
  }

  return safe;
}

/** Injectable for tests; defaults to `window`. */
export interface AnalyticsTarget {
  dispatchEvent(event: Event): boolean;
}

function defaultTarget(): AnalyticsTarget | null {
  if (typeof window === 'undefined') return null;
  if (typeof window.dispatchEvent !== 'function') return null;
  return window;
}

/**
 * Report one event to the host site.
 *
 * Never throws and never returns a rejected promise — every failure path ends in
 * a no-op. Returns true only when an event was actually dispatched, which the
 * tests assert on and nothing in the game branches on.
 */
export function emitAnalytics(
  name: AnalyticsEventName,
  params: AnalyticsParams = {},
  target: AnalyticsTarget | null = defaultTarget(),
): boolean {
  if (!target) return false;
  // No CustomEvent means a non-DOM environment (SSR, a unit test runner). There
  // is nothing listening there either, so there is nothing to report.
  if (typeof CustomEvent !== 'function') return false;

  try {
    const detail: AnalyticsEventDetail = { name, params: sanitizeParams(params) };
    target.dispatchEvent(new CustomEvent(ANALYTICS_EVENT_NAME, { detail }));
    return true;
  } catch {
    // A listener on the host site that throws must not take the game with it.
    return false;
  }
}
