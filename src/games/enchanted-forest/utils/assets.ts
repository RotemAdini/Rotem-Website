/**
 * Asset id -> URL resolution.
 *
 * Components reference assets by logical id only, never by path, so the file
 * layout, format and CDN can change without touching a component or the data.
 *
 * Assets that do not exist yet resolve to `null`. Callers render a clearly
 * marked placeholder instead — a missing cosmetic asset must never block play.
 * The authoritative gap list is CANVA_ASSETS_REQUEST.md.
 *
 * The eighteen `icon-*` sprites and `map-forest-clean` used to live here. They
 * belonged to the "classic" map variant — a plain board with icons laid over it
 * — which was removed along with them; the illustrated map draws every landmark
 * itself and needs no sprites.
 *
 * ── Why every background is a .webp ────────────────────────────────────────
 *
 * Each one is a DERIVED production encoding, made from a lossless PNG master.
 *
 * Encoding from those masters rather than from the JPEGs the game used to
 * serve is the whole reason it was worth doing. A JPEG -> WebP re-encode
 * inherits the JPEG's artefacts and adds its own, so it can only be worse than
 * the file it replaces; measured on this artwork it was also barely smaller,
 * because those JPEGs were already well optimised — 3% off for a full dB of
 * quality lost. From the master instead, every one of the twenty-four came out
 * *both* closer to the original artwork than the JPEG AND about a quarter
 * smaller, verified individually: same pixel dimensions, decodes to real image
 * data, higher PSNR against its master than the JPEG scores. Total 8.78 MB ->
 * 6.77 MB.
 *
 * ⚠️ Neither those masters nor the superseded JPEGs are in this repo any more.
 * They were verified by sha256 and moved to
 *
 *   C:\גיבויים של דברים מהאתר\היער הקסום\public-images\
 *
 * which also holds the map's PNG master. The repo serves artwork; it is not
 * where source art is kept. So falling back to a JPEG is a two-step change —
 * restore the file from that backup into `backgrounds/`, then point the entry
 * below at it — and `assets.test.ts` fails if you do only one of the two,
 * because it checks that everything named here both exists and sits inside a
 * directory the build copies.
 *
 * WebP is supported everywhere this game already works: it needs `inert`
 * (Safari 15.5) and `dvh` (Safari 15.4), both of which land well after WebP
 * (Safari 14).
 */

import type { AssetId } from '../types/content.ts';

const BASE = '/games/enchanted-forest/images';

/** Assets confirmed present on disk. Anything absent here is still missing. */
const ASSET_URLS: Readonly<Record<string, string>> = {
  /*
   * The hub's artwork, as a DERIVED production encoding.
   *
   * The source export — `map-forest-prototype.png`, 3.35 MB, 941x1672, 8-bit
   * RGB with no alpha — lives in the external backup beside the background
   * masters (see the note at the top of this file), not here. It was the single
   * heaviest thing the game ever fetched, on the critical path, and once the
   * WebP existed nothing requested it again: bandwidth, decode time and a
   * decoded bitmap held in memory for the whole session, for a file no browser
   * would ask for.
   *
   * The WebP is visually equivalent at 745 KB — a 78% reduction, PSNR 34.8 dB
   * against the source, measured rather than assumed — and it is lossy only in
   * the sense that a photograph is.
   */
  'map-forest-prototype': `${BASE}/map/map-forest-prototype.webp`,
  'map-couple-silhouette': `${BASE}/map/map-couple-silhouette.png`,

  'bg-cover-forest-day': `${BASE}/backgrounds/bg-cover-forest-day.webp`,
  'bg-story-night-forest-couple': `${BASE}/backgrounds/bg-story-night-forest-couple.webp`,
  'bg-story-forest-road-car': `${BASE}/backgrounds/bg-story-forest-road-car.webp`,
  'bg-story-lantern-path': `${BASE}/backgrounds/bg-story-lantern-path.webp`,
  'bg-story-elf-night-forest': `${BASE}/backgrounds/bg-story-elf-night-forest.webp`,
  // Renamed with the 2026-09 art pass: the closing scene is now a moonlit
  // overlook above the valley, with the sign that tells them they are leaving
  // the forest. 'sunset' described artwork that no longer exists.
  'bg-ending-forest-overlook': `${BASE}/backgrounds/bg-ending-forest-overlook.webp`,

  'bg-st01-music-bird': `${BASE}/backgrounds/bg-st01-music-bird.webp`,
  'bg-st02-riddle-gnome': `${BASE}/backgrounds/bg-st02-riddle-gnome.webp`,
  'bg-st03-gratitude-flowers': `${BASE}/backgrounds/bg-st03-gratitude-flowers.webp`,
  'bg-st04-adventure-stone': `${BASE}/backgrounds/bg-st04-adventure-stone.webp`,
  'bg-st05-renewal-bonfire': `${BASE}/backgrounds/bg-st05-renewal-bonfire.webp`,
  'bg-st06-love-fairy': `${BASE}/backgrounds/bg-st06-love-fairy.webp`,
  'bg-st07-kiss-butterflies': `${BASE}/backgrounds/bg-st07-kiss-butterflies.webp`,
  'bg-st08-telepathy-spirit': `${BASE}/backgrounds/bg-st08-telepathy-spirit.webp`,
  'bg-st09-demons': `${BASE}/backgrounds/bg-st09-demons.webp`,
  'bg-st10-memory-river': `${BASE}/backgrounds/bg-st10-memory-river.webp`,
  'bg-st11-raft': `${BASE}/backgrounds/bg-st11-raft.webp`,
  'bg-st12-time-circle': `${BASE}/backgrounds/bg-st12-time-circle.webp`,
  'bg-st13-vision-tree': `${BASE}/backgrounds/bg-st13-vision-tree.webp`,
  'bg-st14-magnet-star': `${BASE}/backgrounds/bg-st14-magnet-star.webp`,
  'bg-st15-reflection-lake': `${BASE}/backgrounds/bg-st15-reflection-lake.webp`,
  'bg-st16-ancient-book': `${BASE}/backgrounds/bg-st16-ancient-book.webp`,
  'bg-st17-pampering-unicorn': `${BASE}/backgrounds/bg-st17-pampering-unicorn.webp`,
  'bg-st18-kiss-gate': `${BASE}/backgrounds/bg-st18-kiss-gate.webp`,

};

/**
 * Assets the V1 design needs that have not been exported yet.
 *
 * Empty as of the 2026-09 asset pass: every V1 asset is installed. The map is
 * kept — with its resolver fallback — because it is the contract that lets a
 * future asset arrive late without a component change, and because removing it
 * would silently turn a missing file into a broken <img>.
 */
export const MISSING_ASSETS: Readonly<Record<string, string>> = {};

export function assetUrl(id: AssetId): string | null {
  return ASSET_URLS[id] ?? null;
}

export function isAssetAvailable(id: AssetId): boolean {
  return ASSET_URLS[id] !== undefined;
}

/** Human-readable Hebrew label for a not-yet-exported asset. */
export function missingAssetLabel(id: AssetId): string {
  return MISSING_ASSETS[id] ?? id;
}
