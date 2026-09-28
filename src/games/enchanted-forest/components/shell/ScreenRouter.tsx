import { useCallback, useEffect, useRef, useState } from 'react';

import type { GameManifest } from '../../types/content.ts';
import type { GameAction, GameState } from '../../types/state.ts';
import { applyStationCompletion, autoAdvanceTarget, completedCount } from '../../state/progress.ts';
import { journeyNumber } from '../../state/sequence.ts';
import {
  reportGameComplete,
  reportGameRestart,
  reportGameResume,
  reportGameStart,
  reportStationComplete,
} from '../../analytics/gameAnalytics.ts';
import { stationByOrder } from '../../data/stations.ts';
import { STORY_FLOWS, storyFlowById } from '../../data/story.ts';
import { AccessibilityButton } from '../ui/AccessibilityButton.tsx';
import { ConfirmDialog } from '../ui/ConfirmDialog.tsx';
import { EndingScreen } from '../screens/EndingScreen.tsx';
import { ForestMap } from '../screens/ForestMap.tsx';
import { StationScreen } from '../screens/StationScreen.tsx';
import { StoryFlow } from '../screens/StoryFlow.tsx';
import { TitleScreen } from '../screens/TitleScreen.tsx';
import { StageMessage } from './GameStage.tsx';
import stageStyles from './GameStage.module.css';

interface ScreenRouterProps {
  manifest: GameManifest;
  state: GameState;
  dispatch: (action: GameAction) => void;
  ready: boolean;
  onRestart: () => void;
  storageUnavailable: boolean;
}

interface PendingAdvance {
  /** Completion that must already be committed before its hand-off may run. */
  completedOrder: number;
  target: number;
}

/** Maps the current route to a screen. Holds no game state of its own. */
export function ScreenRouter({
  manifest,
  state,
  dispatch,
  ready,
  onRestart,
  storageUnavailable,
}: ScreenRouterProps) {
  const [confirmRestart, setConfirmRestart] = useState(false);
  /**
   * The control that asked to restart, remembered so focus can return to it.
   *
   * Captured inside the click, which is the last moment it can be: mounting the
   * dialog makes the screen behind it `inert` in the same commit, and that blurs
   * whatever was focused before any effect gets to look.
   */
  const restartOpener = useRef<HTMLElement | null>(null);
  const askToRestart = useCallback(() => {
    restartOpener.current = document.activeElement as HTMLElement | null;
    setConfirmRestart(true);
  }, []);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  /**
   * The station that unlocked on the visit just finished. Drives a one-shot
   * arrival on the map, so a new place announces itself instead of silently
   * appearing while the couple are still reading the toast.
   */
  const [unlockedOrder, setUnlockedOrder] = useState<number | null>(null);
  /**
   * The station the map will open by itself, once the couple have had a beat to
   * watch themselves arrive. Cleared by any deliberate action, so a tap always
   * wins over the timer.
   */
  const [pendingAdvance, setPendingAdvance] = useState<PendingAdvance | null>(null);
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const { route, progress } = state;

  /*
   * When the couple walked into the station they are currently in.
   *
   * Feeds `elapsed_seconds` on the completion event, which is the one number
   * that answers "which station is confusing people" without anybody having to
   * watch a couple play. Kept in a ref rather than state so reading it never
   * re-renders, and re-armed on every station entry — including a revisit, which
   * reports nothing, so the value is simply unused there.
   */
  const stationEnteredAt = useRef<number | null>(null);
  const stationKey = route.name === 'station' ? route.stationOrder : null;
  useEffect(() => {
    stationEnteredAt.current = stationKey === null ? null : Date.now();
  }, [stationKey]);

  const cancelAdvance = useCallback(() => setPendingAdvance(null), []);

  // Announce a completion once, after returning to the map.
  const announce = useCallback((message: string) => {
    setAnnouncement(message);
  }, []);

  useEffect(() => {
    if (!announcement) return;
    const timer = setTimeout(() => setAnnouncement(null), 4000);
    return () => clearTimeout(timer);
  }, [announcement]);

  /*
   * The reveal is a one-shot; clear it so re-entering the map later is quiet.
   *
   * Held until after the station has opened. The arrival animation runs 1700ms
   * and then holds its last frame, so dropping the class any earlier would snap
   * the light back to the resting halo in the middle of the beat — visible as a
   * flicker exactly when the couple are looking at it.
   */
  useEffect(() => {
    if (unlockedOrder === null) return;
    const timer = setTimeout(() => setUnlockedOrder(null), 2400);
    return () => clearTimeout(timer);
  }, [unlockedOrder]);

  /*
   * The automatic chapter change.
   *
   * Progress is already written by the time this runs — the reducer applied the
   * completion and the persistence effect saved it — so the beat below is purely
   * cosmetic and nothing is lost if it never finishes. It is abandoned the
   * moment the route stops being the map, which covers the couple opening a
   * station themselves, going back, or restarting.
   *
   * If the phone sleeps mid-beat the timeout fires late; rather than yanking
   * them into a station they cannot see, the move waits for the tab to come
   * back. React's cleanup means a stale beat can never open a second station.
   */
  useEffect(() => {
    if (pendingAdvance === null) return;

    // A completion and its route change are separate React state updates. Do
    // not throw the hand-off away merely because this effect observed the
    // station render before the reducer's map render. Wait for the committed
    // map state, then verify it still describes the same completion.
    if (route.name !== 'map') return;
    if (
      !progress.completedStations.includes(pendingAdvance.completedOrder) ||
      progress.currentStation !== pendingAdvance.target
    ) {
      setPendingAdvance(null);
      return;
    }

    let cancelled = false;
    const { target } = pendingAdvance;
    let waitingForVisible: (() => void) | null = null;

    const open = () => {
      if (cancelled) return;
      setPendingAdvance(null);
      dispatch({ type: 'OPEN_STATION', stationOrder: target });
    };

    const fire = () => {
      if (cancelled) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        waitingForVisible = () => {
          if (document.visibilityState === 'hidden') return;
          open();
        };
        document.addEventListener('visibilitychange', waitingForVisible);
        return;
      }
      open();
    };

    /*
     * Long enough to read "station complete", watch the couple walk, see the
     * next place flare — and then to sit still for a moment before it opens.
     * That last pause is the point: without it the station cut in on top of its
     * own arrival animation and the beat read as a glitch rather than a journey.
     *
     *   0ms      the couple set off (1800ms walk)
     *   0ms      the destination flares, pulses, and settles (1700ms)
     *   1800ms   they arrive, and everything is still and lit
     *   2800ms   the station opens
     *
     * The walk is the slowest thing here on purpose: it is the only moment the
     * map is a journey rather than a menu, and at 900ms nobody saw it happen.
     * Anyone who does not want to wait taps a station themselves, which cancels
     * the beat — so this is a floor on the animation, not on the player.
     * Reduced motion skips the animation, so it only needs the pause that makes
     * the change legible rather than one that waits for a walk nobody is shown.
     */
    const beat = prefersReducedMotion.current ? 900 : 2800;
    const timer = setTimeout(fire, beat);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (waitingForVisible) document.removeEventListener('visibilitychange', waitingForVisible);
    };
  }, [pendingAdvance, route.name, progress.completedStations, progress.currentStation, dispatch]);

  if (!ready) {
    return <StageMessage>טוען…</StageMessage>;
  }

  const restartDialog = confirmRestart ? (
    <ConfirmDialog
      title="להתחיל מסע חדש?"
      body="ההתקדמות הנוכחית שלכם תימחק ולא ניתן יהיה לשחזר אותה."
      confirmLabel="כן, התחילו מחדש"
      cancelLabel="ביטול"
      onConfirm={() => {
        setConfirmRestart(false);
        setPendingAdvance(null);
        reportGameRestart(completedCount(progress));
        onRestart();
      }}
      onCancel={() => setConfirmRestart(false)}
      returnFocusTo={restartOpener.current}
    />
  ) : null;

  const screen = (() => {
    switch (route.name) {
      case 'title':
        return (
          <TitleScreen
            manifest={manifest}
            progress={progress}
            storageUnavailable={storageUnavailable}
            onResume={() => {
              reportGameResume(completedCount(progress));
              dispatch({ type: 'RESUME' });
            }}
            onStartNew={() => {
              // Confirm first when there is something to lose. The restart is
              // reported from the dialog's confirm, and the fresh start from the
              // next tap on this button, so a cancelled restart reports nothing.
              if (progress.gameStarted) askToRestart();
              else {
                reportGameStart();
                dispatch({ type: 'START_NEW' });
              }
            }}
          />
        );

      case 'flow': {
        const flow = storyFlowById(route.flowId);
        if (!flow) return <StageMessage>שגיאה: זרימת סיפור לא נמצאה</StageMessage>;

        /*
         * Where back goes.
         *
         * Within a flow it is the previous screen. At a flow's FIRST screen it is
         * the last screen of the flow before it, which is why OPEN_FLOW carries a
         * step — otherwise crossing a chapter boundary backwards would dump the
         * couple at that chapter's beginning. At the very first screen of the
         * opening there is nothing behind it but the title, so that is where it
         * goes; `undefined` would leave the control off the screen entirely, and
         * the title is a real place they came from.
         */
        const flowIndex = STORY_FLOWS.findIndex((f) => f.id === flow.id);
        const previousFlow = flowIndex > 0 ? STORY_FLOWS[flowIndex - 1] : undefined;
        const onBack = () => {
          setPendingAdvance(null);
          if (route.step > 0) {
            dispatch({ type: 'PREV_STEP' });
            return;
          }
          if (previousFlow) {
            dispatch({
              type: 'OPEN_FLOW',
              flowId: previousFlow.id,
              step: previousFlow.steps.length - 1,
            });
            return;
          }
          dispatch({ type: 'GO_TO_TITLE' });
        };

        return (
          <StoryFlow
            flow={flow}
            step={route.step}
            onBack={onBack}
            onNext={() => {
              const isLast = route.step >= flow.steps.length - 1;
              if (!isLast) {
                dispatch({ type: 'NEXT_STEP', stepCount: flow.steps.length });
                return;
              }
              if (flow.next.type === 'flow') dispatch({ type: 'OPEN_FLOW', flowId: flow.next.id });
              // Reaching the map through the final flow is what flips `gameStarted`.
              else dispatch({ type: 'COMPLETE_INTRO' });
            }}
          />
        );
      }

      case 'map':
        return (
          <ForestMap
            manifest={manifest}
            progress={progress}
            announcement={announcement}
            unlockedOrder={unlockedOrder}
            onOpenStation={(order) => {
              cancelAdvance();
              dispatch({ type: 'OPEN_STATION', stationOrder: order });
            }}
            onOpenEnding={() => {
              cancelAdvance();
              dispatch({ type: 'OPEN_ENDING' });
            }}
            onRestart={() => {
              cancelAdvance();
              askToRestart();
            }}
          />
        );

      case 'station': {
        const station = stationByOrder(route.stationOrder);
        if (!station) return <StageMessage>שגיאה: תחנה לא נמצאה</StageMessage>;

        return (
          <StationScreen
            station={station}
            step={route.step}
            mode={route.mode}
            onNextStep={() => dispatch({ type: 'NEXT_STEP', stepCount: station.steps.length })}
            onBack={() => {
              setPendingAdvance(null);
              dispatch({ type: 'BACK_TO_MAP' });
            }}
            onComplete={() => {
              if (route.mode === 'play') {
                // Decided from the progress this completion produces, using the
                // same pure helper the reducer's rules are built from — never
                // from the route, which a stale render could disagree with.
                const after = applyStationCompletion(
                  progress,
                  station.order,
                  manifest.map.totalStations,
                );
                const target = autoAdvanceTarget(
                  station.order,
                  'play',
                  after,
                  manifest.map.totalStations,
                );
                /*
                 * Reported here, beside the completion it describes, rather than
                 * from an effect watching progress: this is the only place that
                 * knows the visit was a play and not a revisit, and it already
                 * holds the progress the completion produces. Both calls are
                 * fire-and-forget — see `analyticsBridge`.
                 */
                reportStationComplete({
                  order: station.order,
                  slug: station.slug,
                  stationsCompleted: after.completedStations.length,
                  ...(stationEnteredAt.current === null
                    ? {}
                    : {
                        elapsedSeconds: Math.round(
                          (Date.now() - stationEnteredAt.current) / 1000,
                        ),
                      }),
                });
                if (after.gameCompleted) reportGameComplete();

                // Counted along the journey, not by identity — see `journeyNumber`.
                announce(`תחנה ${journeyNumber(station.order)} הושלמה — ${station.titleHe}`);
                setUnlockedOrder(target);
                setPendingAdvance(
                  target === null ? null : { completedOrder: station.order, target },
                );
              }
              dispatch({ type: 'COMPLETE_STATION', stationOrder: station.order });
            }}
          />
        );
      }

      case 'ending':
        return (
          <EndingScreen
            manifest={manifest}
            onReplay={askToRestart}
            onBackToMap={() => dispatch({ type: 'BACK_TO_MAP' })}
          />
        );

      default: {
        const never: never = route;
        return never;
      }
    }
  })();

  // Keyed on the screen identity, so React remounts and the cross-fade runs on a
  // real screen change — not on every step inside one.
  const screenKey = route.name === 'station' ? `station:${route.stationOrder}` : route.name;

  return (
    <>
      {/*
        `inert` is the other half of the restart dialog being modal.

        `aria-modal` tells a screen reader the rest of the page is out of play;
        it does not make it so. The map underneath stayed focusable and
        browsable, so a reader could walk out of the dialog and tab around
        eighteen stations while a question about erasing the journey sat
        unanswered on top of them. `inert` takes the whole screen out of the
        focus order and out of the accessibility tree for as long as the dialog
        is up, which is what the dialog's own focus trap assumes.
      */}
      <div key={screenKey} className={stageStyles.screenEnter} inert={confirmRestart}>
        {screen}
      </div>
      {/*
        Outside the keyed screen wrapper, so the site's accessibility control is
        not remounted — and re-animated — on every screen change; and inside its
        own `inert` wrapper, so it is taken out of the focus order along with
        everything else while the restart dialog is modal. A control that floats
        above the screen but not above the dialog is the one case the dialog's
        focus trap cannot handle on its own.
      */}
      <div inert={confirmRestart}>
        <AccessibilityButton />
      </div>
      {restartDialog}
    </>
  );
}
