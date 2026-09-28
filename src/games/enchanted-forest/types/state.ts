/**
 * State contracts.
 *
 * This file — and the whole `state/` folder — is deliberately free of browser
 * APIs, React and content. It is plain data plus pure functions, so it can be
 * unit-tested directly and later driven by either localStorage or a server.
 *
 * See V1_ARCHITECTURE.md §6 and §7.
 */

import type { FlowId } from './content.ts';

/**
 * Everything V1 persists. Nothing else.
 *
 * Explicitly NOT stored: anything the couple says or types, who they pointed at,
 * timer state, tally counts, or the current step. Those are ephemeral by design.
 */
export interface Progress {
  schemaVersion: number;
  contentVersion: number;
  /** Flips true when the player first reaches the map, not when they tap Start. */
  gameStarted: boolean;
  /**
   * The next playable station, 1..totalStations. Equals totalStations+1 when finished.
   *
   * Derived, never authoritative: it is always the first entry of
   * PROGRESSION_SEQUENCE missing from `completedStations`. Stored only so the UI
   * does not recompute it on every render, and recomputed on load.
   */
  currentStation: number;
  /** Unique and ascending. Invariant enforced by `normalizeCompletedStations`. */
  completedStations: number[];
  gameCompleted: boolean;
  updatedAt: string;
}

export type StationState = 'locked' | 'active' | 'completed';

/** How a station screen was entered. Derived from progress, never stored. */
export type StationMode = 'play' | 'revisit';

export type Route =
  | { name: 'title' }
  | { name: 'flow'; flowId: FlowId; step: number }
  | { name: 'map' }
  | { name: 'station'; stationOrder: number; step: number; mode: StationMode }
  | { name: 'ending' };

export interface GameState {
  route: Route;
  progress: Progress;
  /** False until a ProgressStore has reported back. Screens show a neutral wait. */
  hydrated: boolean;
}

/**
 * Rules the reducer needs but that are not *content*.
 * Passing these instead of the manifest keeps the reducer independent of copy and assets.
 */
export interface GameRules {
  totalStations: number;
  contentVersion: number;
  /** Where START_NEW begins. */
  firstFlowId: FlowId;
}

export type GameAction =
  /** Result of ProgressStore.load(). `null` means "no save found". */
  | { type: 'HYDRATE'; progress: Progress | null }
  /** Discard any progress and begin the intro. */
  | { type: 'START_NEW' }
  /** Continue a saved game. Falls back to the intro if it was never really started. */
  | { type: 'RESUME' }
  /** End of the final story flow: flips `gameStarted` and opens the map. */
  | { type: 'COMPLETE_INTRO' }
  /**
   * `step` exists so a flow can be re-entered at its END. Going back from the
   * first screen of one flow means the last screen of the one before it, and
   * without this the only way in was the beginning.
   */
  | { type: 'OPEN_FLOW'; flowId: FlowId; step?: number }
  /** `stepCount` lets the reducer clamp without knowing any content. */
  | { type: 'NEXT_STEP'; stepCount?: number }
  | { type: 'PREV_STEP' }
  | { type: 'OPEN_STATION'; stationOrder: number }
  | { type: 'COMPLETE_STATION'; stationOrder: number }
  | { type: 'BACK_TO_MAP' }
  /**
   * Reopen the ending after returning to the map from it. Pure navigation: the
   * reducer refuses it unless the journey is already complete, so it can never
   * be used to skip ahead.
   */
  | { type: 'OPEN_ENDING' }
  | { type: 'GO_TO_TITLE' }
  /** Only ever dispatched after the user confirms in RestartDialog. */
  | { type: 'RESTART_CONFIRMED' };
