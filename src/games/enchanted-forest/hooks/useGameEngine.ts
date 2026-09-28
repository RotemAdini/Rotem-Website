import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import type { GameManifest } from '../types/content.ts';
import type { GameAction, GameRules, GameState } from '../types/state.ts';
import { createGameReducer, createInitialState } from '../state/reducer.ts';
import type { ProgressStore } from '../state/persistence.ts';

interface UseGameEngineOptions {
  manifest: GameManifest;
  store: ProgressStore;
}

export interface GameEngine {
  state: GameState;
  dispatch: (action: GameAction) => void;
  /** True once the store has reported back; screens wait rather than flashing. */
  ready: boolean;
  /** Clears persisted progress and resets in-memory state. */
  restart: () => void;
}

/**
 * Wires the pure reducer to a ProgressStore.
 *
 * The reducer stays free of effects: this hook is the only place that reads or
 * writes persistence, and it does so *after* a transition has been reduced.
 * Swapping localStorage for a server store changes nothing below this line.
 */
export function useGameEngine({ manifest, store }: UseGameEngineOptions): GameEngine {
  const rules = useMemo<GameRules>(
    () => ({
      totalStations: manifest.map.totalStations,
      contentVersion: manifest.contentVersion,
      firstFlowId: manifest.flows[0]?.id ?? 'story-intro',
    }),
    [manifest],
  );

  const reducer = useMemo(() => createGameReducer(rules), [rules]);
  const [state, dispatch] = useReducer(reducer, rules, (r) => createInitialState(r));
  const [ready, setReady] = useState(false);

  // Hydration happens in an effect, never during render, so SSR and client agree.
  useEffect(() => {
    let cancelled = false;
    void store
      .load()
      .then((progress) => {
        if (cancelled) return;
        dispatch({ type: 'HYDRATE', progress });
      })
      .catch(() => {
        if (cancelled) return;
        dispatch({ type: 'HYDRATE', progress: null });
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [store]);

  /*
   * Persist whenever progress actually changes. Identity comparison is enough
   * because the reducer returns the same object when nothing changed.
   *
   * With one exception: a progress that records nothing is not written at all.
   *
   * Hydrating with no save still produces a NEW initial `Progress` object, so
   * identity alone said "changed" and the game wrote a storage key on every page
   * load — including for somebody who opened the route, looked at the title
   * screen and left. That key held nothing anyone needs (`gameStarted: false`,
   * no completions), and writing it meant the game touched a visitor's browser
   * storage before they had done anything at all. It also means the same thing
   * after a restart, where the store has just been cleared on purpose and
   * re-creating the key immediately would undo that.
   *
   * The couple's first real act — reaching the map — flips `gameStarted`, and
   * that is the first thing worth saving.
   */
  const lastSaved = useRef(state.progress);
  useEffect(() => {
    if (!state.hydrated) return;
    if (state.progress === lastSaved.current) return;
    lastSaved.current = state.progress;

    const nothingToSave =
      !state.progress.gameStarted && state.progress.completedStations.length === 0;
    if (nothingToSave) return;

    void store.save(state.progress);
  }, [state.hydrated, state.progress, store]);

  const restart = useCallback(() => {
    void store.clear();
    dispatch({ type: 'RESTART_CONFIRMED' });
  }, [store]);

  return { state, dispatch, ready, restart };
}
