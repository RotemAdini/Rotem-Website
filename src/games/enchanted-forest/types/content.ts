/**
 * Content contracts.
 *
 * Nothing in this file knows how anything is rendered, and nothing in the state
 * layer imports it except for narrow, explicitly-typed lookups. Changing Hebrew
 * copy means editing `data/`, never a component and never the reducer.
 *
 * See V1_ARCHITECTURE.md §5.
 */

/** Logical asset name, resolved to a URL by `utils/assets` later. Never a raw path. */
export type AssetId = string;

export type StationId = `station-${string}`;

export type FlowId = 'story-intro' | 'story-origin' | 'story-elf';

/** A run of text inside a panel or bubble. */
export interface TextBlock {
  id: string;
  /** Hebrew, exactly as authored. Never interpolated or reformatted at runtime. */
  text: string;
  emphasis?: 'normal' | 'small' | 'title';
}

/**
 * Where a text panel sits on screen.
 * Exists because several PDF pages place copy in ways that fail on a 320px phone
 * (see V1_SCREEN_MAP.md §6) — the fix is data, not a special-case component.
 */
export interface PanelLayout {
  anchor?: 'top' | 'center' | 'bottom';
  /** `olive` is used by exactly one station (15). Encoded as a token, not a component. */
  tone?: 'default' | 'olive';
}

/**
 * Where a speech bubble's tail points.
 *
 * Chosen per scene so the bubble sits away from the speaker: a character low in
 * the frame gets a bubble at the top with a downward tail, and vice versa.
 * `start`/`end` are logical, so the tail lands correctly in RTL.
 */
export type BubbleTail = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end' | 'none';

/* ------------------------------------------------------------------ *
 * Story flows
 * ------------------------------------------------------------------ */

export interface StoryStep {
  id: string;
  background: AssetId;
  blocks: TextBlock[];
  /** `bubble` renders the elf's speech; `panel` is the default narrative box. */
  variant?: 'panel' | 'bubble';
  /** Small standalone caption, e.g. 'שדונית קסומה' on PDF page 7. */
  label?: string;
  panel?: PanelLayout;
  ctaLabel?: string;
  tail?: BubbleTail;
  revealDelayMs?: number;
}

export interface StoryFlowDef {
  id: FlowId;
  steps: StoryStep[];
  next: { type: 'flow'; id: FlowId } | { type: 'map' };
  /**
   * True on the final flow only. Reaching the map through it is what flips
   * `gameStarted` — see V1_SCREEN_MAP.md §7.
   */
  marksGameStarted?: boolean;
}

/* ------------------------------------------------------------------ *
 * Station steps
 * ------------------------------------------------------------------ */

interface StepBase {
  id: string;
  /** Omitted on a station's last step: the completion CTA comes from `Station.completion`. */
  ctaLabel?: string;
  /**
   * Hold the text back for this many milliseconds so the artwork registers first.
   * Ignored when the visitor prefers reduced motion.
   */
  revealDelayMs?: number;
}

/** Plain narrative/instruction panel. Covers 14 of the 18 stations outright. */
export interface BriefStep extends StepBase {
  kind: 'brief';
  blocks: TextBlock[];
  panel?: PanelLayout;
  /** `bubble` when a character in the artwork is speaking these lines. */
  presentation?: 'panel' | 'bubble';
  tail?: BubbleTail;
}

/**
 * One question of a rapid-fire round. Station 2 only.
 *
 * This replaces the `riddle` step, and the difference that matters is the gate.
 * A riddle hid its answer behind a reveal, so the step had to refuse the CTA
 * until it had been tapped — otherwise a tap forward skipped the answer. A
 * quickfire question hides nothing: it is on screen, the couple point at each
 * other, and they move on. There is nothing to unlock, so it does not gate, and
 * one question costs exactly one tap.
 *
 * `index` and `total` are carried as data rather than derived from the step's
 * position, because the questions are not the only steps in the station and the
 * badge has to read "שאלה 4 מתוך 10", not "step 6".
 */
export interface QuickfireStep extends StepBase {
  kind: 'quickfire';
  index: number;
  total: number;
  prompt: TextBlock[];
}

/** A countdown. Stations 14 (180s) and 18 (60s). */
export interface TimerStep extends StepBase {
  kind: 'timer';
  seconds: number;
  intro: TextBlock[];
  startLabel: string;
  skippable: boolean;
}

/** Count-to-N tracker. Station 7 (4 kisses). */
export interface TallyStep extends StepBase {
  kind: 'tally';
  target: number;
  intro: TextBlock[];
  itemLabel: string;
}

export type StationStep = BriefStep | QuickfireStep | TimerStep | TallyStep;

export type StationStepKind = StationStep['kind'];

/* ------------------------------------------------------------------ *
 * Stations
 * ------------------------------------------------------------------ */

/** Position of a station icon on the map, as a percentage of the design frame. */
export interface MapPosition {
  x: number;
  y: number;
}

/**
 * A station's target on the map.
 *
 * The artwork already draws every place, so a station is not an icon laid on top
 * of the picture — it is an invisible round button over the landmark that is
 * already painted there.
 */
export interface MapHotspot {
  /** Centre of the illustrated landmark, % of the prototype design frame. */
  position: MapPosition;
  /** Where the couple stand: on the path beside the landmark, not over it. */
  marker: MapPosition;
  /** Tap diameter, % of the map's rendered width. Sized to the landmark. */
  size: number;
  /** What is drawn there — 'bird', 'gnome', 'lake'. Provenance for visual QA. */
  landmark: string;
}

export interface StationCompletion {
  /** First play. Approved wording: 'סיימנו ✓'. */
  label: string;
  /**
   * Shown when replaying an already-completed station. Approved wording: 'חזרה למפה'.
   * Offering "complete" again would be misleading — the station is already done.
   */
  revisitLabel: string;
  /** Every step must have been reached before the completion CTA appears. */
  requiresAllSteps: boolean;
}

export interface Station {
  id: StationId;
  /** 1..18. The single source of sequence — locking and progress both key off this. */
  order: number;
  /**
   * Stable ASCII name for the station's scene, e.g. `music-bird`.
   *
   * The one identifier that is safe to put in an analytics event: it is content
   * identity rather than anything the couple typed, and unlike `id` it does not
   * embed `order` — a number that would be read as the station's place in the
   * journey when it is not. See `analytics/gameAnalytics.ts`.
   */
  slug: string;
  titleHe: string;
  background: AssetId;
  /** Where this station sits on the map, and where the couple stand beside it. */
  mapHotspot: MapHotspot;
  steps: StationStep[];
  completion: StationCompletion;
  /** Provenance back to the PDF, for visual QA. */
  sourcePages: number[];
}

/* ------------------------------------------------------------------ *
 * Manifest
 * ------------------------------------------------------------------ */

export interface TitleScreenDef {
  background: AssetId;
  blocks: TextBlock[];
}

export interface MapDef {
  background: AssetId;
  marker: AssetId;
  totalStations: number;
  /** Aspect of the artwork in use. The hub's plane is laid out from this. */
  designFrame: { width: number; height: number };
}

/**
 * The last beat of the game: the couple walking out of the forest.
 *
 * Separate from the elf's farewell because it is a different place. She says
 * goodbye where they first met her; then the scene changes to the overlook and
 * they are outside. Without this the ending never left her clearing, and the
 * screen the couple finished on was the same picture they started on.
 */
export interface EndingDeparture {
  /** Shown over the exit scene. Short — the picture is the beat. */
  blocks: TextBlock[];
  /** Label on the LAST farewell beat: the tap that walks them out. */
  enterLabel: string;
  /** Label on the exit scene's single button, which opens the feedback form. */
  ctaLabel: string;
}

export interface EndingDef {
  /** The scene the couple leave through, used for the closing beat. */
  background: AssetId;
  /**
   * Where the elf is waiting. The ending is her farewell, not a narrator's, so
   * she is on screen for it — the last beat moves to the exit scene as she sends
   * them back out of the forest.
   */
  speakerBackground?: AssetId;
  /** Named once, on the first beat, so the voice is unmistakably hers. */
  speaker?: string;
  blocks: TextBlock[];
  /** The exit scene. Omit and the ending simply ends on the farewell. */
  departure?: EndingDeparture;
  replayLabel: string;
}

export interface GameManifest {
  id: string;
  titleHe: string;
  contentVersion: number;
  locale: 'he-IL';
  direction: 'rtl';
  designFrame: { width: number; height: number };
  title: TitleScreenDef;
  flows: StoryFlowDef[];
  map: MapDef;
  /** Ordered by `order`, 1..18. */
  stations: Station[];
  ending: EndingDef;
}
