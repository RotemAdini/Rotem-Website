/**
 * Persistence boundary.
 *
 * Milestone 0 provides the *interface* plus validation and an in-memory
 * implementation. No browser API is touched here — `localStorage` arrives in
 * Milestone 3 as another implementation of `ProgressStore`, and a server-backed
 * store can replace it later without any component changing.
 *
 * See V1_ARCHITECTURE.md §8.
 */

import { CONTENT_VERSION, PROGRESS_SCHEMA_VERSION, TOTAL_STATIONS } from '../constants.ts';
import type { Progress } from '../types/state.ts';
import { createInitialProgress, normalizeCompletedStations } from './progress.ts';
import { DEFAULT_SEQUENCE, nextOpenStation, type Sequence } from './sequence.ts';

export interface ProgressStore {
  load(): Promise<Progress | null>;
  save(progress: Progress): Promise<void>;
  clear(): Promise<void>;
}

/** In-memory store. Used by tests, and as the fallback when storage is unavailable. */
export function createMemoryProgressStore(initial: Progress | null = null): ProgressStore {
  let current: Progress | null = initial;
  return {
    load: async () => current,
    save: async (progress: Progress) => {
      current = progress;
    },
    clear: async () => {
      current = null;
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validate and repair an untrusted value into a `Progress`.
 *
 * Returns `null` when the input cannot be trusted at all, which the caller
 * treats as "no save". Anything recoverable is repaired rather than rejected:
 * losing a couple's progress to a stray field would be worse than tolerating it.
 */
export function parseProgress(
  raw: unknown,
  options: { totalStations?: number; contentVersion?: number; sequence?: Sequence } = {},
): Progress | null {
  const totalStations = options.totalStations ?? TOTAL_STATIONS;
  const contentVersion = options.contentVersion ?? CONTENT_VERSION;
  const sequence = options.sequence ?? DEFAULT_SEQUENCE;

  if (!isRecord(raw)) return null;
  if (raw['schemaVersion'] !== PROGRESS_SCHEMA_VERSION) return null;

  const completedStations = normalizeCompletedStations(
    Array.isArray(raw['completedStations']) ? (raw['completedStations'] as number[]) : [],
    totalStations,
  );

  // `currentStation` is never trusted from storage: it is re-derived from the
  // completed set, which is the real record of what happened. That repairs a
  // save whose pointer was corrupted or rewound — and, since the journey's order
  // is data rather than arithmetic, it is also the whole migration story for a
  // save written before the route was changed.
  const currentStation = nextOpenStation(completedStations, sequence, totalStations);

  const gameCompleted = completedStations.length === totalStations;

  return {
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    contentVersion: typeof raw['contentVersion'] === 'number' ? raw['contentVersion'] : contentVersion,
    gameStarted: raw['gameStarted'] === true,
    currentStation,
    completedStations,
    gameCompleted,
    updatedAt: typeof raw['updatedAt'] === 'string' ? raw['updatedAt'] : new Date().toISOString(),
  };
}

export function serializeProgress(progress: Progress): string {
  return JSON.stringify(progress);
}

/** Parse a JSON string from storage. Never throws. */
export function deserializeProgress(
  json: string | null,
  options?: { totalStations?: number; contentVersion?: number; sequence?: Sequence },
): Progress | null {
  if (json === null || json === '') return null;
  try {
    return parseProgress(JSON.parse(json) as unknown, options);
  } catch {
    return null;
  }
}

/** Convenience for callers that want a guaranteed value. */
export function progressOrInitial(progress: Progress | null): Progress {
  return progress ?? createInitialProgress();
}
