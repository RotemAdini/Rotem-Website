/**
 * Progression rules — pure functions, no React, no browser APIs, no content.
 *
 * Approved contract (V1_ARCHITECTURE.md §6):
 *   B1  Sequential. A station unlocks only once the one *before it in the
 *       journey* is complete. No skipping forward. Completed stations may be
 *       revisited; revisiting is read-only.
 *   B2  A station is completed only by an explicit action, never automatically.
 *
 * "Before it in the journey" used to mean "N-1". It now means the previous entry
 * of `PROGRESSION_SEQUENCE` — see `sequence.ts` for why identity and route were
 * split apart. B1 and B2 are unchanged; only the definition of "next" moved.
 *
 * Every function here returns the *same object reference* when nothing changes,
 * so callers can cheaply detect no-ops and React can skip re-renders.
 */

import { CONTENT_VERSION, PROGRESS_SCHEMA_VERSION, TOTAL_STATIONS } from '../constants.ts';
import type { Progress, StationState } from '../types/state.ts';
import {
  DEFAULT_SEQUENCE,
  nextInSequence,
  nextOpenStation,
  type Sequence,
} from './sequence.ts';

/** Injected in tests so `updatedAt` is deterministic. */
export type Clock = () => string;

const systemClock: Clock = () => new Date().toISOString();

export function createInitialProgress(
  contentVersion: number = CONTENT_VERSION,
  clock: Clock = systemClock,
): Progress {
  return {
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    contentVersion,
    gameStarted: false,
    currentStation: nextOpenStation([]),
    completedStations: [],
    gameCompleted: false,
    updatedAt: clock(),
  };
}

export function isValidStationOrder(order: number, totalStations: number = TOTAL_STATIONS): boolean {
  return Number.isInteger(order) && order >= 1 && order <= totalStations;
}

/**
 * Enforces the unique + ascending invariant and discards anything out of range.
 * Defensive: the only way bad values arrive is a corrupted or hand-edited save.
 */
export function normalizeCompletedStations(
  values: readonly number[],
  totalStations: number = TOTAL_STATIONS,
): number[] {
  const seen = new Set<number>();
  for (const value of values) {
    if (isValidStationOrder(value, totalStations)) seen.add(value);
  }
  return [...seen].sort((a, b) => a - b);
}

export function stationState(order: number, progress: Progress): StationState {
  if (progress.completedStations.includes(order)) return 'completed';
  if (order === progress.currentStation) return 'active';
  return 'locked';
}

/**
 * Whether a station may be opened.
 *
 * Note this is a pure unlock check. The reducer additionally requires
 * `gameStarted`, because stations are reached through the map and the map only
 * exists after the intro.
 */
export function canEnterStation(
  order: number,
  progress: Progress,
  totalStations: number = TOTAL_STATIONS,
): boolean {
  if (!isValidStationOrder(order, totalStations)) return false;
  return stationState(order, progress) !== 'locked';
}

export function isStationCompleted(order: number, progress: Progress): boolean {
  return progress.completedStations.includes(order);
}

/** How a station screen should behave, derived rather than stored. */
export function stationMode(order: number, progress: Progress): 'play' | 'revisit' {
  return isStationCompleted(order, progress) ? 'revisit' : 'play';
}

/**
 * Apply an explicit completion (decision B2).
 *
 * Returns `progress` unchanged — same reference — when the action is invalid,
 * the station is locked, or the station was already complete. That last case is
 * what makes revisits inert.
 *
 * ⚠️ `currentStation` is re-derived from the completed set, never nudged forward
 * from its old value. That is what makes the rewind impossible: completing a
 * revisited station 3 while standing on station 13 adds nothing to the set, so
 * `nextOpenStation` returns 13 again. Never replace it with an assignment that
 * reads the *station just completed* instead of the whole set.
 */
export function applyStationCompletion(
  progress: Progress,
  order: number,
  totalStations: number = TOTAL_STATIONS,
  clock: Clock = systemClock,
  sequence: Sequence = DEFAULT_SEQUENCE,
): Progress {
  if (!isValidStationOrder(order, totalStations)) return progress;
  if (!canEnterStation(order, progress, totalStations)) return progress;

  const completedStations = normalizeCompletedStations(
    [...progress.completedStations, order],
    totalStations,
  );
  const currentStation = nextOpenStation(completedStations, sequence, totalStations);
  const gameCompleted = completedStations.length === totalStations;

  const unchanged =
    currentStation === progress.currentStation &&
    gameCompleted === progress.gameCompleted &&
    completedStations.length === progress.completedStations.length;

  if (unchanged) return progress;

  return {
    ...progress,
    completedStations,
    currentStation,
    gameCompleted,
    updatedAt: clock(),
  };
}

/** Flips `gameStarted` when the player first reaches the map. Idempotent. */
export function markGameStarted(progress: Progress, clock: Clock = systemClock): Progress {
  if (progress.gameStarted) return progress;
  return { ...progress, gameStarted: true, updatedAt: clock() };
}

/** Completed count, for "תחנה X מתוך 18" style UI. */
export function completedCount(progress: Progress): number {
  return progress.completedStations.length;
}

/**
 * True when a saved game is worth resuming. A save that exists but was never
 * carried past the intro is treated as nothing to resume.
 */
export function hasResumableProgress(progress: Progress): boolean {
  return progress.gameStarted;
}

/**
 * Which station the map should open by itself after a completion, if any.
 *
 * Finishing a station used to drop the couple on the map to hunt for the next
 * one — four deliberate actions to cross one chapter boundary. The map now
 * carries them: the couple walk, the next place lights up, and it opens.
 *
 * Returns `null` — meaning the map simply stays open — when:
 *   - the station was a revisit, so nothing was unlocked;
 *   - the journey is finished, because the ending owns that transition;
 *   - the completed station was the last one;
 *   - the next station is not actually open, which would be a contradiction.
 *
 * Pure, and derived from the progress *after* the completion is applied, so it
 * can never disagree with what the reducer recorded.
 */
export function autoAdvanceTarget(
  completedOrder: number,
  mode: 'play' | 'revisit',
  progressAfter: Progress,
  totalStations: number = TOTAL_STATIONS,
  sequence: Sequence = DEFAULT_SEQUENCE,
): number | null {
  if (mode !== 'play') return null;
  if (progressAfter.gameCompleted) return null;
  if (!isValidStationOrder(completedOrder, totalStations)) return null;

  const next = nextInSequence(completedOrder, sequence);
  if (next === null) return null;
  if (!isValidStationOrder(next, totalStations)) return null;
  if (stationState(next, progressAfter) === 'locked') return null;
  return next;
}
