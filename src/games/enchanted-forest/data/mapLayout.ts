/**
 * Where each station sits on the forest map.
 *
 * There is one map. An earlier build also carried a "classic" board — a plain
 * map with eighteen icon sprites laid over it — and this file held a second set
 * of coordinates for it (`STATION_MAP_POSITIONS`, a 1080x1920 frame, and a
 * `mapPositionFor` lookup). All of that went when the classic variant was
 * removed; what is left is the board the game actually draws.
 *
 * The artwork already paints every landmark, so nothing is laid on top of it:
 * each station is an invisible, round button centred on the place that is
 * already drawn there.
 */

import type { MapHotspot } from '../types/content.ts';

/**
 * The shape of the artwork, in its own pixels.
 *
 * The hub's plane takes its aspect ratio from this rather than hard-coding one,
 * so replacing the map with a differently-proportioned image is a one-line
 * change here and nothing else.
 */
export const MAP_DESIGN_FRAME = { width: 941, height: 1672 } as const;

/**
 * Station hotspots, measured off the artwork against a percentage grid and
 * accurate to roughly ±1%.
 *
 *   position — centre of the illustrated landmark.
 *   marker   — where the couple stand: on the path beside the landmark, never on
 *              top of it, so the place they are being invited to tap stays visible.
 *   size     — tap diameter as a percentage of the map's rendered width. Sized to
 *              the landmark, so the lake takes a bigger target than the star.
 *   landmark — what is actually drawn there. Checked against the station's own
 *              title in `mapLayout.test.ts`, and the reason a reader can tell at a
 *              glance that station 12 is the stone circle and 13 the great tree.
 */
/** Indexed by station order, 1..18 — identity, not order of play. */
export const STATION_HOTSPOTS: Readonly<Record<number, MapHotspot>> = {
  1:  { position: { x: 22.0, y: 86.3 }, marker: { x: 27.5, y: 87.8 }, size: 14, landmark: 'bird' },
  2:  { position: { x: 70.0, y: 76.0 }, marker: { x: 64.5, y: 78.0 }, size: 15, landmark: 'gnome' },
  3:  { position: { x: 43.0, y: 70.6 }, marker: { x: 56.5, y: 75.0 }, size: 18, landmark: 'flowers' },
  4:  { position: { x: 61.5, y: 63.0 }, marker: { x: 56.0, y: 64.8 }, size: 13, landmark: 'stone' },
  5:  { position: { x: 38.5, y: 57.8 }, marker: { x: 43.0, y: 59.6 }, size: 14, landmark: 'campfire' },
  6:  { position: { x: 50.0, y: 52.2 }, marker: { x: 46.0, y: 56.2 }, size: 15, landmark: 'fairy' },
  7:  { position: { x: 80.5, y: 49.5 }, marker: { x: 72.0, y: 48.5 }, size: 15, landmark: 'butterflies' },
  8:  { position: { x: 60.0, y: 42.8 }, marker: { x: 54.0, y: 44.6 }, size: 15, landmark: 'spirit' },
  9:  { position: { x: 36.5, y: 36.5 }, marker: { x: 41.5, y: 38.2 }, size: 15, landmark: 'demons' },
  10: { position: { x: 57.0, y: 34.5 }, marker: { x: 50.0, y: 34.5 }, size: 13, landmark: 'river' },
  11: { position: { x: 70.0, y: 36.2 }, marker: { x: 58.0, y: 37.5 }, size: 12, landmark: 'raft' },
  12: { position: { x: 72.5, y: 28.2 }, marker: { x: 66.0, y: 30.2 }, size: 16, landmark: 'time-circle' },
  13: { position: { x: 37.5, y: 24.5 }, marker: { x: 47.5, y: 27.3 }, size: 18, landmark: 'vision-tree' },
  14: { position: { x: 61.8, y: 18.2 }, marker: { x: 56.5, y: 19.6 }, size: 13, landmark: 'star' },
  15: { position: { x: 29.0, y: 14.5 }, marker: { x: 41.0, y: 17.8 }, size: 22, landmark: 'lake' },
  16: { position: { x: 60.4, y: 10.7 }, marker: { x: 55.5, y: 12.6 }, size: 12, landmark: 'book' },
  17: { position: { x: 73.5, y: 9.2 },  marker: { x: 78.0, y: 11.4 }, size: 14, landmark: 'unicorn' },
  // The one landmark the artwork does not let us sit on squarely. The arch is
  // painted into the extreme top-right corner (x 84-92%, y 0-5%), where a
  // full-bleed cover crop clips it on a tall phone and the map's own heading sits
  // over it. The hotspot is therefore centred on the gate's lit threshold, a few
  // percent below the arch, which keeps a whole tap target on screen across the
  // supported phone widths and leaves the arch itself visible above it.
  18: { position: { x: 83.9, y: 9.5 },  marker: { x: 78.5, y: 13.5 }, size: 12, landmark: 'gate' },
};

export function mapHotspotFor(order: number): MapHotspot {
  const hotspot = STATION_HOTSPOTS[order];
  if (!hotspot) throw new Error(`No hotspot for station order ${order}`);
  return hotspot;
}
