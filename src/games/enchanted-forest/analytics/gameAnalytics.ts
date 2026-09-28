/**
 * What this game reports, and nothing more.
 *
 * Every call in the game goes through one of the functions below rather than
 * calling `emitAnalytics` directly, so the complete list of events this module
 * can produce is the list of exports in this file — readable in one screen, and
 * reviewable without reading the components.
 *
 * Nothing here is awaited, retried or error-handled by a caller: the bridge
 * swallows every failure by design, so a missing analytics provider on the host
 * site is indistinguishable from a working one as far as the game is concerned.
 */

import {
  emitAnalytics,
  type AnalyticsParams,
  type AnalyticsTarget,
} from '../../../shared/analytics/analyticsBridge.ts';
import { GAME_ID, TOTAL_STATIONS } from '../constants.ts';
import { journeyNumber } from '../state/sequence.ts';

/** Optional injection point. Tests pass a fake target; the game never does. */
export interface ReportOptions {
  target?: AnalyticsTarget | null;
  now?: () => number;
}

function report(
  name: Parameters<typeof emitAnalytics>[0],
  params: AnalyticsParams,
  options: ReportOptions = {},
): boolean {
  const withGame = { game_id: GAME_ID, stations_total: TOTAL_STATIONS, ...params };
  return options.target === undefined
    ? emitAnalytics(name, withGame)
    : emitAnalytics(name, withGame, options.target);
}

/* ------------------------------------------------------------------ *
 * Session timing
 * ------------------------------------------------------------------ */

/**
 * How long the couple have been playing *in this browser session*.
 *
 * Deliberately NOT persisted. A saved start time would have to live in storage
 * alongside the progress, and "when did this couple start their evening" is
 * exactly the kind of fact this game has no business keeping. So
 * `elapsed_seconds` on `game_complete` means "since they opened the tab", which
 * is honest, useful for a rough play-duration signal, and forgotten on refresh.
 *
 * Module-level because exactly one game is mounted at a time; `resetJourneyClock`
 * exists so tests are not order-dependent.
 */
let journeyStartedAt: number | null = null;

export function startJourneyClock(now: () => number = Date.now): void {
  journeyStartedAt = now();
}

export function resetJourneyClock(): void {
  journeyStartedAt = null;
}

/** Whole seconds since the clock started, or `undefined` when it never did. */
export function journeyElapsedSeconds(now: () => number = Date.now): number | undefined {
  if (journeyStartedAt === null) return undefined;
  const seconds = Math.round((now() - journeyStartedAt) / 1000);
  return seconds >= 0 ? seconds : undefined;
}

/** Drops the key entirely when the value is unknown, rather than sending a 0. */
function withElapsed(params: AnalyticsParams, elapsedSeconds?: number): AnalyticsParams {
  return elapsedSeconds === undefined ? params : { ...params, elapsed_seconds: elapsedSeconds };
}

/* ------------------------------------------------------------------ *
 * The six events
 * ------------------------------------------------------------------ */

/** The couple began a brand-new journey from the title screen. */
export function reportGameStart(options?: ReportOptions): boolean {
  startJourneyClock(options?.now ?? Date.now);
  return report('game_start', { resumed: false, stations_completed: 0 }, options);
}

/** The couple continued a saved journey. */
export function reportGameResume(stationsCompleted: number, options?: ReportOptions): boolean {
  startJourneyClock(options?.now ?? Date.now);
  return report(
    'game_resume',
    { resumed: true, stations_completed: stationsCompleted },
    options,
  );
}

export interface StationCompleteReport {
  /** The station's permanent identity. Converted to a journey number here. */
  order: number;
  /** The station's ASCII slug from the manifest, e.g. `music-bird`. */
  slug: string;
  /** How many stations are done once this one is counted. */
  stationsCompleted: number;
  /** Seconds spent inside the station. Omitted when it could not be measured. */
  elapsedSeconds?: number;
}

/**
 * One station finished.
 *
 * `station_number` is the journey number — the couple's own count — and never
 * `order`, for the same reason every other player-facing number is: the two
 * disagree at the second and third stations, and a funnel keyed on identity
 * would report the gnome as the second drop-off when it is the third.
 */
export function reportStationComplete(
  { order, slug, stationsCompleted, elapsedSeconds }: StationCompleteReport,
  options?: ReportOptions,
): boolean {
  return report(
    'game_step_complete',
    withElapsed(
      {
        station_number: journeyNumber(order),
        station_slug: slug,
        stations_completed: stationsCompleted,
        result: 'completed',
      },
      elapsedSeconds,
    ),
    options,
  );
}

/** All eighteen stations done. Fired once, alongside the final step event. */
export function reportGameComplete(options?: ReportOptions): boolean {
  return report(
    'game_complete',
    withElapsed(
      { stations_completed: TOTAL_STATIONS, result: 'completed' },
      journeyElapsedSeconds(options?.now ?? Date.now),
    ),
    options,
  );
}

/** The couple confirmed a restart. `stations_completed` is what they gave up. */
export function reportGameRestart(stationsCompleted: number, options?: ReportOptions): boolean {
  resetJourneyClock();
  return report('game_restart', { stations_completed: stationsCompleted }, options);
}

/**
 * The feedback form was submitted.
 *
 * The rating is a number and the result is one of two fixed words. The comment
 * the couple wrote is not passed to this function at all — there is no parameter
 * that could carry it.
 */
export function reportFeedbackSubmit(
  rating: number,
  result: 'sent' | 'failed' | 'unavailable',
  options?: ReportOptions,
): boolean {
  return report('game_feedback_submit', { rating, result }, options);
}
