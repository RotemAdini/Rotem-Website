/**
 * Imports the site's current content into Sanity, driven entirely by
 * data/migration/content-manifest.json.
 *
 *   node scripts/import-to-sanity.ts --dry-run     # build + validate, write a plan file, no network
 *   node scripts/import-to-sanity.ts               # create missing documents, repair identity fields
 *   node scripts/import-to-sanity.ts --update-existing   # also refresh content fields of existing docs
 *
 * Idempotency
 * -----------
 * Every document's Sanity `_id` is its canonical `contentId`. The contentId is
 * minted once, in the manifest, and never regenerated — so running this script
 * twice addresses the same documents rather than creating new ones. There is
 * no query-then-guess step and therefore no way for a rerun to duplicate
 * content.
 *
 * `_id` mirroring `contentId` does not make Sanity the owner of canonical
 * identity: the manifest is. If this dataset were deleted and rebuilt, the
 * same manifest would recreate the same ids, and every Supabase favourite
 * would still resolve.
 *
 * Safety
 * ------
 * By default an existing document's editorial fields are LEFT ALONE — the
 * script only creates what is missing and repairs the read-only identity
 * fields (contentId, legacyIds, legacyRouteIds, instagramShortcode,
 * sequenceId), which the Studio does not let an editor change anyway. Pass
 * --update-existing to also overwrite content fields from the local sources.
 *
 * This script never deletes a document, never touches data/recipes.json,
 * lib/*.ts, public/ or images/, and never uploads an image asset.
 */

import fs from "node:fs";
import path from "node:path";

import {
  PROJECT_ROOT,
  allBiscuitItems,
  allDateItems,
  allGames,
  getReviewedRecipes,
  holidaysFor,
  holidaysForBiscuit,
  loadRecipeCatalog,
  normalizeImagePath,
} from "./migration-source.ts";
import type { Recipe } from "../lib/types.ts";

const MANIFEST_PATH = path.join(PROJECT_ROOT, "data/migration/content-manifest.json");
const PLAN_PATH = path.join(PROJECT_ROOT, "data/migration/import-plan.json");

const dryRun = process.argv.includes("--dry-run");
const updateExisting = process.argv.includes("--update-existing");

/* -------------------------------------------------------------- manifest */

interface ManifestItem {
  contentId: string;
  contentType: "recipe" | "dateIdea" | "game";
  naturalKey: string;
  title: string;
  alternateTitles?: string[];
  slug: string;
  legacyIds: string[];
  legacyRouteIds: string[];
  sequenceId: number | null;
  instagramShortcode: string | null;
  alternateSourceUrls?: string[];
  sourceUrl?: string | null;
  publishedDate?: string | null;
  absorbedNaturalKeys?: string[];
  retiredContentIds?: string[];
  series: string | null;
  seriesPosition: number | null;
  imageFolderSlug: string | null;
  listed: boolean;
  flags: string[];
}

interface Manifest {
  items: ManifestItem[];
  counts: Record<string, number>;
}

if (!fs.existsSync(MANIFEST_PATH)) {
  console.error("No migration manifest. Run: node scripts/build-migration-manifest.ts");
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as Manifest;

/* ------------------------------------------------- document construction */

type SanityDoc = Record<string, unknown> & { _id: string; _type: string };

/** Fields the importer owns unconditionally. They are read-only in the Studio,
 * so repairing them on a rerun cannot destroy an editor's work. */
const IDENTITY_FIELDS = ["contentId", "legacyIds", "legacyRouteIds", "instagramShortcode", "sequenceId"] as const;

/**
 * Fields this script seeds once, at document creation, and never writes again —
 * not even under --update-existing.
 *
 * `holidays` is the case: the local sources establish it for a handful of
 * recipes and are simply silent about the rest, so it is expected to be filled
 * in through the Studio. Refreshing content from the sources must not reset
 * that editorial work to the 12 migrated values.
 */
// Titles and URL identity belong to the Studio after creation. Keeping the
// title/history together with the slug also preserves its provenance.
const SEED_ONLY_FIELDS = ["holidays", "slug", "title", "alternateTitles"] as const;

function legacyImage(rawPath: string, role: string) {
  const value = normalizeImagePath(rawPath);
  return { _type: "legacyImage", _key: `${role}-${value.replace(/[^a-zA-Z0-9]/g, "").slice(-24)}`, path: value, role };
}

/**
 * All of a recipe's photos, in display order, deduplicated on the normalized
 * path so that a merged biscuit-cake item does not contribute a second entry
 * for a file the catalog record already lists under a slightly different path
 * spelling. `extra` carries the merged series item's own photos, which matters
 * for the two items (04 and 14) whose catalog record has no verified image of
 * its own but whose legacy page does show one.
 */
function recipeLegacyImages(recipe: Recipe, extra: string[] = []) {
  const entries: ReturnType<typeof legacyImage>[] = [];
  const seen = new Set<string>();
  const push = (value: string | null | undefined, role: string) => {
    if (!value) return;
    const normalized = normalizeImagePath(value);
    if (seen.has(normalized)) return;
    seen.add(normalized);
    entries.push(legacyImage(normalized, role));
  };
  push(recipe.images?.thumbnail, "thumbnail");
  push(recipe.images?.main, "main");
  push(recipe.images?.hero, "hero");
  (recipe.images?.gallery || []).forEach((value) => push(value, "gallery"));
  (recipe.images?.new || []).forEach((value) => push(value, "new"));
  extra.forEach((value, index) => push(value, entries.length === 0 && index === 0 ? "main" : "gallery"));
  return entries;
}

/**
 * Photos for the hand-authored series (date ideas, biscuit-cake stand-ins),
 * deduplicated on the normalized path.
 *
 * lib/date-series.ts and lib/biscuit-cake-series.ts store the lead photo twice —
 * once as `image` and again as the first entry of `images` — so a naive
 * concatenation lists the same file as both "main" and "gallery". The site
 * hides that today by deduplicating at render time; the stored data should not
 * carry the repetition in the first place.
 */
function seriesLegacyImages(image: string | null | undefined, gallery: string[] = []) {
  const entries: ReturnType<typeof legacyImage>[] = [];
  const seen = new Set<string>();
  for (const value of [image, ...gallery]) {
    if (!value) continue;
    const normalized = normalizeImagePath(value);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    entries.push(legacyImage(normalized, entries.length === 0 ? "main" : "gallery"));
  }
  return entries;
}

/** Date ideas whose current text was written as a plausible fill-in rather than
 * from Rotem's own account, or whose content the audit found inconsistent.
 * Recorded in lib/date-series.ts and reports/content-audit-2026-09-06.md —
 * carried into Sanity so the caveat is not lost in the migration. */
const DATE_REVIEW_NOTES: Record<string, string> = {
  "09": "התיאור והציוד מדברים על קנבסים וצבעים אך הדייט נקרא סדנת חימר. נדרש תיאור נכון או שינוי שם.",
  "10": "הטקסט נכתב כהשלמה סבירה ולא על סמך תיאור מקורי של רותם. נדרש אישור או החלפה.",
  "13": "הטקסט נכתב כהשלמה סבירה ולא על סמך תיאור מקורי של רותם. נדרש אישור או החלפה.",
};

function buildDocuments(): { docs: SanityDoc[]; skipped: { contentId: string; reason: string }[] } {
  const catalog = loadRecipeCatalog();
  const reviewed = getReviewedRecipes(catalog.recipes);
  const recipeByRouteId = new Map(reviewed.map((recipe) => [recipe.id, recipe]));
  const biscuitById = new Map(allBiscuitItems().map((item) => [item.id, item]));
  const dateById = new Map(allDateItems().map((item) => [item.id, item]));
  const gameBySlug = new Map(allGames().map((game) => [game.slug, game]));

  const docs: SanityDoc[] = [];
  const skipped: { contentId: string; reason: string }[] = [];

  for (const item of manifest.items) {
    // The manifest is the source of truth for identity and for any recorded
    // title correction, so the document always takes its title from there
    // rather than from the raw catalog row.
    const base = {
      _id: item.contentId,
      contentId: item.contentId,
      title: item.title,
      alternateTitles: item.alternateTitles,
      slug: { _type: "slug", current: item.slug },
      legacyIds: item.legacyIds,
      legacyRouteIds: item.legacyRouteIds,
    };

    if (item.contentType === "recipe") {
      const recipe = recipeByRouteId.get(item.legacyRouteIds[0]);

      if (recipe) {
        // A duplicate Instagram post of the same dish was absorbed into this
        // record by Rotem's decision. Its own post URL and sequence number are
        // preserved rather than discarded, and its issue flags are folded in
        // so the review backlog is not silently shortened.
        const absorbedRecipes = item.legacyRouteIds
          .slice(1)
          .map((route) => recipeByRouteId.get(route))
          .filter((value): value is Recipe => Boolean(value));
        // A legacy biscuit-cake page merged into this recipe brings its own
        // photos with it — for items 04 and 14 that is the only photo there is.
        const mergedBiscuitId = item.legacyRouteIds.find((route) => route.startsWith("biscuit-cake-"))?.replace("biscuit-cake-", "");
        const mergedBiscuit = mergedBiscuitId ? biscuitById.get(mergedBiscuitId) : undefined;
        const mergedImages = mergedBiscuit
          ? [mergedBiscuit.image, ...(mergedBiscuit.images || [])].filter((value): value is string => Boolean(value))
          : [];
        docs.push({
          ...base,
          _type: "recipe",
          sequenceId: recipe.sequenceId ?? null,
          instagramShortcode: item.instagramShortcode,
          sourceUrl: recipe.sourceUrl || undefined,
          publishedDate: recipe.publishedDate,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          notes: recipe.notes,
          prepTimeMinutes: recipe.prepTimeMinutes,
          siteCategory: recipe.siteCategory,
          categorySlug: recipe.categorySlug,
          foodType: recipe.foodType,
          difficulty: recipe.difficulty,
          difficultySlug: recipe.difficultySlug,
          // A separate taxonomy from the four above: zero, one or several
          // holidays per recipe, and empty unless the source caption named the
          // holiday outright. See HOLIDAY_ASSIGNMENTS in migration-source.ts.
          holidays: holidaysFor(recipe.sequenceId),
          // Series metadata comes from the manifest so there is one source of
          // truth. A biscuit cake is an ordinary recipe with these two fields
          // set — there is no separate document type for it.
          series: item.series ?? undefined,
          seriesPosition: item.seriesPosition ?? undefined,
          tags: recipe.tags,
          legacyImages: recipeLegacyImages(recipe, mergedImages),
          legacyImageFolder: item.imageFolderSlug ?? undefined,
          status: recipe.status,
          listed: item.listed,
          alternateSourceUrls: item.alternateSourceUrls,
          absorbedSequenceIds: absorbedRecipes.length
            ? absorbedRecipes.map((absorbed) => absorbed.sequenceId).filter((value): value is number => typeof value === "number")
            : undefined,
          retiredContentIds: item.retiredContentIds?.length ? item.retiredContentIds : undefined,
          issues: [
            ...new Set([
              ...(recipe.issues || []),
              ...absorbedRecipes.flatMap((absorbed) => absorbed.issues || []),
            ]),
          ],
          sourceFiles: (recipe.sourceFiles || []).map((file, index) => ({
            _type: "sourceFileRef",
            _key: `src-${index}`,
            path: file.path,
            type: file.type,
            row: file.row,
          })),
          contentCategory: recipe.contentCategory,
          ingredientsText: recipe.ingredientsText,
          instructionsText: recipe.instructionsText,
          imageMatchConfidence: recipe.imageMatch?.confidence,
          imageMatchMethod: recipe.imageMatch?.method ?? undefined,
          imageMatchKey: recipe.imageMatch?.imageKey ?? undefined,
        });
        continue;
      }

      // A biscuit-cake series item with no reviewed catalog record behind it.
      const biscuitId = item.legacyRouteIds[0]?.replace("biscuit-cake-", "");
      // A catalog row absorbed into this series item (see CATALOG_CORRECTIONS)
      // is the only verified source of editorial metadata it has.
      const absorbedRow = item.legacyRouteIds
        .slice(1)
        .map((route) => recipeByRouteId.get(route))
        .find((value): value is Recipe => Boolean(value));
      const biscuit = biscuitId ? biscuitById.get(biscuitId) : undefined;
      if (!biscuit) {
        skipped.push({ contentId: item.contentId, reason: `No source record found for route "${item.legacyRouteIds[0]}".` });
        continue;
      }
      docs.push({
        ...base,
        // A biscuit-series item with no catalog record behind it is still an
        // ordinary Recipe — it just carries the series name and its position.
        _type: "recipe",
        // Identity and source metadata come from the manifest, which folds in
        // an absorbed catalog row where a correction records one.
        sequenceId: item.sequenceId ?? undefined,
        instagramShortcode: item.instagramShortcode ?? undefined,
        sourceUrl: absorbedRow?.sourceUrl || undefined,
        publishedDate: absorbedRow?.publishedDate,
        alternateSourceUrls: item.alternateSourceUrls,
        series: item.series ?? undefined,
        seriesPosition: item.seriesPosition ?? undefined,
        // Editorial values are taken ONLY from an absorbed catalog row. There
        // are deliberately no fallbacks here: an invented prep time or
        // difficulty renders as fact on the page, and "30 minutes / קל" was
        // exactly that. With no verified source the field stays empty and the
        // page hides the stat.
        siteCategory: absorbedRow?.siteCategory,
        categorySlug: absorbedRow?.categorySlug,
        foodType: absorbedRow?.foodType,
        difficulty: absorbedRow?.difficulty,
        difficultySlug: absorbedRow?.difficultySlug,
        prepTimeMinutes: absorbedRow?.prepTimeMinutes,
        notes: absorbedRow?.notes,
        // No catalog record behind this one, so the only source text is the
        // hand-authored series title — enough for item 07, empty for any other.
        holidays: holidaysForBiscuit(biscuitId),
        legacyImages: seriesLegacyImages(biscuit.image, biscuit.images),
        status: absorbedRow ? absorbedRow.status : "NEEDS_REVIEW",
        listed: item.listed,
        issues: absorbedRow ? absorbedRow.issues : ["LEGACY_SERIES_STANDIN_NO_CATALOG_RECORD"],
      });
      continue;
    }

    if (item.contentType === "dateIdea") {
      const dateItem = dateById.get(item.legacyRouteIds[0]);
      if (!dateItem) {
        skipped.push({ contentId: item.contentId, reason: `No date-series record for "${item.legacyRouteIds[0]}".` });
        continue;
      }
      const reviewNote = DATE_REVIEW_NOTES[dateItem.id];
      docs.push({
        ...base,
        _type: "dateIdea",
        seriesPosition: item.seriesPosition ?? undefined,
        place: dateItem.place,
        budget: dateItem.budget,
        plan: dateItem.plan
          ? {
              _type: "datePlan",
              cost: dateItem.plan.cost,
              duration: dateItem.plan.duration,
              effort: dateItem.plan.effort,
              needed: dateItem.plan.needed,
              prepAhead: dateItem.plan.prepAhead,
              whatYouDo: dateItem.plan.whatYouDo,
              note: dateItem.plan.note,
            }
          : undefined,
        legacyImages: seriesLegacyImages(dateItem.image, dateItem.images),
        videos: [],
        needsRotemApproval: Boolean(reviewNote),
        reviewNote,
      });
      continue;
    }

    const gameItem = gameBySlug.get(item.legacyRouteIds[0] as never);
    if (!gameItem) {
      skipped.push({ contentId: item.contentId, reason: `No game record for "${item.legacyRouteIds[0]}".` });
      continue;
    }
    docs.push({
      ...base,
      _type: "game",
      tagline: gameItem.tagline,
      kicker: gameItem.kicker,
      description: gameItem.description,
      kind: gameItem.kind,
      price: gameItem.price,
      icon: gameItem.icon,
      themeClass: gameItem.themeClass,
      legacyImages: gameItem.image ? [legacyImage(gameItem.image, "main")] : [],
      legacyLandingPagePath: `content/games/${gameItem.slug}.html`,
      marketingBody: [],
    });
  }

  return { docs, skipped };
}

/** Sanity rejects explicit undefined; strip it so a missing optional field is
 * simply absent rather than an error. */
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripUndefined) as T;
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      if (inner === undefined) continue;
      result[key] = stripUndefined(inner);
    }
    return result as T;
  }
  return value;
}

/* ------------------------------------------------------------------ main */

const { docs: rawDocs, skipped } = buildDocuments();
const docs = rawDocs.map(stripUndefined);

console.log(`Manifest items: ${manifest.items.length}`);
console.log(`Documents built: ${docs.length}`);
console.log(`  recipe:   ${docs.filter((doc) => doc._type === "recipe").length}`);
console.log(`  dateIdea: ${docs.filter((doc) => doc._type === "dateIdea").length}`);
console.log(`  game:     ${docs.filter((doc) => doc._type === "game").length}`);
if (skipped.length) {
  console.log(`\nSkipped (no source record): ${skipped.length}`);
  for (const entry of skipped) console.log(`  - ${entry.contentId}: ${entry.reason}`);
}

// Sanity document ids must match ^[A-Za-z0-9._-]+$; ULID-based contentIds do.
const badIds = docs.filter((doc) => !/^[A-Za-z0-9._-]+$/.test(doc._id));
if (badIds.length) {
  console.error(`\n${badIds.length} document id(s) are not valid Sanity ids.`);
  process.exit(1);
}

if (dryRun) {
  fs.writeFileSync(PLAN_PATH, `${JSON.stringify({ generatedAt: new Date().toISOString(), skipped, docs }, null, 2)}\n`, "utf8");
  console.log(`\nDry run — wrote ${path.relative(PROJECT_ROOT, PLAN_PATH)}. Nothing was sent to Sanity.`);
  process.exit(0);
}

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const token = process.env.SANITY_API_WRITE_TOKEN;

if (!projectId || !token) {
  console.error(
    "\nMissing credentials. Set NEXT_PUBLIC_SANITY_PROJECT_ID and SANITY_API_WRITE_TOKEN in .env.local " +
      "(see .env.example), or run with --dry-run.",
  );
  process.exit(1);
}

const { createClient } = await import("@sanity/client");
const client = createClient({
  projectId,
  dataset,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-09-07",
  token,
  useCdn: false,
});

const existingIds = new Set<string>(
  await client.fetch<string[]>('*[_type in ["recipe","dateIdea","game"]]._id'),
);

let created = 0;
let repaired = 0;
let refreshed = 0;

// Batched so a large import is a handful of requests rather than 179.
const BATCH_SIZE = 25;
for (let start = 0; start < docs.length; start += BATCH_SIZE) {
  const batch = docs.slice(start, start + BATCH_SIZE);
  let transaction = client.transaction();

  for (const doc of batch) {
    if (!existingIds.has(doc._id)) {
      transaction = transaction.createIfNotExists(doc as never);
      created += 1;
      continue;
    }
    if (updateExisting) {
      // Replace the importer-owned content wholesale, but never touch fields
      // an editor added that the importer knows nothing about — nor the
      // seed-only fields, which the Studio, not the local sources, now owns.
      const { _id, _type, ...fields } = doc;
      void _type;
      for (const field of SEED_ONLY_FIELDS) delete fields[field];
      transaction = transaction.patch(_id, (patch) => patch.set(fields));
      refreshed += 1;
      continue;
    }
    const identity = Object.fromEntries(
      IDENTITY_FIELDS.filter((field) => doc[field] !== undefined).map((field) => [field, doc[field]]),
    );
    transaction = transaction.patch(doc._id, (patch) => patch.set(identity));
    repaired += 1;
  }

  await transaction.commit({ visibility: "async" });
  console.log(`  committed ${Math.min(start + BATCH_SIZE, docs.length)}/${docs.length}`);
}

console.log(`\nCreated:   ${created}`);
console.log(`Repaired identity on existing: ${repaired}`);
console.log(`Refreshed content on existing: ${refreshed}`);
console.log(`Skipped:   ${skipped.length}`);
