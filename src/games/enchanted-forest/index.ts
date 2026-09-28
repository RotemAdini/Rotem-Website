/**
 * Public API of the `enchanted-forest` game module.
 *
 * The host site interacts with this module through exactly three things:
 *   - an `allowed` boolean it computes itself (entitlement is never decided here)
 *   - an optional `ProgressStore` implementation
 *   - two DOM events it may listen for: `rotem:analytics` and
 *     `rotem:accessibility-open`
 *
 * It contains no routing, no authentication, no payment logic and no entitlement
 * check, and it loads no analytics provider. See INTEGRATION.md for the whole
 * contract and V1_ARCHITECTURE.md §9 for why it is shaped this way.
 */

export { EnchantedForestGame, default as EnchantedForestGameDefault } from './EnchantedForestGame.tsx';
export type { EnchantedForestGameProps } from './EnchantedForestGame.tsx';

export { createLocalProgressStore, detectStorage } from './state/localStorageStore.ts';
export type { LocalProgressStore, StorageLike } from './state/localStorageStore.ts';

export { assetUrl, isAssetAvailable, MISSING_ASSETS } from './utils/assets.ts';

export {
  GAME_ID,
  GAME_PLAY_ROUTE,
  TOTAL_STATIONS,
  CONTENT_VERSION,
  PROGRESS_SCHEMA_VERSION,
  PROGRESS_STORAGE_KEY,
  LEGACY_PROGRESS_STORAGE_KEYS,
  STORAGE_NAMESPACE,
  PROGRESSION_SEQUENCE,
} from './constants.ts';
export type { GameId } from './constants.ts';

export { journeyNumber } from './state/sequence.ts';

/*
 * The two events the host site listens for.
 *
 * Exported as constants so the site can subscribe by importing the name rather
 * than re-typing the string — a typo in either one fails silently by design,
 * which is exactly the kind of bug that is never found.
 */
export {
  ANALYTICS_EVENT_NAME,
  isSafeLabel,
  sanitizeParams,
} from '../../shared/analytics/analyticsBridge.ts';
export type {
  AnalyticsEventDetail,
  AnalyticsEventName,
  AnalyticsParams,
  AnalyticsParamValue,
} from '../../shared/analytics/analyticsBridge.ts';

export { ACCESSIBILITY_OPEN_EVENT } from '../../shared/accessibility/accessibilityBridge.ts';

export { FEEDBACK_COMMENT_MAX_LENGTH } from '../../shared/feedback/feedbackClient.ts';

export type {
  AssetId,
  BriefStep,
  EndingDef,
  EndingDeparture,
  FlowId,
  GameManifest,
  MapDef,
  MapPosition,
  PanelLayout,
  QuickfireStep,
  Station,
  StationCompletion,
  StationId,
  StationStep,
  StationStepKind,
  StoryFlowDef,
  StoryStep,
  TallyStep,
  TextBlock,
  TimerStep,
  TitleScreenDef,
} from './types/content.ts';

export type {
  GameAction,
  GameRules,
  GameState,
  Progress,
  Route,
  StationMode,
  StationState,
} from './types/state.ts';

export {
  applyStationCompletion,
  canEnterStation,
  completedCount,
  createInitialProgress,
  hasResumableProgress,
  isStationCompleted,
  isValidStationOrder,
  markGameStarted,
  normalizeCompletedStations,
  stationMode,
  stationState,
} from './state/progress.ts';
export type { Clock } from './state/progress.ts';

export { createGameReducer, createInitialState, DEFAULT_GAME_RULES } from './state/reducer.ts';
export type { GameReducer } from './state/reducer.ts';

export {
  createMemoryProgressStore,
  deserializeProgress,
  parseProgress,
  progressOrInitial,
  serializeProgress,
} from './state/persistence.ts';
export type { ProgressStore } from './state/persistence.ts';

export { ENCHANTED_FOREST, validateManifest } from './data/game.ts';
export { STATIONS, STATION_COMPLETION, stationByOrder } from './data/stations.ts';
export { STORY_FLOWS, storyFlowById } from './data/story.ts';
export { MAP_DESIGN_FRAME, STATION_HOTSPOTS, mapHotspotFor } from './data/mapLayout.ts';
