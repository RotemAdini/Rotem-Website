/**
 * Builds (or safely updates) data/migration/content-manifest.json — the
 * permanent record that assigns one immutable canonical `contentId` to every
 * real piece of content the site currently has.
 *
 * The manifest is the single source of truth for canonical identity. The
 * Sanity importer reads it and never invents an id of its own, so importing
 * twice — or re-importing into a fresh dataset a year from now — produces the
 * same canonical ids, and therefore the same Supabase foreign keys.
 *
 * Re-running this script is safe: an existing entry is matched by its stable
 * natural key and keeps its contentId. The script refuses to write if it would
 * change or drop a contentId that already exists.
 *
 *   node scripts/build-migration-manifest.ts            # write / update
 *   node scripts/build-migration-manifest.ts --check    # verify only, no write
 *
 * Nothing here touches data/recipes.json, lib/*.ts, public/, or images/.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  PROJECT_ROOT,
  allBiscuitItems,
  allDateItems,
  allGames,
  findBiscuitOverlaps,
  canonicalTitle,
  getBiscuitAbsorption,
  getCatalogCorrection,
  isAbsorbedIntoBiscuit,
  getReviewedRecipes,
  instagramShortcode,
  isListable,
  isUnsuitableRecipeRouteId,
  loadRecipeCatalog,
  CATALOG_CORRECTIONS,
  recipeImageFolderSlug,
  normalizeImagePath,
  recipeImagePaths,
  slugifyTitle,
  type ContentType,
} from "./migration-source.ts";
import type { Recipe } from "../lib/types.ts";

const MANIFEST_PATH = path.join(PROJECT_ROOT, "data/migration/content-manifest.json");
const MANIFEST_VERSION = 1;

/** The biscuit cakes are an editorial series, not a content type: every one of
 * them is an ordinary Recipe document carrying this series name. */
const BISCUIT_SERIES_NAME = "עוגות ביסקוויטים";
const DATE_SERIES_NAME = "סדרת הדייטים א׳-ב׳";

/* ------------------------------------------------------------------ ULID */

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * A ULID: 48 bits of timestamp then 80 bits of randomness, Crockford base32.
 * Chosen over a bare UUID because it sorts by creation time, is case-stable,
 * and is URL-safe — useful properties for a key that will end up in Postgres
 * indexes and in log output. It is minted exactly once per content item and
 * then persisted here forever.
 */
function ulid(now = Date.now()): string {
  let time = "";
  let remaining = now;
  for (let i = 0; i < 10; i++) {
    time = CROCKFORD[remaining % 32] + time;
    remaining = Math.floor(remaining / 32);
  }
  const bytes = crypto.randomBytes(16);
  let random = "";
  for (let i = 0; i < 16; i++) random += CROCKFORD[bytes[i] % 32];
  return time + random;
}

const ID_PREFIX: Record<ContentType, string> = {
  recipe: "recipe",
  dateIdea: "date",
  game: "game",
};

/* -------------------------------------------------------------- manifest */

interface ManifestItem {
  contentId: string;
  contentType: ContentType;
  /** Stable key used to re-find this item on a rerun so contentId never moves. */
  naturalKey: string;
  title: string;
  /** Titles this content has also been published under, kept as source history. */
  alternateTitles?: string[];
  /** Proposed canonical slug. NOT live — the site still routes by legacyRouteIds. */
  slug: string;
  slugSource: "curated-title" | "existing-game-slug";
  /** Every localStorage favourite token that must resolve to this item. */
  legacyIds: string[];
  /** Every current URL segment that must keep resolving to this item. */
  legacyRouteIds: string[];
  legacyRoutes: string[];
  sequenceId: number | null;
  instagramShortcode: string | null;
  sourceUrl: string | null;
  /** Source URLs of records absorbed into this one, so no post is forgotten. */
  alternateSourceUrls?: string[];
  /** Natural keys of records deliberately absorbed into this item. */
  absorbedNaturalKeys?: string[];
  /** contentIds a previous manifest had minted for those absorbed records. */
  retiredContentIds?: string[];
  publishedDate: string | null;
  series: string | null;
  seriesPosition: number | null;
  /** English image-folder slug already used on disk, where the data records it.
   * A storage location only — it never influences `slug`. */
  imageFolderSlug: string | null;
  imagePaths: string[];
  listed: boolean;
  flags: string[];
}

interface Manifest {
  manifestVersion: number;
  createdAt: string;
  updatedAt: string;
  idPolicy: Record<string, string>;
  counts: Record<string, number>;
  items: ManifestItem[];
  mergeDecisions: unknown[];
  /** Human decisions applied on top of the source data, never edited into it. */
  corrections: unknown[];
  review: Record<string, unknown>;
}

function readExistingManifest(): Manifest | null {
  if (!fs.existsSync(MANIFEST_PATH)) return null;
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as Manifest;
}

/* ----------------------------------------------------------------- build */

function build(): { manifest: Manifest; problems: string[]; ambiguous: Record<string, unknown>[] } {
  const problems: string[] = [];
  const ambiguous: Record<string, unknown>[] = [];

  const existing = readExistingManifest();
  const existingByKey = new Map((existing?.items || []).map((item) => [item.naturalKey, item]));

  const catalog = loadRecipeCatalog();
  const reviewed = getReviewedRecipes(catalog.recipes);
  const biscuits = allBiscuitItems();
  const biscuitById = new Map(biscuits.map((item) => [item.id, item]));
  const dates = allDateItems();
  const games = allGames();

  // --- overlaps between the reviewed catalog and the legacy biscuit series ---
  const overlaps = findBiscuitOverlaps(reviewed);
  const biscuitToRecipe = new Map<string, (typeof overlaps)[number]>();
  for (const overlap of overlaps) {
    const prior = biscuitToRecipe.get(overlap.biscuitId);
    if (prior && prior.recipeId !== overlap.recipeId) {
      // Two different catalog recipes both claim the same series item. That is
      // a real ambiguity and must not be resolved by picking one.
      ambiguous.push({
        kind: "BISCUIT_OVERLAP_CONFLICT",
        biscuitId: overlap.biscuitId,
        claimedBy: [prior.recipeId, overlap.recipeId],
        detail: "Two reviewed recipes map to the same biscuit-cake series item; not merged.",
      });
      continue;
    }
    biscuitToRecipe.set(overlap.biscuitId, overlap);
  }
  const mergedBiscuitIds = new Set(biscuitToRecipe.keys());
  const recipeToBiscuit = new Map<string, string>();
  for (const [biscuitId, overlap] of biscuitToRecipe) recipeToBiscuit.set(overlap.recipeId, biscuitId);

  // --- duplicate Instagram posts of the same dish, merged by decision ------
  // data/recipes.json flags one record as DUPLICATE_OF_SEQUENCE_<n>, and the
  // site already treats the flagged record as the one to hide. Rotem's
  // decision (7 Sep 2026) is that these are one recipe, so the flagged record
  // is absorbed: the surviving record keeps the content, and the absorbed
  // record's URL and favourite token become aliases of it. Nothing is guessed
  // — the direction of the merge comes from the flag that is already in the
  // data, and the absorbed post's own URL is kept in alternateSourceUrls.
  const absorbedByRouteId = new Map<string, Recipe>();
  for (const recipe of reviewed) {
    const issue = (recipe.issues || []).find((entry) => entry.startsWith("DUPLICATE_OF_SEQUENCE_"));
    if (!issue) continue;
    const targetSequenceId = Number(issue.replace("DUPLICATE_OF_SEQUENCE_", ""));
    const target = reviewed.find((candidate) => candidate.sequenceId === targetSequenceId);
    if (!target) {
      problems.push(`Recipe "${recipe.id}" is flagged a duplicate of sequence ${targetSequenceId}, which is not reviewed.`);
      continue;
    }
    absorbedByRouteId.set(target.id, recipe);
  }
  const absorbedRecipeIds = new Set([...absorbedByRouteId.values()].map((recipe) => recipe.id));

  const items: ManifestItem[] = [];

  const claim = (naturalKey: string, contentType: ContentType): string => {
    const prior = existingByKey.get(naturalKey);
    if (prior) return prior.contentId;
    return `${ID_PREFIX[contentType]}_${ulid()}`;
  };

  // ------------------------------------------------------------- recipes --
  for (const recipe of reviewed) {
    if (absorbedRecipeIds.has(recipe.id)) continue; // folded into its counterpart below
    if (isAbsorbedIntoBiscuit(recipe.sequenceId)) continue; // folded into a series item below
    const shortcode = instagramShortcode(recipe.sourceUrl);
    if (!shortcode) {
      problems.push(`Recipe "${recipe.id}" has no parseable Instagram shortcode (sourceUrl: ${recipe.sourceUrl}).`);
    }
    // The shortcode is Instagram's own immutable id and is unique across all
    // 160 reviewed recipes; the route id is the fallback only if one is ever
    // missing, so the natural key is always defined.
    const naturalKey = shortcode ? `ig:${shortcode}` : `recipe-route:${recipe.id}`;

    const legacyIds = [`recipe-${recipe.id}`];
    const legacyRouteIds = [recipe.id];
    const flags: string[] = [];

    if (isUnsuitableRecipeRouteId(recipe.id)) flags.push("LEGACY_ROUTE_ID_UNSUITABLE");
    if (!isListable(recipe)) flags.push("UNLISTED_DUPLICATE");

    const absorbedNaturalKeys: string[] = [];
    const alternateSourceUrls: string[] = [];
    const alternateTitles: string[] = [];

    // A legacy biscuit-cake card that is the same real recipe folds into this
    // document: its favourite token and its URL become aliases of this item.
    // Its natural key is recorded as absorbed, so that if an earlier manifest
    // had given the series item a standalone contentId, that id is retired
    // deliberately rather than silently dropped.
    const biscuitId = recipeToBiscuit.get(recipe.id);
    if (biscuitId) {
      legacyIds.push(`biscuit-cake-${biscuitId}`);
      legacyRouteIds.push(`biscuit-cake-${biscuitId}`);
      flags.push("MERGED_BISCUIT_SERIES");
      absorbedNaturalKeys.push(`biscuit:${biscuitId}`);
    }

    // A recorded correction can replace the published title. The catalog's own
    // wording is kept as source history rather than lost.
    const correction = getCatalogCorrection(recipe.sequenceId);
    const title = canonicalTitle(recipe);
    if (correction?.canonicalTitle && correction.canonicalTitle !== recipe.title) {
      alternateTitles.push(recipe.title);
      flags.push("TITLE_CORRECTED");
    }

    // A duplicate Instagram post of the same dish folds in here too.
    const absorbed = absorbedByRouteId.get(recipe.id);
    if (absorbed) {
      legacyIds.push(`recipe-${absorbed.id}`);
      legacyRouteIds.push(absorbed.id);
      flags.push("MERGED_DUPLICATE_POST");
      const absorbedShortcode = instagramShortcode(absorbed.sourceUrl);
      absorbedNaturalKeys.push(absorbedShortcode ? `ig:${absorbedShortcode}` : `recipe-route:${absorbed.id}`);
      if (absorbed.sourceUrl) alternateSourceUrls.push(absorbed.sourceUrl);
      if (absorbed.title && absorbed.title !== title) alternateTitles.push(absorbed.title);
    }

    // A merged series item brings its own photos: for items 04, 12 and 14 the
    // catalog record has no verified image of its own, so the legacy page's
    // photo is the only one there is. Counted here, not just at import time,
    // so the manifest's "recipes without images" figure is the real one.
    const mergedBiscuit = biscuitId ? biscuitById.get(biscuitId) : undefined;
    const imagePaths = [
      ...new Set([
        ...recipeImagePaths(recipe),
        ...(mergedBiscuit ? [mergedBiscuit.image, ...(mergedBiscuit.images || [])] : [])
          .filter((value): value is string => Boolean(value))
          .map(normalizeImagePath),
      ]),
    ];
    if (!imagePaths.length) flags.push("NO_IMAGES");

    items.push({
      contentId: claim(naturalKey, "recipe"),
      contentType: "recipe",
      naturalKey,
      title,
      alternateTitles: alternateTitles.length ? [...new Set(alternateTitles)] : undefined,
      slug: slugifyTitle(title),
      slugSource: "curated-title",
      legacyIds,
      legacyRouteIds,
      legacyRoutes: legacyRouteIds.map((id) => `/recipes/${id}`),
      sequenceId: recipe.sequenceId ?? null,
      instagramShortcode: shortcode,
      sourceUrl: recipe.sourceUrl || null,
      alternateSourceUrls: alternateSourceUrls.length ? alternateSourceUrls : undefined,
      absorbedNaturalKeys: absorbedNaturalKeys.length ? absorbedNaturalKeys : undefined,
      retiredContentIds: absorbedNaturalKeys
        .map((key) => existingByKey.get(key)?.contentId)
        .filter((value): value is string => Boolean(value)),
      publishedDate: recipe.publishedDate || null,
      // A biscuit cake is an ordinary recipe carrying the series name; the
      // position comes from the legacy series item it merged with. A recipe
      // that names the series but matched no series item keeps a null
      // position rather than being assigned a guessed one.
      series: recipe.series || null,
      seriesPosition: biscuitId ? Number(biscuitId) : null,
      imageFolderSlug: recipeImageFolderSlug(recipe),
      imagePaths,
      listed: isListable(recipe),
      flags,
    });
  }

  // --- legacy biscuit items with no reviewed catalog record of their own ---
  for (const item of biscuits) {
    if (mergedBiscuitIds.has(item.id)) continue;
    const naturalKey = `biscuit:${item.id}`;
    const flags = ["BISCUIT_SERIES_ONLY"];

    // A catalog row may be absorbed INTO this series item — the opposite
    // direction to the usual merge, used when the series item is the one that
    // carries the canonical authored content. It contributes its identity and
    // its verified source metadata; its content does not override the
    // series item's.
    const absorption = getBiscuitAbsorption(item.id);
    const absorbedRow = absorption ? reviewed.find((recipe) => recipe.sequenceId === absorption.sequenceId) : undefined;
    if (absorption && !absorbedRow) {
      problems.push(`Correction absorbs sequence ${absorption.sequenceId} into biscuit ${item.id}, but that row is not reviewed.`);
    }

    const title = absorption?.canonicalTitle || item.title;
    const alternateTitles = [
      ...(absorption?.canonicalTitle && absorption.canonicalTitle !== item.title ? [item.title] : []),
      ...(absorbedRow && absorbedRow.title !== title ? [absorbedRow.title] : []),
    ];
    const absorbedShortcode = absorbedRow ? instagramShortcode(absorbedRow.sourceUrl) : null;
    const absorbedNaturalKeys = absorbedRow
      ? [absorbedShortcode ? `ig:${absorbedShortcode}` : `recipe-route:${absorbedRow.id}`]
      : [];
    if (absorbedRow) {
      flags.push("MERGED_CATALOG_ROW");
      if (absorption?.canonicalTitle && absorption.canonicalTitle !== item.title) flags.push("TITLE_CORRECTED");
      if (absorption?.contentAuthoredInSanity) flags.push("CONTENT_AUTHORED_IN_SANITY");
    }

    items.push({
      contentId: claim(naturalKey, "recipe"),
      contentType: "recipe",
      naturalKey,
      title,
      alternateTitles: alternateTitles.length ? [...new Set(alternateTitles)] : undefined,
      slug: slugifyTitle(title),
      slugSource: "curated-title",
      legacyIds: [`biscuit-cake-${item.id}`, ...(absorbedRow ? [`recipe-${absorbedRow.id}`] : [])],
      legacyRouteIds: [`biscuit-cake-${item.id}`, ...(absorbedRow ? [absorbedRow.id] : [])],
      legacyRoutes: [`/recipes/biscuit-cake-${item.id}`, ...(absorbedRow ? [`/recipes/${absorbedRow.id}`] : [])],
      // Source metadata comes from the absorbed catalog row, which is the only
      // verified source this recipe has.
      sequenceId: absorbedRow?.sequenceId ?? null,
      instagramShortcode: absorbedShortcode,
      sourceUrl: absorbedRow?.sourceUrl || null,
      absorbedNaturalKeys: absorbedNaturalKeys.length ? absorbedNaturalKeys : undefined,
      retiredContentIds: absorbedNaturalKeys
        .map((key) => existingByKey.get(key)?.contentId)
        .filter((value): value is string => Boolean(value)),
      publishedDate: absorbedRow?.publishedDate || null,
      // Imported as an ordinary recipe carrying the series metadata — there is
      // no separate biscuit-cake content type.
      series: BISCUIT_SERIES_NAME,
      seriesPosition: Number(item.id),
      imageFolderSlug: null,
      imagePaths: [
        ...new Set(
          [item.image, ...(item.images || []), ...(absorbedRow ? recipeImagePaths(absorbedRow) : [])]
            .filter((value): value is string => Boolean(value))
            .map(normalizeImagePath),
        ),
      ],
      listed: true,
      flags,
    });
  }

  // ----------------------------------------------------------- date ideas --
  for (const item of dates) {
    const naturalKey = `date-a-b:${item.id}`;
    items.push({
      contentId: claim(naturalKey, "dateIdea"),
      contentType: "dateIdea",
      naturalKey,
      title: item.title,
      slug: slugifyTitle(item.title),
      slugSource: "curated-title",
      legacyIds: [`date-a-b-${item.id}`],
      legacyRouteIds: [item.id],
      legacyRoutes: [`/dates/${item.id}`],
      sequenceId: null,
      instagramShortcode: null,
      sourceUrl: null,
      publishedDate: null,
      series: DATE_SERIES_NAME,
      seriesPosition: Number(item.id),
      imageFolderSlug: null,
      imagePaths: [item.image, ...(item.images || [])].filter((value): value is string => Boolean(value)),
      listed: true,
      flags: [],
    });
  }

  // ---------------------------------------------------------------- games --
  for (const game of games) {
    const naturalKey = `game:${game.slug}`;
    items.push({
      contentId: claim(naturalKey, "game"),
      contentType: "game",
      naturalKey,
      title: game.title,
      // Games already have a clean, human-readable English slug that is also
      // their route today. Keeping it is the least disruptive choice and
      // introduces no new taxonomy.
      slug: game.slug,
      slugSource: "existing-game-slug",
      legacyIds: [],
      legacyRouteIds: [game.slug],
      legacyRoutes: [`/games/${game.slug}`],
      sequenceId: null,
      instagramShortcode: null,
      sourceUrl: null,
      publishedDate: null,
      series: null,
      seriesPosition: null,
      imageFolderSlug: null,
      imagePaths: game.image ? [game.image] : [],
      listed: true,
      flags: game.image ? [] : ["ICON_ONLY_NO_PHOTO"],
    });
  }

  /* ------------------------------------------------------ integrity checks */

  // contentId uniqueness
  const seenIds = new Map<string, string>();
  for (const item of items) {
    const prior = seenIds.get(item.contentId);
    if (prior) problems.push(`Duplicate contentId ${item.contentId} on "${prior}" and "${item.naturalKey}".`);
    seenIds.set(item.contentId, item.naturalKey);
  }

  // natural-key uniqueness
  const seenKeys = new Set<string>();
  for (const item of items) {
    if (seenKeys.has(item.naturalKey)) problems.push(`Duplicate naturalKey ${item.naturalKey}.`);
    seenKeys.add(item.naturalKey);
  }

  // No contentId that already existed may change or disappear — unless it was
  // deliberately absorbed into another item, in which case the surviving item
  // records both the absorbed natural key and the id it used to hold.
  const absorbedKeys = new Set(items.flatMap((item) => item.absorbedNaturalKeys || []));
  for (const [key, prior] of existingByKey) {
    const current = items.find((item) => item.naturalKey === key);
    if (!current) {
      if (absorbedKeys.has(key)) continue;
      problems.push(`Manifest entry ${key} (${prior.contentId}) disappeared from the current content; refusing to drop it.`);
      continue;
    }
    if (current.contentId !== prior.contentId) {
      problems.push(`contentId for ${key} would change from ${prior.contentId} to ${current.contentId}.`);
    }
  }

  // Every favourite token in circulation must map to exactly one item.
  const tokenOwner = new Map<string, string>();
  for (const item of items) {
    for (const token of item.legacyIds) {
      const prior = tokenOwner.get(token);
      if (prior && prior !== item.contentId) {
        problems.push(`Favourite token "${token}" maps to two contentIds: ${prior} and ${item.contentId}.`);
      }
      tokenOwner.set(token, item.contentId);
    }
  }

  // Every route segment in circulation must map to exactly one item.
  const routeOwner = new Map<string, string>();
  for (const item of items) {
    for (const route of item.legacyRoutes) {
      const prior = routeOwner.get(route);
      if (prior && prior !== item.contentId) {
        problems.push(`Route "${route}" maps to two contentIds: ${prior} and ${item.contentId}.`);
      }
      routeOwner.set(route, item.contentId);
    }
  }

  // Slug uniqueness within a content type. Collisions are reported, never
  // silently suffixed away: two items sharing a title is a content question.
  const slugOwners = new Map<string, ManifestItem[]>();
  for (const item of items) {
    const key = `${item.contentType}:${item.slug}`;
    slugOwners.set(key, [...(slugOwners.get(key) || []), item]);
  }
  for (const [key, owners] of slugOwners) {
    if (owners.length < 2) continue;
    for (const owner of owners) owner.flags.push("SLUG_COLLISION");
    ambiguous.push({
      kind: "SLUG_COLLISION",
      key,
      items: owners.map((owner) => ({
        contentId: owner.contentId,
        title: owner.title,
        sequenceId: owner.sequenceId,
        legacyRouteIds: owner.legacyRouteIds,
        sourceUrl: owner.sourceUrl,
      })),
      detail: "Same proposed slug from the same curated title. Needs a distinguishing title or an explicit slug.",
    });
  }

  // A recipe that names the biscuit-cake series but has no position: it did
  // not match any of the 14 legacy series items, so its episode number cannot
  // be established from the data. Reported, never guessed — and non-blocking,
  // because the recipe imports correctly either way.
  for (const item of items) {
    if (item.contentType !== "recipe" || item.series !== BISCUIT_SERIES_NAME || item.seriesPosition !== null) continue;
    item.flags.push("SERIES_POSITION_UNRESOLVED");
    ambiguous.push({
      kind: "SERIES_POSITION_UNRESOLVED",
      blocking: false,
      contentId: item.contentId,
      title: item.title,
      sequenceId: item.sequenceId,
      legacyRouteIds: item.legacyRouteIds,
      detail:
        `"${item.title}" is tagged with the biscuit-cake series but matches none of the 14 legacy series items, ` +
        "so it has no episode number. It imports as an ordinary Recipe with the series name and an empty " +
        "seriesPosition; Rotem can set the number in the Studio.",
    });
  }

  // Empty or over-short slugs would produce an unusable URL.
  for (const item of items) {
    if (item.slug.length < 2) {
      item.flags.push("SLUG_UNUSABLE");
      ambiguous.push({ kind: "SLUG_UNUSABLE", contentId: item.contentId, title: item.title, slug: item.slug });
    }
  }

  // The audit named exactly 34 unsuitable recipe route ids; assert we still
  // select the same set, so a data edit can never quietly change the scope.
  const unsuitable = items.filter((item) => item.flags.includes("LEGACY_ROUTE_ID_UNSUITABLE"));
  if (unsuitable.length !== 34) {
    problems.push(`Expected 34 unsuitable recipe route ids (per the ID audit), found ${unsuitable.length}.`);
  }

  // The site statically generates one /recipes/[id] page per reviewed recipe
  // plus one per biscuit item; assert the manifest covers every one of them.
  const expectedRecipeRoutes = reviewed.length + biscuits.length;
  const coveredRecipeRoutes = items
    .filter((item) => item.contentType === "recipe")
    .reduce((total, item) => total + item.legacyRouteIds.length, 0);
  if (coveredRecipeRoutes !== expectedRecipeRoutes) {
    problems.push(`Recipe routes covered (${coveredRecipeRoutes}) != routes the site builds (${expectedRecipeRoutes}).`);
  }

  // English image-folder slugs that exist on disk but that no recipe record
  // currently points at. These are the user's own slug vocabulary; matching a
  // Hebrew title to one of them would be a translation guess, so they are
  // reported for review rather than used.
  const imageFolderRoot = path.join(PROJECT_ROOT, "images/recipes");
  const foldersOnDisk: string[] = [];
  if (fs.existsSync(imageFolderRoot)) {
    for (const group of fs.readdirSync(imageFolderRoot, { withFileTypes: true })) {
      if (!group.isDirectory()) continue;
      for (const folder of fs.readdirSync(path.join(imageFolderRoot, group.name), { withFileTypes: true })) {
        if (folder.isDirectory()) foldersOnDisk.push(`${group.name}/${folder.name}`);
      }
    }
  }
  const claimedFolders = new Set(items.map((item) => item.imageFolderSlug).filter(Boolean));
  const unmatchedFolders = foldersOnDisk.filter((folder) => !claimedFolders.has(folder.split("/")[1]));

  const manifest: Manifest = {
    manifestVersion: MANIFEST_VERSION,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    idPolicy: {
      contentId:
        "Immutable, opaque, minted once as <type>_<ULID> and persisted here. Never derived from a title, a slug, " +
        "a sequence number or a Sanity _id. This is the only identifier Supabase may store.",
      slug:
        "Human-readable Hebrew URL segment, generated once from the curated title, editable in Sanity, never used " +
        "as a relationship key. Never derived from an image-folder name.",
      imageFolderSlug:
        "Where a recipe's photos sit on disk. A storage detail: it never determines the slug or the URL, and an " +
        "unresolved mapping never blocks anything.",
      series:
        'Editorial grouping. The biscuit cakes are an ordinary Recipe carrying series = "עוגות ביסקוויטים" plus a ' +
        "seriesPosition — there is no separate biscuit-cake content type.",
      legacyIds: "localStorage favourite tokens, verbatim, so existing rotemFavorites entries stay migratable.",
      legacyRouteIds: "Current URL segments, verbatim, so every existing link can be permanently redirected.",
      naturalKey: "Stable re-identification key used only by this builder, so a rerun never mints a new contentId.",
    },
    counts: {
      totalItems: items.length,
      recipes: items.filter((item) => item.contentType === "recipe").length,
      recipesFromReviewedCatalog: reviewed.length,
      recipesFromBiscuitSeriesOnly: items.filter((item) => item.flags.includes("BISCUIT_SERIES_ONLY")).length,
      biscuitSeriesMerged: mergedBiscuitIds.size,
      biscuitSeriesRecipesTotal: items.filter((item) => item.series === BISCUIT_SERIES_NAME).length,
      biscuitSeriesPositionUnresolved: items.filter((item) => item.flags.includes("SERIES_POSITION_UNRESOLVED")).length,
      duplicatePostsAbsorbed: absorbedByRouteId.size,
      catalogRowsAbsorbedIntoSeriesItems: items.filter((item) => item.flags.includes("MERGED_CATALOG_ROW")).length,
      recipesAuthoredInSanity: items.filter((item) => item.flags.includes("CONTENT_AUTHORED_IN_SANITY")).length,
      dateIdeas: items.filter((item) => item.contentType === "dateIdea").length,
      games: items.filter((item) => item.contentType === "game").length,
      legacyFavouriteTokens: tokenOwner.size,
      legacyRoutes: routeOwner.size,
      unsuitableLegacyRouteIds: unsuitable.length,
      recipesWithoutImages: items.filter((item) => item.flags.includes("NO_IMAGES")).length,
      unmatchedImageFolders: unmatchedFolders.length,
    },
    mergeDecisions: [
      ...[...absorbedByRouteId.entries()].map(([survivingRouteId, absorbed]) => {
        const survivor = reviewed.find((candidate) => candidate.id === survivingRouteId);
        return {
          kind: "DUPLICATE_INSTAGRAM_POST_ABSORBED",
          decidedBy: "Rotem, 7 September 2026",
          detail:
            "Two Instagram posts of the same dish. The record data/recipes.json already flags as the duplicate is " +
            "absorbed: its URL and favourite token become aliases of the surviving record, whose content is kept. " +
            "Its own post URL is preserved in alternateSourceUrls, and data/recipes.json is untouched.",
          absorbedRouteId: absorbed.id,
          absorbedSequenceId: absorbed.sequenceId,
          absorbedSourceUrl: absorbed.sourceUrl,
          absorbedFavouriteToken: `recipe-${absorbed.id}`,
          survivingRouteId,
          survivingSequenceId: survivor?.sequenceId ?? null,
          survivingSourceUrl: survivor?.sourceUrl ?? null,
          title: survivor?.title ?? absorbed.title,
          contentId: items.find((item) => item.legacyRouteIds.includes(survivingRouteId))?.contentId ?? null,
        };
      }),
      ...overlaps.map((overlap) => ({
        kind: "BISCUIT_SERIES_MERGED_INTO_CATALOG_RECIPE",
        biscuitId: overlap.biscuitId,
        biscuitTitle: overlap.biscuitTitle,
        biscuitFavouriteToken: `biscuit-cake-${overlap.biscuitId}`,
        recipeRouteId: overlap.recipeId,
        recipeSequenceId: overlap.recipeSequenceId,
        recipeTitle: overlap.recipeTitle,
        method: overlap.method,
        decidedBy: overlap.method === "recorded-decision" ? CATALOG_CORRECTIONS.find((c) => c.mergeWithBiscuitId === overlap.biscuitId)?.decidedBy : undefined,
        note: overlap.method === "recorded-decision" ? CATALOG_CORRECTIONS.find((c) => c.mergeWithBiscuitId === overlap.biscuitId)?.note : undefined,
        contentId: items.find((item) => item.legacyRouteIds.includes(overlap.recipeId))?.contentId ?? null,
      })),
    ],
    corrections: CATALOG_CORRECTIONS,
    review: {
      ambiguous,
      unmatchedImageFolders: unmatchedFolders.sort(),
      note:
        "NON-BLOCKING. images/recipes/** contains an English kebab-case folder per recipe, created outside this " +
        "migration. A folder is recorded on a recipe (as legacyImageFolder) only where data/recipes.json already " +
        "establishes the link; pairing the rest would mean translating a Hebrew title into English, which this " +
        "project does not guess at. These folders are a storage location and never influence a slug or a URL, so " +
        "an unresolved mapping does not block the import, the schema, or the eventual frontend switch — it is " +
        "simply a list for Rotem to work through. No folder is renamed, moved or deleted by any of this.",
    },
    items: items.sort((a, b) => a.contentType.localeCompare(b.contentType) || a.naturalKey.localeCompare(b.naturalKey)),
  };

  return { manifest, problems, ambiguous };
}

/* ------------------------------------------------------------------ main */

const checkOnly = process.argv.includes("--check");
const { manifest, problems } = build();

for (const problem of problems) console.error(`  ERROR  ${problem}`);

if (problems.length) {
  console.error(`\nRefusing to write the manifest: ${problems.length} integrity problem(s).`);
  process.exit(1);
}

if (checkOnly) {
  const onDisk = readExistingManifest();
  if (!onDisk) {
    console.error("No manifest on disk yet. Run without --check to create it.");
    process.exit(1);
  }
  const drifted = onDisk.items.filter((item) => {
    const current = manifest.items.find((candidate) => candidate.naturalKey === item.naturalKey);
    return !current || current.contentId !== item.contentId;
  });
  if (drifted.length) {
    console.error(`Manifest drift: ${drifted.length} item(s) would change contentId.`);
    process.exit(1);
  }
  console.log(`Manifest OK — ${onDisk.items.length} items, no contentId drift.`);
} else {
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Wrote ${path.relative(PROJECT_ROOT, MANIFEST_PATH)}`);
}

console.table(manifest.counts);
const ambiguousList = (manifest.review as { ambiguous: { kind: string }[] }).ambiguous;
console.log(`\nAmbiguous records needing review: ${ambiguousList.length}`);
for (const entry of ambiguousList) console.log(`  - ${entry.kind}`);
console.log(`Merge decisions recorded: ${manifest.mergeDecisions.length}`);
