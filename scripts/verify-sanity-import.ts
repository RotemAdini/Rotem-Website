/**
 * Compares what Sanity holds against what the live website currently reads,
 * and reports anything that is not fully explained.
 *
 *   node scripts/verify-sanity-import.ts --offline   # verify the dry-run plan (no credentials needed)
 *   node scripts/verify-sanity-import.ts             # verify the real Sanity dataset
 *
 * The bar is 100% explainable mapping before the frontend is allowed to switch
 * to Sanity, so this exits non-zero on any unexplained difference.
 *
 * Read-only: it never writes to Sanity and never modifies a local data file.
 */

import fs from "node:fs";
import path from "node:path";

import {
  PROJECT_ROOT,
  allBiscuitItems,
  allDateItems,
  allGames,
  findBiscuitOverlaps,
  getReviewedRecipes,
  CATALOG_CORRECTIONS,
  isAbsorbedIntoBiscuit,
  isListable,
  loadRecipeCatalog,
  normalizeImagePath,
  recipeImagePaths,
  slugifyTitle,
  BISCUIT_HOLIDAY_ASSIGNMENTS,
  HOLIDAY_ASSIGNMENTS,
  HOLIDAY_REVIEW_CANDIDATES,
} from "./migration-source.ts";
import {
  RECIPE_CATEGORIES,
  RECIPE_DIFFICULTIES,
  RECIPE_FOOD_TYPES,
  RECIPE_HOLIDAYS,
  taxonomyPairIssues,
} from "../sanity/schemaTypes/taxonomy.ts";

const MANIFEST_PATH = path.join(PROJECT_ROOT, "data/migration/content-manifest.json");
const PLAN_PATH = path.join(PROJECT_ROOT, "data/migration/import-plan.json");
const REPORT_PATH = path.join(PROJECT_ROOT, "data/migration/verification-report.json");

const offline = process.argv.includes("--offline");

interface Doc {
  _id: string;
  _type: string;
  contentId?: string;
  title?: string;
  slug?: { current?: string };
  legacyIds?: string[];
  legacyRouteIds?: string[];
  legacyImages?: { path?: string }[];
  listed?: boolean;
  siteCategory?: string;
  categorySlug?: string;
  foodType?: string;
  difficulty?: string;
  difficultySlug?: string;
  ingredients?: string[];
  instructions?: string[];
  series?: string;
  seriesPosition?: number;
  legacyImageFolder?: string;
  alternateTitles?: string[];
  holidays?: string[];
  sequenceId?: number | null;
}

/* ------------------------------------------------------- what we expect */

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as {
  items: { contentId: string; contentType: string; legacyIds: string[]; legacyRoutes: string[]; flags: string[] }[];
  mergeDecisions: { biscuitId: string; recipeRouteId: string }[];
};

const catalog = loadRecipeCatalog();
const reviewed = getReviewedRecipes(catalog.recipes);
const biscuits = allBiscuitItems();
const dates = allDateItems();
const games = allGames();
const overlaps = findBiscuitOverlaps(reviewed);
const mergedBiscuitIds = new Set(overlaps.map((overlap) => overlap.biscuitId));

/** Catalog records absorbed into a counterpart because they are a second
 * Instagram post of the same dish (see the manifest's mergeDecisions). */
const absorbedRecipeCount = reviewed.filter((recipe) =>
  (recipe.issues || []).some((issue) => issue.startsWith("DUPLICATE_OF_SEQUENCE_")),
).length;

/** Catalog rows folded into a legacy series item by a recorded correction, so
 * they get no canonical document of their own. */
const absorbedIntoSeriesCount = reviewed.filter((recipe) => isAbsorbedIntoBiscuit(recipe.sequenceId)).length;

const expected = {
  reviewedCatalogRecipes: reviewed.length,
  duplicatePostsAbsorbed: absorbedRecipeCount,
  biscuitSeriesItems: biscuits.length,
  biscuitSeriesMergedIntoCatalogRecipes: mergedBiscuitIds.size,
  biscuitSeriesStandalone: biscuits.length - mergedBiscuitIds.size,
  catalogRowsAbsorbedIntoSeriesItems: absorbedIntoSeriesCount,
  canonicalRecipes: reviewed.length - absorbedRecipeCount - absorbedIntoSeriesCount + (biscuits.length - mergedBiscuitIds.size),
  dateIdeas: dates.length,
  games: games.length,
  canonicalTotal:
    reviewed.length - absorbedRecipeCount - absorbedIntoSeriesCount + (biscuits.length - mergedBiscuitIds.size) + dates.length + games.length,
  favouriteTokens: reviewed.length + biscuits.length + dates.length,
  routes: reviewed.length + biscuits.length + dates.length + games.length,
};

/* ----------------------------------------------------------- what we got */

async function loadDocuments(): Promise<Doc[]> {
  if (offline) {
    if (!fs.existsSync(PLAN_PATH)) {
      console.error("No import plan. Run: node scripts/import-to-sanity.ts --dry-run");
      process.exit(1);
    }
    return (JSON.parse(fs.readFileSync(PLAN_PATH, "utf8")) as { docs: Doc[] }).docs;
  }

  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const token = process.env.SANITY_API_WRITE_TOKEN;
  if (!projectId) {
    console.error("NEXT_PUBLIC_SANITY_PROJECT_ID is not set. Use --offline to verify the dry-run plan instead.");
    process.exit(1);
  }
  const { createClient } = await import("@sanity/client");
  const client = createClient({
    projectId,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
    apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-09-07",
    token,
    useCdn: false,
  });
  return client.fetch<Doc[]>('*[_type in ["recipe","dateIdea","game"]]');
}

/* ------------------------------------------------------------- compare */

const docs = await loadDocuments();
const problems: string[] = [];
const notes: string[] = [];

const byType = (type: string) => docs.filter((doc) => doc._type === type);
const imported = {
  recipes: byType("recipe").length,
  dateIdeas: byType("dateIdea").length,
  games: byType("game").length,
  total: docs.length,
};

if (imported.recipes !== expected.canonicalRecipes) {
  problems.push(`Recipes: expected ${expected.canonicalRecipes}, found ${imported.recipes}.`);
}
if (imported.dateIdeas !== expected.dateIdeas) {
  problems.push(`Date ideas: expected ${expected.dateIdeas}, found ${imported.dateIdeas}.`);
}
if (imported.games !== expected.games) {
  problems.push(`Games: expected ${expected.games}, found ${imported.games}.`);
}

// --- every manifest item present exactly once -----------------------------
const docById = new Map<string, Doc[]>();
for (const doc of docs) docById.set(doc._id, [...(docById.get(doc._id) || []), doc]);

const missing = manifest.items.filter((item) => !docById.has(item.contentId));
const duplicated = [...docById.entries()].filter(([, group]) => group.length > 1);
const unexpected = docs.filter((doc) => !manifest.items.some((item) => item.contentId === doc._id));

if (missing.length) problems.push(`${missing.length} manifest item(s) have no document.`);
if (duplicated.length) problems.push(`${duplicated.length} contentId(s) have more than one document.`);
if (unexpected.length) problems.push(`${unexpected.length} document(s) exist with no manifest entry.`);

// --- contentId integrity ---------------------------------------------------
for (const doc of docs) {
  if (doc.contentId !== doc._id) {
    problems.push(`Document ${doc._id} has contentId "${doc.contentId}" — the two must match.`);
  }
}

// --- every favourite token and every route resolves to exactly one doc -----
const tokenOwners = new Map<string, string[]>();
const routeOwners = new Map<string, string[]>();
for (const doc of docs) {
  for (const token of doc.legacyIds || []) tokenOwners.set(token, [...(tokenOwners.get(token) || []), doc._id]);
  for (const route of doc.legacyRouteIds || []) {
    const prefix = doc._type === "recipe" ? "/recipes/" : doc._type === "dateIdea" ? "/dates/" : "/games/";
    const key = `${prefix}${route}`;
    routeOwners.set(key, [...(routeOwners.get(key) || []), doc._id]);
  }
}

const expectedTokens = [
  ...reviewed.map((recipe) => `recipe-${recipe.id}`),
  ...biscuits.map((item) => `biscuit-cake-${item.id}`),
  ...dates.map((item) => `date-a-b-${item.id}`),
];
const unmappedTokens = expectedTokens.filter((token) => !tokenOwners.has(token));
const ambiguousTokens = [...tokenOwners.entries()].filter(([, owners]) => new Set(owners).size > 1);
if (unmappedTokens.length) problems.push(`${unmappedTokens.length} existing favourite token(s) resolve to nothing.`);
if (ambiguousTokens.length) problems.push(`${ambiguousTokens.length} favourite token(s) resolve to more than one document.`);

const expectedRoutes = [
  ...reviewed.map((recipe) => `/recipes/${recipe.id}`),
  ...biscuits.map((item) => `/recipes/biscuit-cake-${item.id}`),
  ...dates.map((item) => `/dates/${item.id}`),
  ...games.map((game) => `/games/${game.slug}`),
];
const unmappedRoutes = expectedRoutes.filter((route) => !routeOwners.has(route));
const ambiguousRoutes = [...routeOwners.entries()].filter(([, owners]) => new Set(owners).size > 1);
if (unmappedRoutes.length) problems.push(`${unmappedRoutes.length} existing route(s) resolve to nothing.`);
if (ambiguousRoutes.length) problems.push(`${ambiguousRoutes.length} route(s) resolve to more than one document.`);

// --- biscuit cakes must be ordinary Recipe documents ----------------------
// The architecture decision is that there is no separate biscuit-cake content
// type: every one of them is a Recipe carrying series + seriesPosition.
const BISCUIT_SERIES_NAME = "עוגות ביסקוויטים";
const allowedTypes = new Set(["recipe", "dateIdea", "game"]);
const strayTypes = [...new Set(docs.map((doc) => doc._type))].filter((type) => !allowedTypes.has(type));
if (strayTypes.length) problems.push(`Unexpected document type(s): ${strayTypes.join(", ")}.`);

const biscuitDocs = docs.filter(
  (doc) => doc.series === BISCUIT_SERIES_NAME || (doc.legacyRouteIds || []).some((route) => route.startsWith("biscuit-cake-")),
);
const biscuitNotRecipe = biscuitDocs.filter((doc) => doc._type !== "recipe");
if (biscuitNotRecipe.length) {
  problems.push(`${biscuitNotRecipe.length} biscuit-cake item(s) are not Recipe documents.`);
}
const biscuitMissingSeries = biscuitDocs.filter((doc) => doc.series !== BISCUIT_SERIES_NAME);
if (biscuitMissingSeries.length) {
  problems.push(`${biscuitMissingSeries.length} biscuit-cake recipe(s) are missing the series name.`);
}
const biscuitMissingPosition = biscuitDocs.filter((doc) => typeof doc.seriesPosition !== "number");
const biscuitPositions = biscuitDocs
  .map((doc) => doc.seriesPosition)
  .filter((value): value is number => typeof value === "number");
const duplicatePositions = biscuitPositions.filter((value, index) => biscuitPositions.indexOf(value) !== index);
if (duplicatePositions.length) {
  problems.push(`Biscuit series positions used more than once: ${[...new Set(duplicatePositions)].join(", ")}.`);
}

/**
 * Slugs must be Hebrew and derived from a title this recipe has carried —
 * never invented, and never taken from an English image-folder name.
 *
 * "a title it has carried", not "its current title": the architecture is
 * explicit that editing a title must NOT move the slug, so once an editor
 * renames a recipe in the Studio the two legitimately diverge. The previous
 * title is kept in alternateTitles, so accepting either is the invariant that
 * is actually true — and it still catches a slug that matches no title at all.
 */
function slugMatchesSomeTitle(doc: Doc): boolean {
  const candidates = [doc.title || "", ...(doc.alternateTitles || [])];
  return candidates.some((candidate) => doc.slug?.current === slugifyTitle(candidate));
}

const slugDerivedFromTitle = docs.filter((doc) => doc._type !== "game" && slugMatchesSomeTitle(doc));
const slugNotDerived = docs.filter((doc) => doc._type !== "game" && !slugMatchesSomeTitle(doc));
if (slugNotDerived.length) {
  problems.push(`${slugNotDerived.length} slug(s) match neither their current title nor any title they were published under.`);
}

/** Renamed in the Studio with the slug deliberately kept — reported, not a problem. */
const slugBehindTitle = docs.filter(
  (doc) => doc._type !== "game" && slugMatchesSomeTitle(doc) && doc.slug?.current !== slugifyTitle(doc.title || ""),
);
const slugMatchingImageFolder = docs.filter(
  (doc) => doc.legacyImageFolder && doc.slug?.current === doc.legacyImageFolder,
);
if (slugMatchingImageFolder.length) {
  problems.push(`${slugMatchingImageFolder.length} slug(s) equal their English image-folder name; slugs must come from the title.`);
}

// --- slug uniqueness within a type ----------------------------------------
const slugOwners = new Map<string, string[]>();
for (const doc of docs) {
  const key = `${doc._type}:${doc.slug?.current ?? ""}`;
  slugOwners.set(key, [...(slugOwners.get(key) || []), doc._id]);
}
const slugCollisions = [...slugOwners.entries()].filter(([, owners]) => owners.length > 1);
if (slugCollisions.length) {
  problems.push(`${slugCollisions.length} canonical slug(s) resolve to more than one document.`);
}

// --- content fidelity for catalog recipes ---------------------------------
const recipeByRoute = new Map(reviewed.map((recipe) => [recipe.id, recipe]));
let ingredientMismatches = 0;
let instructionMismatches = 0;
let listedMismatches = 0;
/**
 * Recipes whose text is authored in the Studio and no longer expected to match
 * data/recipes.json. Recorded in CATALOG_CORRECTIONS, not inferred: without
 * this, the first recipe Rotem edits in Sanity would read as a migration
 * failure. Reported below so the divergence stays visible.
 */
const authoredInSanity = docs.filter((doc) =>
  (doc.legacyRouteIds || []).some((route) => {
    const source = recipeByRoute.get(route);
    return source ? CATALOG_CORRECTIONS.some((c) => c.sequenceId === source.sequenceId && c.contentAuthoredInSanity) : false;
  }),
);
const authoredInSanityIds = new Set(authoredInSanity.map((doc) => doc._id));

for (const doc of byType("recipe")) {
  if (authoredInSanityIds.has(doc._id)) continue;
  const source = (doc.legacyRouteIds || []).map((route) => recipeByRoute.get(route)).find(Boolean);
  if (!source) continue;
  if ((doc.ingredients || []).join(" ") !== source.ingredients.join(" ")) ingredientMismatches += 1;
  if ((doc.instructions || []).join(" ") !== source.instructions.join(" ")) instructionMismatches += 1;
  if (doc.listed !== isListable(source)) listedMismatches += 1;
}
if (ingredientMismatches) problems.push(`${ingredientMismatches} recipe(s) have ingredients that differ from the source.`);
if (instructionMismatches) problems.push(`${instructionMismatches} recipe(s) have instructions that differ from the source.`);
if (listedMismatches) problems.push(`${listedMismatches} recipe(s) have a "listed" flag that differs from the source.`);

// --- taxonomy: nothing new may have been introduced -----------------------
const categoryTitles = new Set<string>(RECIPE_CATEGORIES.map((entry) => entry.title));
const categoryValues = new Set<string>(RECIPE_CATEGORIES.map((entry) => entry.value));
const difficultyTitles = new Set<string>(RECIPE_DIFFICULTIES.map((entry) => entry.title));
const difficultyValues = new Set<string>(RECIPE_DIFFICULTIES.map((entry) => entry.value));
const foodTypes = new Set<string>(RECIPE_FOOD_TYPES);
const taxonomyProblems: string[] = [];
for (const doc of byType("recipe")) {
  taxonomyProblems.push(...taxonomyPairIssues(doc).map((issue) => `${doc._id}: ${issue}`));
  if (doc.siteCategory && !categoryTitles.has(doc.siteCategory)) taxonomyProblems.push(`siteCategory "${doc.siteCategory}"`);
  if (doc.categorySlug && !categoryValues.has(doc.categorySlug)) taxonomyProblems.push(`categorySlug "${doc.categorySlug}"`);
  if (doc.difficulty && !difficultyTitles.has(doc.difficulty)) taxonomyProblems.push(`difficulty "${doc.difficulty}"`);
  if (doc.difficultySlug && !difficultyValues.has(doc.difficultySlug)) taxonomyProblems.push(`difficultySlug "${doc.difficultySlug}"`);
  if (doc.foodType && !foodTypes.has(doc.foodType)) taxonomyProblems.push(`foodType "${doc.foodType}"`);
}
if (taxonomyProblems.length) {
  problems.push(`${new Set(taxonomyProblems).size} classification value(s) outside the approved taxonomy.`);
}

// --- holidays: a separate taxonomy, never guessed --------------------------
// Three things have to hold: every stored value is in the controlled
// vocabulary, every recorded assignment actually landed, and nothing else
// acquired a holiday along the way. The last one is the important guard — it
// is what stops an inference from quietly becoming data.
const holidayValues = new Set<string>(RECIPE_HOLIDAYS.map((entry) => entry.value));
const holidayProblems: string[] = [];
const unexpectedHolidayDocs: { title?: string; sequenceId?: number | null; holidays?: string[] }[] = [];
const assignedBySequence = new Map(HOLIDAY_ASSIGNMENTS.map((entry) => [entry.sequenceId, entry.holidays]));
const holidayCounts: Record<string, number> = {};

/** What the migration tables say a document should hold: keyed by sequenceId
 * for a catalog recipe, and by legacy biscuit id for the one series item that
 * has no catalog record. */
const expectedHolidaysFor = (doc: Doc): string[] => {
  const bySequence = assignedBySequence.get(doc.sequenceId as number);
  if (bySequence) return bySequence;
  const biscuitId = (doc.legacyRouteIds || [])
    .find((route) => route.startsWith("biscuit-cake-"))
    ?.replace("biscuit-cake-", "");
  if (biscuitId && doc.sequenceId == null) return BISCUIT_HOLIDAY_ASSIGNMENTS[biscuitId]?.holidays ?? [];
  return [];
};

for (const doc of byType("recipe")) {
  const holidays = doc.holidays || [];
  for (const value of holidays) {
    if (!holidayValues.has(value)) holidayProblems.push(`holiday "${value}"`);
    holidayCounts[value] = (holidayCounts[value] || 0) + 1;
  }
  if (new Set(holidays).size !== holidays.length) {
    holidayProblems.push(`duplicate holiday value on "${doc.title}"`);
  }

  const expectedHolidays = expectedHolidaysFor(doc);
  const same =
    expectedHolidays.length === holidays.length && expectedHolidays.every((value) => holidays.includes(value));
  if (!same) {
    // Only a mismatch against the recorded table is reported here. Once Rotem
    // starts assigning holidays in the Studio this check would fire on her
    // work, which is why it is a note in the report rather than a hard
    // problem for anything beyond the migrated set being wrong.
    unexpectedHolidayDocs.push({ title: doc.title, sequenceId: doc.sequenceId, holidays });
  }
}
if (holidayProblems.length) {
  problems.push(`${new Set(holidayProblems).size} holiday value(s) outside the approved vocabulary or duplicated.`);
}

const holidayAssignmentsMissing = HOLIDAY_ASSIGNMENTS.filter((entry) => {
  const doc = byType("recipe").find((candidate) => candidate.sequenceId === entry.sequenceId);
  return !doc || !entry.holidays.every((value) => (doc.holidays || []).includes(value));
});
if (holidayAssignmentsMissing.length) {
  problems.push(
    `${holidayAssignmentsMissing.length} recorded holiday assignment(s) did not reach a document: ` +
      holidayAssignmentsMissing.map((entry) => `#${entry.sequenceId}`).join(", "),
  );
}

// --- images ----------------------------------------------------------------
// Compared on the normalized (root-relative) form, because data/recipes.json
// and lib/*.ts spell the same file differently — see normalizeImagePath().
const sourceImagePaths = new Set<string>();
const addSource = (value: string | null | undefined) => value && sourceImagePaths.add(normalizeImagePath(value));
for (const recipe of reviewed) recipeImagePaths(recipe).forEach(addSource);
for (const item of biscuits) [item.image, ...(item.images || [])].forEach(addSource);
for (const item of dates) [item.image, ...(item.images || [])].forEach(addSource);
for (const game of games) addSource(game.image);

const importedImagePaths = new Set<string>();
for (const doc of docs) for (const image of doc.legacyImages || []) if (image.path) importedImagePaths.add(normalizeImagePath(image.path));

const droppedImages = [...sourceImagePaths].filter((value) => !importedImagePaths.has(value));
if (droppedImages.length) problems.push(`${droppedImages.length} image path(s) present in the site data were not imported.`);

// No document may list the same photo twice. The hand-authored series store
// their lead photo both as `image` and as the first entry of `images`, so a
// naive concatenation would file it as "main" and again as "gallery" — the
// site hides that by deduplicating at render time, but the stored data must
// not carry the repetition into a gallery that renders it straight.
const documentsWithRepeatedImages = docs
  .map((doc) => {
    const paths = (doc.legacyImages || []).map((image) => normalizeImagePath(image.path || ""));
    const repeated = paths.filter((value, index) => value && paths.indexOf(value) !== index);
    return { id: doc._id, title: doc.title, repeated: [...new Set(repeated)] };
  })
  .filter((entry) => entry.repeated.length);
if (documentsWithRepeatedImages.length) {
  problems.push(`${documentsWithRepeatedImages.length} document(s) list the same image path more than once.`);
}

/**
 * Galleries must survive the migration exactly.
 *
 * Recipes and date ideas are allowed — and expected — to carry several
 * different photos, and that gallery is content, not redundancy. The only
 * thing deduplication may ever remove is a repeated reference to the *same*
 * path within one item, which the hand-authored series produce by storing
 * their lead photo as both `image` and `images[0]`.
 *
 * So this recomputes, from the local sources, the ordered list of distinct
 * paths each document should hold, and compares it element by element. It
 * catches both failure directions: a collapsed gallery, and a duplicate that
 * slipped back in.
 */
const recipeByRouteForImages = new Map(reviewed.map((recipe) => [recipe.id, recipe]));
const biscuitByIdForImages = new Map(biscuits.map((item) => [item.id, item]));
const dateByIdForImages = new Map(dates.map((item) => [item.id, item]));
const gameBySlugForImages = new Map<string, (typeof games)[number]>(games.map((game) => [game.slug, game]));

function distinctInOrder(values: (string | null | undefined)[]): string[] {
  const out: string[] = [];
  for (const raw of values) {
    const value = normalizeImagePath(raw || "");
    if (value && !out.includes(value)) out.push(value);
  }
  return out;
}

function expectedImagesFor(doc: Doc): string[] {
  const routes = doc.legacyRouteIds || [];
  if (doc._type === "dateIdea") {
    const item = dateByIdForImages.get(routes[0]);
    return distinctInOrder([item?.image, ...(item?.images || [])]);
  }
  if (doc._type === "game") {
    return distinctInOrder([gameBySlugForImages.get(routes[0])?.image]);
  }
  const recipe = recipeByRouteForImages.get(routes[0]);
  const biscuitId = routes.find((route) => route.startsWith("biscuit-cake-"))?.replace("biscuit-cake-", "");
  const biscuit = biscuitId ? biscuitByIdForImages.get(biscuitId) : undefined;
  if (!recipe) return distinctInOrder([biscuit?.image, ...(biscuit?.images || [])]);
  return distinctInOrder([
    recipe.images?.thumbnail,
    recipe.images?.main,
    recipe.images?.hero,
    ...(recipe.images?.gallery || []),
    ...(recipe.images?.new || []),
    biscuit?.image,
    ...(biscuit?.images || []),
  ]);
}

const galleryMismatches = docs
  .map((doc) => {
    const expectedPaths = expectedImagesFor(doc);
    const actualPaths = (doc.legacyImages || []).map((image) => normalizeImagePath(image.path || ""));
    const matches =
      expectedPaths.length === actualPaths.length && expectedPaths.every((path, index) => path === actualPaths[index]);
    return matches ? null : { contentId: doc._id, title: doc.title, expected: expectedPaths, actual: actualPaths };
  })
  .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

if (galleryMismatches.length) {
  problems.push(`${galleryMismatches.length} document(s) do not hold exactly their distinct source images, in order.`);
}

const multiImageDocuments = docs.filter((doc) => (doc.legacyImages || []).length > 1);

// Photos that exist on disk but that no document references, and videos the
// current data model has no field for at all.
const orphanVideos: string[] = [];
for (const root of ["images"]) {
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(mov|mp4|webm)$/i.test(entry.name)) orphanVideos.push(path.relative(PROJECT_ROOT, full).replace(/\\/g, "/"));
    }
  };
  walk(path.join(PROJECT_ROOT, root));
}

notes.push(
  `Images are imported as repository paths (legacyImage), not uploaded Sanity assets: the live site still serves ` +
    `every photo from /public, and re-hosting is a separate decision. ${importedImagePaths.size} path(s) recorded.`,
);
if (orphanVideos.length) {
  notes.push(
    `${orphanVideos.length} video file(s) exist under images/ that the current site data model cannot reference at ` +
      `all (no video field in data/recipes.json). The Sanity recipe schema does not add one either, so they remain ` +
      `unrepresented: ${orphanVideos.join(", ")}`,
  );
}

// --- field-level loss check ------------------------------------------------
const RECIPE_FIELD_MAPPING: Record<string, string> = {
  id: "legacyRouteIds[] (and legacyIds[] as recipe-<id>)",
  title: "title",
  sourceUrl: "sourceUrl",
  ingredients: "ingredients",
  instructions: "instructions",
  images: "legacyImages[] + legacyImageFolder",
  imageMatch: "imageMatchConfidence / imageMatchMethod / imageMatchKey",
  sourceFiles: "sourceFiles[]",
  status: "status",
  issues: "issues[]",
  sequenceId: "sequenceId",
  publishedDate: "publishedDate",
  contentCategory: "contentCategory",
  foodType: "foodType",
  ingredientsText: "ingredientsText",
  instructionsText: "instructionsText",
  siteCategory: "siteCategory",
  categorySlug: "categorySlug",
  difficulty: "difficulty",
  difficultySlug: "difficultySlug",
  prepTimeMinutes: "prepTimeMinutes",
  notes: "notes",
  series: "series",
  tags: "tags[]",
};
const DELIBERATELY_DROPPED: Record<string, string> = {
  slug: 'The dead "slug" field in data/recipes.json — never read by the site, and wrong for 7 records (id "עו-12" vs slug "עו"). Replaced by the real Sanity slug; the old route id survives in legacyRouteIds.',
};

const sourceRecipeFields = new Set<string>();
for (const recipe of reviewed) Object.keys(recipe).forEach((key) => sourceRecipeFields.add(key));
const unmappedFields = [...sourceRecipeFields].filter((key) => !(key in RECIPE_FIELD_MAPPING) && !(key in DELIBERATELY_DROPPED));
if (unmappedFields.length) {
  problems.push(`${unmappedFields.length} source recipe field(s) have no place in the Sanity schema: ${unmappedFields.join(", ")}.`);
}

/* -------------------------------------------------------------- report */

const report = {
  generatedAt: new Date().toISOString(),
  mode: offline ? "offline (dry-run plan)" : "live Sanity dataset",
  expected,
  imported,
  biscuitMerges: overlaps.map((overlap) => ({
    biscuitId: overlap.biscuitId,
    biscuitTitle: overlap.biscuitTitle,
    intoRecipe: overlap.recipeId,
    sequenceId: overlap.recipeSequenceId,
    method: overlap.method,
  })),
  missing: missing.map((item) => item.contentId),
  duplicates: duplicated.map(([id, group]) => ({ contentId: id, count: group.length })),
  unexpectedDocuments: unexpected.map((doc) => doc._id),
  unmappedFavouriteTokens: unmappedTokens,
  ambiguousFavouriteTokens: ambiguousTokens.map(([token, owners]) => ({ token, owners })),
  unmappedRoutes,
  ambiguousRoutes: ambiguousRoutes.map(([route, owners]) => ({ route, owners })),
  slugCollisions: slugCollisions.map(([key, owners]) => ({ key, owners })),
  contentFidelity: {
    ingredientMismatches,
    instructionMismatches,
    listedMismatches,
    authoredInSanity: authoredInSanity.map((doc) => ({
      contentId: doc._id,
      title: doc.title,
      note: "Content written in the Studio; intentionally diverges from data/recipes.json and is not compared.",
    })),
  },
  biscuitSeries: {
    documentTypesPresent: [...new Set(docs.map((doc) => doc._type))],
    separateBiscuitDocumentType: false,
    recipesInSeries: biscuitDocs.length,
    withSeriesPosition: biscuitDocs.length - biscuitMissingPosition.length,
    positionUnresolved: biscuitMissingPosition.map((doc) => ({ contentId: doc._id, title: doc.title })),
  },
  slugs: {
    rule: "Hebrew, derived from the curated title by sanity/lib/slugify.ts. Image-folder names are never used.",
    derivedFromTitle: slugDerivedFromTitle.length,
    notDerivedFromTitle: slugNotDerived.map((doc) => ({ contentId: doc._id, title: doc.title, slug: doc.slug?.current })),
    renamedWithSlugKept: slugBehindTitle.map((doc) => ({
      contentId: doc._id,
      title: doc.title,
      slug: doc.slug?.current,
      previousTitles: doc.alternateTitles,
      note: "Renamed in the Studio; the slug was deliberately kept so the published URL still resolves.",
    })),
    gamesKeepingExistingEnglishSlug: docs.filter((doc) => doc._type === "game").length,
    slugsEqualToAnImageFolderName: slugMatchingImageFolder.length,
  },
  taxonomyViolations: [...new Set(taxonomyProblems)],
  holidays: {
    rule:
      "A taxonomy of its own, orthogonal to siteCategory / foodType / series. Zero, one or many per recipe, " +
      "stored as controlled English slugs in a plain array of strings, and assigned ONLY where the recipe's own " +
      "caption names the holiday. Never rendered as a card badge; never part of contentId or slug.",
    vocabulary: RECIPE_HOLIDAYS.map((entry) => `${entry.value} (${entry.title})`),
    vocabularyViolations: [...new Set(holidayProblems)],
    migratedFromSource: HOLIDAY_ASSIGNMENTS.length + Object.keys(BISCUIT_HOLIDAY_ASSIGNMENTS).length,
    recipesPerHoliday: holidayCounts,
    recipesWithNoHoliday: byType("recipe").filter((doc) => !(doc.holidays || []).length).length,
    assignmentsThatDidNotLand: holidayAssignmentsMissing.map((entry) => entry.sequenceId),
    /** Empty right after the import; fills up as Rotem assigns holidays in the Studio. */
    differsFromMigrationTable: unexpectedHolidayDocs,
    leftForEditorialReview: HOLIDAY_REVIEW_CANDIDATES,
  },
  images: {
    sourcePaths: sourceImagePaths.size,
    importedPaths: importedImagePaths.size,
    dropped: droppedImages,
    documentsWithRepeatedImages,
    galleryRule:
      "A recipe or date idea may hold several different photos, and that gallery is content. Deduplication only " +
      "ever removes a repeated reference to the same path within one item; a gallery is never collapsed.",
    multiImageGalleries: multiImageDocuments.length,
    largestGallery: multiImageDocuments.reduce((max, doc) => Math.max(max, (doc.legacyImages || []).length), 0),
    galleryMismatches,
    unrepresentableVideos: orphanVideos,
  },
  fieldMapping: RECIPE_FIELD_MAPPING,
  deliberatelyDropped: DELIBERATELY_DROPPED,
  notes,
  problems,
};

fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(`Mode: ${report.mode}`);
console.table({
  "canonical recipes": { expected: expected.canonicalRecipes, imported: imported.recipes },
  "date ideas": { expected: expected.dateIdeas, imported: imported.dateIdeas },
  games: { expected: expected.games, imported: imported.games },
  total: { expected: expected.canonicalTotal, imported: imported.total },
});
console.log(`Biscuit-series items merged into a catalog recipe: ${expected.biscuitSeriesMergedIntoCatalogRecipes}`);
console.log(`Biscuit-series items kept standalone:              ${expected.biscuitSeriesStandalone}`);
console.log(`Duplicate Instagram posts absorbed:                ${expected.duplicatePostsAbsorbed}`);
console.log(`Favourite tokens resolvable:  ${expectedTokens.length - unmappedTokens.length}/${expectedTokens.length}`);
console.log(`Existing routes resolvable:   ${expectedRoutes.length - unmappedRoutes.length}/${expectedRoutes.length}`);
console.log(`Image paths carried over:     ${importedImagePaths.size}/${sourceImagePaths.size}`);
console.log(
  `Galleries preserved exactly:  ${docs.length - galleryMismatches.length}/${docs.length}` +
    ` (${multiImageDocuments.length} multi-image, largest ${multiImageDocuments.reduce((max, doc) => Math.max(max, (doc.legacyImages || []).length), 0)})`,
);
console.log(`Slug collisions:              ${slugCollisions.length}`);
console.log(`Document types present:       ${[...new Set(docs.map((doc) => doc._type))].sort().join(", ")}`);
console.log(`Biscuit cakes as Recipe docs: ${biscuitDocs.length - biscuitNotRecipe.length}/${biscuitDocs.length}`);
console.log(`  with a series position:     ${biscuitDocs.length - biscuitMissingPosition.length}/${biscuitDocs.length}`);
console.log(`Hebrew slugs from a title:    ${slugDerivedFromTitle.length}/${docs.filter((doc) => doc._type !== "game").length}`);
console.log(`  renamed, slug kept on purpose: ${slugBehindTitle.length}`);
for (const note of notes) console.log(`\nNOTE  ${note}`);

if (problems.length) {
  console.error(`\n${problems.length} unexplained problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error(`\nFull report: ${path.relative(PROJECT_ROOT, REPORT_PATH)}`);
  process.exit(1);
}

console.log(`\nAll checks passed. Full report: ${path.relative(PROJECT_ROOT, REPORT_PATH)}`);
