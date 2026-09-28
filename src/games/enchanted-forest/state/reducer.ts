/**
 * Navigation + progression reducer.
 *
 * Pure: no React, no browser APIs, no content imports. Persistence is a side
 * effect the host performs *after* a transition, by writing `state.progress`
 * through a ProgressStore.
 *
 * Access rules are enforced here, not in the UI. An OPEN_STATION for a locked
 * station is rejected even if a component dispatches it by mistake.
 *
 * Unknown or illegal actions return the *same state reference*, so a bad
 * dispatch can never corrupt state or trigger a re-render.
 */

import { CONTENT_VERSION, TOTAL_STATIONS } from '../constants.ts';
import type { GameAction, GameRules, GameState, Progress } from '../types/state.ts';
import {
  applyStationCompletion,
  canEnterStation,
  createInitialProgress,
  isValidStationOrder,
  markGameStarted,
  stationMode,
  type Clock,
} from './progress.ts';

export const DEFAULT_GAME_RULES: GameRules = {
  totalStations: TOTAL_STATIONS,
  contentVersion: CONTENT_VERSION,
  firstFlowId: 'story-intro',
};

export function createInitialState(
  rules: GameRules = DEFAULT_GAME_RULES,
  clock?: Clock,
): GameState {
  return {
    route: { name: 'title' },
    progress: createInitialProgress(rules.contentVersion, clock),
    hydrated: false,
  };
}

/**
 * Builds the reducer. `rules` carries the few non-content facts the reducer
 * needs; `clock` is injectable so tests get deterministic timestamps.
 */
export function createGameReducer(rules: GameRules = DEFAULT_GAME_RULES, clock?: Clock) {
  const total = rules.totalStations;

  const startFresh = (state: GameState, atTitle: boolean): GameState => ({
    ...state,
    progress: createInitialProgress(rules.contentVersion, clock),
    route: atTitle ? { name: 'title' } : { name: 'flow', flowId: rules.firstFlowId, step: 0 },
  });

  const withProgress = (state: GameState, progress: Progress): GameState =>
    progress === state.progress ? state : { ...state, progress };

  return function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
      case 'HYDRATE': {
        const progress = action.progress ?? createInitialProgress(rules.contentVersion, clock);
        return { ...state, progress, hydrated: true };
      }

      case 'START_NEW':
        return startFresh(state, false);

      case 'RESTART_CONFIRMED':
        return startFresh(state, true);

      case 'GO_TO_TITLE':
        return state.route.name === 'title' ? state : { ...state, route: { name: 'title' } };

      case 'RESUME': {
        // A save that never reached the map is not resumable — replay the intro.
        if (!state.progress.gameStarted) {
          return { ...state, route: { name: 'flow', flowId: rules.firstFlowId, step: 0 } };
        }
        return { ...state, route: { name: 'map' } };
      }

      case 'OPEN_FLOW': {
        // Negative or fractional steps are refused rather than clamped: the
        // caller is either naming a real screen or it has a bug.
        const step =
          action.step !== undefined && Number.isInteger(action.step) && action.step >= 0
            ? action.step
            : 0;
        return { ...state, route: { name: 'flow', flowId: action.flowId, step } };
      }

      case 'COMPLETE_INTRO': {
        // Reaching the map for the first time is what flips `gameStarted`.
        const progress = markGameStarted(state.progress, clock);
        return { ...state, progress, route: { name: 'map' } };
      }

      case 'NEXT_STEP': {
        const { route } = state;
        if (route.name !== 'flow' && route.name !== 'station') return state;

        const next = route.step + 1;
        // When the caller knows its content length, refuse to run past the end.
        // Ending a flow or station is an explicit action, not a step overflow.
        if (action.stepCount !== undefined && next >= action.stepCount) return state;

        return { ...state, route: { ...route, step: next } };
      }

      case 'PREV_STEP': {
        const { route } = state;
        if (route.name !== 'flow' && route.name !== 'station') return state;
        if (route.step <= 0) return state;
        return { ...state, route: { ...route, step: route.step - 1 } };
      }

      case 'OPEN_STATION': {
        const order = action.stationOrder;

        // Three independent guards. Any one of them rejects the action outright.
        if (!isValidStationOrder(order, total)) return state;
        if (!state.progress.gameStarted) return state;
        if (!canEnterStation(order, state.progress, total)) return state;

        return {
          ...state,
          route: {
            name: 'station',
            stationOrder: order,
            step: 0,
            mode: stationMode(order, state.progress),
          },
        };
      }

      case 'COMPLETE_STATION': {
        const order = action.stationOrder;
        if (!isValidStationOrder(order, total)) return state;
        if (!canEnterStation(order, state.progress, total)) return state;

        // Decided from progress rather than the route, so a stale or spoofed
        // route cannot turn a revisit into a re-completion.
        const isRevisit = stationMode(order, state.progress) === 'revisit';
        if (isRevisit) {
          // 'חזרה למפה' — return to the map, touch nothing.
          return { ...state, route: { name: 'map' } };
        }

        const progress = applyStationCompletion(state.progress, order, total, clock);
        const next = withProgress(state, progress);
        return {
          ...next,
          route: progress.gameCompleted ? { name: 'ending' } : { name: 'map' },
        };
      }

      case 'OPEN_ENDING':
        // Reachable only once the journey is finished; writes nothing.
        if (!state.progress.gameCompleted) return state;
        return state.route.name === 'ending' ? state : { ...state, route: { name: 'ending' } };

      case 'BACK_TO_MAP':
        // Leaving a station never completes it and never writes progress.
        return state.route.name === 'map' ? state : { ...state, route: { name: 'map' } };

      default:
        return state;
    }
  };
}

export type GameReducer = ReturnType<typeof createGameReducer>;
