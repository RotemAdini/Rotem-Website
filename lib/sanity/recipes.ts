import "server-only";

import { cache } from "react";

import { getSanityClient } from "@/sanity/lib/client";
import { parseIsraeliDate } from "@/lib/recipe-text";

/**
 * The recipe data layer, backed by Sanity.
 *
 * Every function here runs on the server — the module is marked `server-only`,
 * so importing it from a Client Component is a build error rather than a
 * runtime surprise. Reads use the public dataset and carry no token; the write
 * token is read only by scripts/import-to-sanity.ts from the command line and
 * never reaches this module or the browser bundle.
 *
 * Queries are deliberately unfiltered-then-sorted-in-JS in a couple of places
 * (see sortByPublishedDateDesc) because publishedDate is stored as the
 * DD/MM/YYYY text the source spreadsheet supplied, which GROQ cannot order
 * correctly. Sorting here reuses the exact parser the previous implementation
 * used, so the order on the page is unchanged.
 *
 * The previous JSON-backed implementation is still on disk, untouched, in
 * lib/recipes.ts and lib/recipe-board.ts. Nothing imports it any more; it is
 * kept as the reference for what this layer must reproduce.
 */

export interface SanityRecipeImage {
  path: string;
  /** thumbnail | main | gallery | new — see sanity/schemaTypes/objects.ts. */
  role: string | null;
}

/**
 * Everything a card, a filter chip or a search hit needs — and nothing else.
 *
 * The two heavy fields are deliberately absent. `ingredients` and
 * `instructions` are arrays of dozens of lines each; fetching them for all 159
 * recipes to render cards cost 229KB and ~900ms per query. What the board's
 * search actually needs from the ingredients is their *text*, so GROQ joins
 * them server-side into `ingredientText` and only that string travels.
 */
export interface SanityRecipeSummary {
  contentId: string;
  title: string;
  slug: string;
  slugHistory: string[];
  legacyIds: string[];
  legacyRouteIds: string[];
  sequenceId: number | null;
  instagramShortcode: string | null;
  sourceUrl: string | null;
  publishedDate: string | null;
  /** The ingredient lines joined into one string, for search only. */
  ingredientText: string;
  prepTimeMinutes: number | null;
  /** true = דורש תנור, false = ללא תנור, null = the recipe does not settle it.
   * Audited per recipe against its own ingredients and instructions; the few
   * that stayed null are open questions rather than guesses. */
  requiresOven: boolean | null;
  siteCategory: string | null;
  categorySlug: string | null;
  /** Sweet or savoury. Stored, not derived from the category — see
   * sanity/schemaTypes/taxonomy.ts RECIPE_TASTES. */
  taste: "sweet" | "savory" | null;
  foodType: string | null;
  difficulty: string | null;
  difficultySlug: string | null;
  series: string | null;
  seriesPosition: number | null;
  tags: string[];
  holidays: string[];
  images: SanityRecipeImage[];
  listed: boolean;
  status: string | null;
  /** True when the recipe is a series stand-in — no ingredients, no steps. */
  standIn: boolean;
}

/** A summary plus the fields only a detail page renders. */
export interface SanityRecipe extends SanityRecipeSummary {
  seoTitle: string | null;
  seoDescription: string | null;
  ingredients: string[];
  instructions: string[];
  notes: string | null;
  /** Sponsored-partnership or credit line. Rendered near the top of the page,
   * never inside the numbered steps. */
  disclosure: string | null;
}

/**
 * The card/filter/search projection. Joins the ingredient lines into one
 * string server-side instead of shipping the array, which is what makes a
 * board query small without taking ingredient search away.
 */
const RECIPE_SUMMARY_FIELDS = /* groq */ `{
  contentId,
  title,
  "slug": slug.current,
  "slugHistory": coalesce(slugHistory[].slug, []),
  "legacyIds": coalesce(legacyIds, []),
  "legacyRouteIds": coalesce(legacyRouteIds, []),
  sequenceId,
  instagramShortcode,
  sourceUrl,
  publishedDate,
  "ingredientText": array::join(coalesce(ingredients, []), " "),
  prepTimeMinutes,
  requiresOven,
  siteCategory,
  categorySlug,
  taste,
  foodType,
  difficulty,
  difficultySlug,
  series,
  seriesPosition,
  "tags": coalesce(tags, []),
  "holidays": coalesce(holidays, []),
  "images": coalesce(legacyImages[]{path, role}, []),
  "listed": coalesce(listed, false),
  status,
  // A series stand-in has neither ingredients nor instructions. Computed here
  // so a card can tell without the arrays travelling.
  "standIn": count(coalesce(ingredients, [])) == 0 && count(coalesce(instructions, [])) == 0
}`;

/** The summary plus the fields only a detail page renders. */
const RECIPE_FIELDS = /* groq */ `{
  ...${RECIPE_SUMMARY_FIELDS},
  seoTitle,
  seoDescription,
  "ingredients": coalesce(ingredients, []),
  "instructions": coalesce(instructions, []),
  notes,
  disclosure
}`;

/**
 * Every Sanity read goes through here.
 *
 * Caching is deliberately left at the Next.js default so these pages stay
 * statically generated. Freshness is handled at the build level instead: the
 * `prebuild` step clears .next/cache/fetch-cache, so each build re-reads
 * Sanity rather than reusing GROQ responses cached by a previous build.
 *
 * That combination matters. Marking the reads uncached (revalidate: 0) does
 * make them fresh, but it also opts /recipes and every /recipes/[slug] out of
 * static generation and into per-request rendering — verified, not assumed.
 * Clearing the build cache gets the freshness without that cost.
 */
async function fetchRecipes(filter: string, params: Record<string, unknown> = {}): Promise<SanityRecipe[]> {
  return getSanityClient().fetch<SanityRecipe[]>(`*[_type == "recipe" && ${filter}] ${RECIPE_FIELDS}`, params);
}

/** The card/filter/search read. Same filters, a fraction of the payload. */
async function fetchRecipeSummaries(filter: string, params: Record<string, unknown> = {}): Promise<SanityRecipeSummary[]> {
  return getSanityClient().fetch<SanityRecipeSummary[]>(`*[_type == "recipe" && ${filter}] ${RECIPE_SUMMARY_FIELDS}`, params);
}

/** Newest first, by the DD/MM/YYYY publishedDate. Anything unparseable (the
 * hand-authored series stand-in has no date) sorts to the end, exactly as the
 * previous implementation did. */
export function sortByPublishedDateDesc<T extends { publishedDate: string | null }>(recipes: T[]): T[] {
  return [...recipes].sort((a, b) => (parseIsraeliDate(b.publishedDate) || 0) - (parseIsraeliDate(a.publishedDate) || 0));
}

/* ------------------------------------------------------------- accessors */

/** Every recipe document, listed or not. */
export async function getAllRecipes(): Promise<SanityRecipeSummary[]> {
  return sortByPublishedDateDesc(await fetchRecipeSummaries("true"));
}

/**
 * The recipes shown publicly.
 *
 * `listed` is the flag the migration carried over from the previous
 * implementation's "is this a duplicate of another post?" rule. Review status
 * is deliberately NOT part of this filter: the hand-authored biscuit-series
 * stand-in carries status NEEDS_REVIEW because it has no catalog record, yet
 * the site has always shown it. Filtering on status here would silently drop
 * it from the board.
 */
export async function getListedRecipes(): Promise<SanityRecipeSummary[]> {
  return sortByPublishedDateDesc(await fetchRecipeSummaries("listed == true"));
}

export async function getRecipeByCanonicalSlug(slug: string): Promise<SanityRecipe | null> {
  const [recipe] = await fetchRecipes("slug.current == $slug", { slug });
  return recipe ?? null;
}

export async function getAllRecipeSlugs(): Promise<string[]> {
  return getSanityClient().fetch<string[]>(`*[_type == "recipe" && defined(slug.current)].slug.current`);
}

export async function getRecipesByCategory(categorySlug: string): Promise<SanityRecipeSummary[]> {
  return sortByPublishedDateDesc(await fetchRecipeSummaries("listed == true && categorySlug == $categorySlug", { categorySlug }));
}

/** For the planned חגים section. No UI consumes it yet; it exists so the
 * holiday metadata already carried on every recipe is reachable. */
export async function getRecipesByHoliday(holiday: string): Promise<SanityRecipeSummary[]> {
  return sortByPublishedDateDesc(await fetchRecipeSummaries("listed == true && $holiday in holidays", { holiday }));
}

/**
 * "You might also like" for a recipe detail page.
 *
 * Same series first when the recipe belongs to one, then the same category,
 * then the newest recipes overall — so a reader always gets somewhere to go
 * next rather than a dead end, even in a category with only one entry.
 *
 * Photographed recipes are preferred at every level: most of the catalogue has
 * no image yet, and a strip of blank placeholder cards is not an invitation.
 */
export async function getRelatedRecipes(recipe: SanityRecipe, count: number): Promise<SanityRecipeSummary[]> {
  const picked = new Map<string, SanityRecipeSummary>();
  const take = (rows: SanityRecipeSummary[]) => {
    for (const row of rows) {
      if (picked.size >= count) return;
      if (row.contentId === recipe.contentId) continue;
      if (!picked.has(row.contentId)) picked.set(row.contentId, row);
    }
  };

  if (recipe.series) {
    take(await getRelatedSeriesRecipes(recipe.series, recipe.contentId, count));
  }
  if (picked.size < count && recipe.categorySlug) {
    const sameCategory = await fetchRecipeSummaries("listed == true && categorySlug == $categorySlug && count(legacyImages) > 0", {
      categorySlug: recipe.categorySlug,
    });
    take(sortByPublishedDateDesc(sameCategory));
  }
  if (picked.size < count) {
    take(sortByPublishedDateDesc(await fetchRecipeSummaries("listed == true && count(legacyImages) > 0", {})));
  }

  return [...picked.values()].slice(0, count);
}

/** Other recipes in the same editorial series that actually have a photo —
 * the "more from this series" strip on a series stand-in's page. */
export async function getRelatedSeriesRecipes(series: string, excludeContentId: string, count: number): Promise<SanityRecipeSummary[]> {
  const recipes = await fetchRecipeSummaries("series == $series && contentId != $excludeContentId && count(legacyImages) > 0", {
    series,
    excludeContentId,
  });
  return recipes.sort((a, b) => (a.seriesPosition ?? 0) - (b.seriesPosition ?? 0)).slice(0, count);
}

/* ------------------------------------------------------ route resolution */

export type RecipeRouteResolution =
  | { kind: "canonical"; recipe: SanityRecipe }
  | { kind: "redirect"; slug: string; reason: "retired-slug" | "legacy-route-id" }
  | { kind: "not-found" };

/**
 * Resolves one /recipes/<segment> URL, in the order the ID architecture
 * promises:
 *
 *   1. the current canonical slug        -> render
 *   2. a slug retired into slugHistory   -> permanent redirect
 *   3. a pre-migration route id          -> permanent redirect
 *   4. otherwise                         -> 404
 *
 * Steps 2 and 3 are what keep every one of the site's previous recipe URLs
 * alive — the raw Instagram-caption ids, the `instagram-NN` ids and the
 * `biscuit-cake-NN` series pages — without any of them rendering a second,
 * duplicate copy of the page.
 */
/**
 * Wrapped in React's cache() because a recipe page resolves the same segment
 * twice — once in generateMetadata() and once in the page body. cache() is
 * per-request, so this shares the resolution within one render without
 * sharing anything between visitors, exactly as getSupabaseUser does.
 *
 * The alias branch reads three identity fields rather than a whole recipe: all
 * it produces is a slug to redirect to.
 */
export const resolveRecipeRoute = cache(async (segment: string): Promise<RecipeRouteResolution> => {
  const canonical = await getRecipeByCanonicalSlug(segment);
  if (canonical) return { kind: "canonical", recipe: canonical };

  const [alias] = await getSanityClient().fetch<{ slug: string; slugHistory: string[] }[]>(
    `*[_type == "recipe" && slug.current != $segment && ($segment in slugHistory[].slug || $segment in legacyRouteIds)]{
      "slug": slug.current,
      "slugHistory": coalesce(slugHistory[].slug, [])
    }`,
    { segment },
  );
  if (!alias) return { kind: "not-found" };

  return {
    kind: "redirect",
    slug: alias.slug,
    reason: alias.slugHistory.includes(segment) ? "retired-slug" : "legacy-route-id",
  };
});

/* ------------------------------------------------------- derived lookups */

/** The most recently published listed recipe with a photo in a given homepage
 * category, for the circular category thumbnails. */
export async function getLatestRecipeImageForCategory(
  categorySlug: string,
  cardImage: (recipe: SanityRecipeSummary) => string | null,
): Promise<{ image: string; title: string } | null> {
  const inCategory = await getRecipesByCategory(categorySlug);
  const latestWithImage = inCategory.find((recipe) => cardImage(recipe));
  if (!latestWithImage) return null;
  const image = cardImage(latestWithImage);
  return image ? { image, title: latestWithImage.title } : null;
}

/** The latest listed recipes with a photo, for the homepage highlights panel. */
export async function getHomeHighlightRecipes(
  cardImage: (recipe: SanityRecipeSummary) => string | null,
  count = 5,
): Promise<SanityRecipeSummary[]> {
  return (await getListedRecipes()).filter((recipe) => cardImage(recipe)).slice(0, count);
}
