/**
 * The assembled game manifest — the single object the UI will read from.
 *
 * MILESTONE 0: structure is real, copy is placeholder. See `stations.ts`.
 */

import { CONTENT_VERSION, GAME_ID, TOTAL_STATIONS } from '../constants.ts';
import type { GameManifest, MapDef } from '../types/content.ts';
import { validateSequence } from '../state/sequence.ts';
import { MAP_DESIGN_FRAME } from './mapLayout.ts';
import { STATIONS } from './stations.ts';
import { STORY_FLOWS } from './story.ts';

/**
 * The map. There is exactly one.
 *
 * An earlier build carried a second, "classic" board — a plain map with eighteen
 * icon sprites laid over it — behind a `MAP_VARIANT` switch. It was removed once
 * the illustrated map became the only one anybody intended to ship: keeping it
 * meant every station carried two sets of coordinates, the hub branched on which
 * kind of target to draw, and 2.3 MB of icons and a spare board rode along in
 * every deploy for a code path that had never run in production.
 */
export const ACTIVE_MAP: MapDef = {
  background: 'map-forest-prototype',
  marker: 'map-couple-silhouette',
  totalStations: TOTAL_STATIONS,
  designFrame: MAP_DESIGN_FRAME,
};

export const ENCHANTED_FOREST: GameManifest = {
  id: GAME_ID,
  titleHe: 'מסע האהבה ביער הקסום',
  contentVersion: CONTENT_VERSION,
  locale: 'he-IL',
  direction: 'rtl',
  designFrame: ACTIVE_MAP.designFrame,

  title: {
    background: 'bg-cover-forest-day',
    blocks: [{ id: 'cover-title', text: 'מסע האהבה ביער הקסום', emphasis: 'title' }],
  },

  flows: STORY_FLOWS,

  map: ACTIVE_MAP,

  stations: STATIONS,

  // PDF page 54, verbatim. The elf sees them out of the forest.
  ending: {
    background: 'bg-ending-forest-overlook',
    speakerBackground: 'bg-story-elf-night-forest',
    speaker: 'שדונית היער',
    blocks: [
      { id: 'end-1', text: '✨ הגעתם לסיום המסע! ✨', emphasis: 'title' },
      { id: 'end-2', text: 'כל הכבוד לכם, הגעתם לסיום הדרך ביער הקסום!' },
      {
        id: 'end-3',
        text: 'עברתם את כל המשימות, חוויתם רגעים קסומים, התקרבתם אחד לשני, ובסופו של דבר - הצלחתם לצאת מהיער הזה יחד.',
      },
      { id: 'end-4', text: 'אני כל כך גאה בכם!' },
      {
        id: 'end-5',
        text: 'זכרו - כל רגע ששיתפתם היה חלק מהקסם. אל תשכחו להמשיך ליצור רגעים קסומים גם מחוץ ליער.',
      },
      {
        id: 'end-6',
        // Evergreen replacement, approved: the game is no longer a New Year product.
        text: 'מאחלת לכם עוד המון רגעים של אהבה, חוויות וקסם יחד.',
      },
      { id: 'end-7', text: 'אני כאן תמיד, ביער הקסום. עד לפעם הבאה 😉' },
    ],
    /*
     * The image this game was always supposed to end on.
     *
     * `bg-ending-forest-overlook` — the moonlit overlook above the valley, with
     * the sign that says they are leaving — was authored, exported and then never
     * rendered: the farewell set `speakerBackground` so the elf could stay in
     * frame for her own first-person lines, and nothing ever switched away from
     * her. The couple's last screen was therefore the same picture as their
     * first sight of her, an hour earlier.
     *
     * So the ending is now two places rather than one. She says goodbye in her
     * clearing; the last tap of her farewell walks them out, the scene changes,
     * and THIS is the screen they are standing on when the journey is over.
     */
    departure: {
      /*
       * Two lines, and neither is a title: the screen already carries one in its
       * crown, and the picture is meant to be the beat here. A second heading
       * competing with the first would turn the last thing the couple see into a
       * layout.
       */
      blocks: [
        { id: 'depart-1', text: 'ויצאתם מהיער, יד ביד.' },
        { id: 'depart-2', text: 'הקסם לא נשאר מאחור - הוא הולך איתכם הביתה.' },
      ],
      enterLabel: 'לצאת מהיער',
      ctaLabel: 'ספרו לנו איך היה',
    },
    replayLabel: 'שחקו שוב',
  },
};

/**
 * Structural self-check. Cheap, and it catches a mis-authored data file the
 * moment someone edits `stations.ts` rather than at render time.
 */
export function validateManifest(manifest: GameManifest): string[] {
  const errors: string[] = [];
  const { stations } = manifest;

  if (stations.length !== manifest.map.totalStations) {
    errors.push(`Expected ${manifest.map.totalStations} stations, found ${stations.length}`);
  }

  const orders = stations.map((s) => s.order);
  const uniqueOrders = new Set(orders);
  if (uniqueOrders.size !== orders.length) errors.push('Duplicate station order values');

  for (let expected = 1; expected <= manifest.map.totalStations; expected += 1) {
    if (!uniqueOrders.has(expected)) errors.push(`Missing station with order ${expected}`);
  }

  const ids = new Set<string>();
  for (const station of stations) {
    if (ids.has(station.id)) errors.push(`Duplicate station id: ${station.id}`);
    ids.add(station.id);
    if (station.steps.length === 0) errors.push(`Station ${station.id} has no steps`);
  }

  errors.push(...validateSequence(undefined, manifest.map.totalStations));

  for (let i = 1; i < stations.length; i += 1) {
    const previous = stations[i - 1];
    const current = stations[i];
    if (previous && current && previous.order >= current.order) {
      errors.push('Stations are not sorted ascending by order');
      break;
    }
  }

  return errors;
}
