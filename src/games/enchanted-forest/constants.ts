/**
 * Stable identifiers for the game module.
 *
 * GAME_ID is the contract between this module and the surrounding website
 * (routing, entitlement lookup, analytics). It must never change.
 */

export const GAME_ID = 'enchanted-forest';
export type GameId = typeof GAME_ID;

/**
 * Route the host site mounts the game on. Informational — the module owns no
 * routing and never reads this; it is exported so the host and this module can
 * be checked against one value instead of two spellings of it.
 *
 * The URL slug and the canonical game id are the same word, `enchanted-forest`,
 * and this constant is derived from `GAME_ID` rather than spelled out so they
 * cannot drift apart. A `forest-game` slug was considered and rejected; nothing
 * in the codebase should reintroduce a second spelling.
 */
export const GAME_PLAY_ROUTE = `/games/${GAME_ID}/play`;

/** Number of stations in the journey. See GAME_ANALYSIS.md. */
export const TOTAL_STATIONS = 18;

/**
 * Shape version of the persisted `Progress` object.
 * Bump only when the *structure* changes; `parseProgress` then decides how to migrate.
 */
export const PROGRESS_SCHEMA_VERSION = 1;

/**
 * Version of the game *content*.
 * Bump when stations are added/removed/reordered so stale saves can be reconciled.
 *
 * v2: the journey was re-ordered (see PROGRESSION_SEQUENCE).
 * v3: the 12↔13 swap was removed.
 * v4: it was reinstated — the vision tree is played before the time circle.
 *
 * No migration is needed for any of them — `currentStation` is always re-derived
 * from `completedStations` against the sequence, so an existing save stays
 * consistent across a re-ordering. See `parseProgress`.
 */
export const CONTENT_VERSION = 4;

/**
 * The order the 18 stations are played in.
 *
 * Station *identity* is `order` (1..18) and never changes: station 2 is still
 * the gnome, with its own artwork and copy untouched. What this array changes is
 * only which station comes next.
 *
 *   1 → 3 → 2 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 13 → 12 → 14 → 15 → 16 → 17 → 18
 *
 * Two swaps against the numeric run:
 *   • the gratitude flowers (`order: 3`) are the SECOND place the couple reach,
 *     and the gnome (`order: 2`) is the third;
 *   • the vision tree (`order: 13`) is the TWELFTH, and the time circle
 *     (`order: 12`) is the thirteenth.
 *
 * ⚠️ The second swap does NOT follow the artwork: the time circle is painted
 * lower on the trail than the vision tree, so reading the map would suggest the
 * opposite order. It is an authored decision and has been reinstated once after
 * being "corrected" from the coordinates. Do not derive this array from
 * `mapLayout`; change it only when asked.
 *
 * ⚠️ Because this disagrees with `order`, no player-visible number may come from
 * `order`. Use `journeyNumber()` in `state/sequence.ts` for every number a
 * player reads — the vision tree is תחנה 12 and the time circle תחנה 13.
 *
 * Invariants (asserted in `progress.test.ts`): a permutation of 1..TOTAL_STATIONS —
 * no duplicates, nothing missing.
 */
export const PROGRESSION_SEQUENCE: readonly number[] = [
  1, 3, 2, 4, 5, 6, 7, 8, 9, 10, 11, 13, 12, 14, 15, 16, 17, 18,
];

/**
 * Prefix every browser-storage key this game writes must start with.
 *
 * The game is one of several that will share an origin on rotemadini.com, so a
 * generic key (`progress`, `state`, `ef:…`) is a collision waiting to happen —
 * and, worse, makes "clear THIS game" impossible to implement safely. Everything
 * persisted lives under `rotem:<game id>:`, which gives the host a prefix it can
 * enumerate and clear without touching another game's save.
 *
 * Asserted in `localStorageStore.test.ts`.
 */
export const STORAGE_NAMESPACE = `rotem:${GAME_ID}` as const;

/** localStorage key holding the couple's progress. The only key this game writes. */
export const PROGRESS_STORAGE_KEY = `${STORAGE_NAMESPACE}:progress:v${PROGRESS_SCHEMA_VERSION}`;

/**
 * Keys written by earlier builds, newest first.
 *
 * Read once, migrated into `PROGRESS_STORAGE_KEY` and then removed. A couple
 * mid-journey when the site deploys must not be sent back to the trailhead
 * because a prefix changed, and an abandoned key left in storage is exactly the
 * orphan this namespace exists to prevent.
 */
export const LEGACY_PROGRESS_STORAGE_KEYS: readonly string[] = [
  `ef:${GAME_ID}:progress:v${PROGRESS_SCHEMA_VERSION}`,
];
