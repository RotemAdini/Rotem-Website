import { useEffect, useMemo } from 'react';

import { ENCHANTED_FOREST } from './data/game.ts';
import { useGameEngine } from './hooks/useGameEngine.ts';
import { createLocalProgressStore } from './state/localStorageStore.ts';
import type { ProgressStore } from './state/persistence.ts';
import { GameStage, StageMessage } from './components/shell/GameStage.tsx';
import { ScreenRouter } from './components/shell/ScreenRouter.tsx';
import { assetUrl } from './utils/assets.ts';
import { preloadImage } from './utils/imageLoading.ts';

export interface EnchantedForestGameProps {
  /**
   * Whether the visitor may play. The host site decides this; the game only
   * reads it and never fetches or computes entitlement itself.
   *
   * This is a UX convenience, NOT a security boundary — the real gate is the
   * host's server-side route check. See V1_ARCHITECTURE.md §9.
   */
  allowed?: boolean;
  /** Defaults to localStorage. A server-backed store can be injected later. */
  progressStore?: ProgressStore;
}

/**
 * Public entry point for the `enchanted-forest` game.
 *
 * Self-contained: it owns its direction, tokens and styles, holds no routing,
 * and knows nothing about auth, payments or the surrounding site.
 *
 * ── What the host owes it ──────────────────────────────────────────────────
 *
 * One number: how tall its stage is. The game fills the box it is given and
 * never scrolls the page, so if the host draws chrome above the mount point it
 * has to say so — otherwise the stage runs past the bottom of the viewport by
 * the height of that chrome and the action dock goes below the fold.
 *
 *   .game-slot { --ef-stage-height: calc(100dvh - var(--site-header-height)); }
 *
 * Set on any ancestor of the mount point. It defaults to `100dvh`, which is
 * correct for a full-bleed route with no chrome, so a host that has none needs
 * to do nothing. Inside an already-sized wrapper, `--ef-stage-height: 100%`.
 *
 * Nothing else is required — the game ships its own box model, so it renders
 * correctly on a host page with no CSS reset at all.
 */
export function EnchantedForestGame({ allowed = true, progressStore }: EnchantedForestGameProps) {
  // Created once per mount so the hook's effects do not re-run every render.
  const store = useMemo(() => progressStore ?? createLocalProgressStore(), [progressStore]);

  const storageUnavailable = useMemo(
    () => 'persistent' in store && (store as { persistent?: boolean }).persistent === false,
    [store],
  );

  const engine = useGameEngine({ manifest: ENCHANTED_FOREST, store });

  // Start fetching and decoding the 3.3 MB map while the couple are still in
  // the opening story. Once it is ready, warm the first station too. This
  // preserves the full-resolution artwork while making both first visits cache
  // hits instead of competing requests at the moment of navigation.
  useEffect(() => {
    const mapUrl = assetUrl(ENCHANTED_FOREST.map.background);
    if (!mapUrl) return;

    // `0` = no deadline. Nothing on screen is waiting for either of these, and
    // the point of the chain is that the station does not compete with the map.
    void preloadImage(mapUrl, 'low', 0).then(() => {
      const firstStationUrl = assetUrl(ENCHANTED_FOREST.stations[0]?.background ?? '');
      if (firstStationUrl) void preloadImage(firstStationUrl, 'low', 0);
    });
  }, []);

  if (!allowed) {
    return (
      <GameStage>
        <StageMessage>המשחק אינו זמין בחשבון הזה.</StageMessage>
      </GameStage>
    );
  }

  return (
    <GameStage>
      <ScreenRouter
        manifest={ENCHANTED_FOREST}
        state={engine.state}
        dispatch={engine.dispatch}
        ready={engine.ready}
        onRestart={engine.restart}
        storageUnavailable={storageUnavailable}
      />
    </GameStage>
  );
}

export default EnchantedForestGame;
