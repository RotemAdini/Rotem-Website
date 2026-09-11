import type { SanityRecipeSummary } from "./recipes";
import type { FavoriteEntry, RecipeBoardCard, SearchResult } from "@/lib/types";
import { parseIsraeliDate, toPublicPath } from "@/lib/recipe-text";

/**
 * Pure mappings from a Sanity recipe to the shapes the existing UI already
 * renders. Kept free of any Sanity or Node dependency so the presentation
 * rules stay readable and testable on their own.
 *
 * The reference for every rule here is lib/recipe-board.ts,
 * lib/recipe-favorites.ts and lib/search-index.ts, which are still on disk
 * unchanged. The goal is not "something reasonable" — it is the same card,
 * the same order and the same favourite token as before the switch.
 */

/** Maps the catalog's Hebrew series name to the slug the board's series chip
 * filters on. */
const SERIES_SLUGS: Record<string, string> = {
  "עוגות ביסקוויטים": "biscuit-cakes",
};

export function recipeSeriesSlug(recipe: SanityRecipeSummary): string {
  return (recipe.series && SERIES_SLUGS[recipe.series]) || "";
}

/* --------------------------------------------------------------- images */

function pathForRole(recipe: SanityRecipeSummary, role: string): string | null {
  return recipe.images.find((image) => image.role === role)?.path ?? null;
}

/**
 * Cards use the small, web-optimized thumbnail first, falling back to the
 * full-size photo.
 *
 * The import stored `main` and `hero` as one entry because they were the same
 * file in every record, so "main" here covers both.
 */
export function recipeCardImage(recipe: SanityRecipeSummary): string | null {
  return toPublicPath(pathForRole(recipe, "thumbnail") || pathForRole(recipe, "main"));
}

/** Detail pages prefer the original full-resolution photo for the large hero. */
export function recipeHeroImage(recipe: SanityRecipeSummary): string | null {
  return toPublicPath(pathForRole(recipe, "main") || pathForRole(recipe, "thumbnail"));
}

/**
 * The detail page's click-to-swap gallery: the hero photo followed by every
 * additional gallery photo, in stored order.
 *
 * Two roles are deliberately excluded. `thumbnail` is the same picture as
 * `main` at a smaller size, so showing it would repeat the hero; `new` is an
 * unpublished original that the previous implementation never rendered
 * either. Every genuinely different gallery photo is preserved, in order —
 * a recipe may legitimately have several, and collapsing them would lose
 * content.
 */
export function recipeGalleryImages(recipe: SanityRecipeSummary): string[] {
  const hero = recipeHeroImage(recipe);
  const gallery = recipe.images.filter((image) => image.role === "gallery").map((image) => toPublicPath(image.path));
  return [hero, ...gallery].filter((src, index, all): src is string => Boolean(src) && all.indexOf(src) === index);
}

/* ------------------------------------------------------------ behaviour */

/**
 * A hand-authored series stand-in: a recipe that exists only as a series card,
 * with no ingredients or instructions behind it.
 *
 * The previous implementation rendered these through a separate template and
 * gave their cards series-flavoured metadata, so the distinction has to
 * survive the switch or the board changes visibly.
 */
export function isSeriesStandIn(recipe: SanityRecipeSummary): boolean {
  return recipe.standIn;
}

/** The favourite token this recipe must answer to. `legacyIds[0]` is the exact
 * string the previous implementation wrote to localStorage — `recipe-<old id>`
 * for a catalog recipe, `biscuit-cake-NN` for a series stand-in — so saved
 * favourites keep working with no migration. */
export function recipeFavoriteId(recipe: SanityRecipeSummary): string {
  return recipe.legacyIds[0] ?? `recipe-${recipe.contentId}`;
}

export function recipeHref(recipe: SanityRecipeSummary): string {
  return `/recipes/${recipe.slug}`;
}

/* ---------------------------------------------------------- board cards */

export function toBoardCard(recipe: SanityRecipeSummary): RecipeBoardCard {
  const standIn = isSeriesStandIn(recipe);
  const position = recipe.seriesPosition;

  return {
    key: recipe.contentId,
    href: recipeHref(recipe),
    title: recipe.title,
    image: recipeCardImage(recipe),
    favoriteId: recipeFavoriteId(recipe),
    favoriteAliases: recipe.legacyIds,
    // A stand-in card has always shown its place in the series instead of a
    // category and a prep time, because it has neither behind it.
    metaLeft: standIn && position ? `פרק ${position} בסדרת עוגות הביסקוויטים` : recipe.siteCategory || recipe.foodType || "",
    metaRight: standIn ? "עוגות" : recipe.prepTimeMinutes ? `${recipe.prepTimeMinutes} דק׳` : "",
    search: standIn ? `${recipe.title} עוגת ביסקוויטים` : `${recipe.title} ${recipe.foodType || ""}`,
    // Same builder the global index uses, so /recipes and /search answer a
    // query about an ingredient identically.
    keywords: standIn ? "עוגת ביסקוויטים" : recipeKeywords(recipe),
    // Read from the recipe's own field. This used to be inferred from
    // `siteCategory === "עוגות וקינוחים"`, which classified every cookie,
    // pancake, sweet bread and iced coffee as savoury. A recipe whose taste
    // has not been set falls back to savoury so the chips still behave, but
    // the backfill gave all 159 an explicit value.
    type: recipe.taste === "sweet" ? "sweet" : "savory",
    // Read straight from the recipe's own audited field. A recipe whose
    // requiresOven is still undecided is "unknown" and deliberately matches
    // neither chip, rather than being guessed into one.
    bake: recipe.requiresOven === true ? "oven" : recipe.requiresOven === false ? "no-oven" : "unknown",
    difficulty: recipe.difficultySlug || "all",
    category: recipe.categorySlug || "all",
    time: recipe.prepTimeMinutes || 0,
    series: recipeSeriesSlug(recipe),
    tags: recipe.tags,
    // Stand-ins carry no publish date, and have always sorted below every
    // dated recipe rather than to the top.
    sortWeight: standIn ? -1 : parseIsraeliDate(recipe.publishedDate) || 0,
  };
}

/** Tag chips are only ever populated from tags that actually occur, never invented. */
export function boardTagOptions(cards: RecipeBoardCard[]): string[] {
  return [...new Set(cards.flatMap((card) => card.tags))];
}

/* ------------------------------------------------------------ favorites */

/**
 * id -> entry for every favourite token any recipe answers to.
 *
 * A recipe can own several tokens: a catalog recipe that absorbed a legacy
 * series card owns both `recipe-<old id>` and `biscuit-cake-NN`, and both must
 * resolve to the one canonical recipe. That many-to-one mapping is why nobody
 * loses a saved favourite when two records were merged.
 */
export function toFavoriteEntries(recipe: SanityRecipeSummary): Record<string, FavoriteEntry> {
  const entries: Record<string, FavoriteEntry> = {};
  for (const token of new Set([recipeFavoriteId(recipe), ...recipe.legacyIds])) {
    const seriesPosition = /^biscuit-cake-(\d+)$/.exec(token)?.[1];
    entries[token] = {
      contentId: recipe.contentId,
      type: "recipe",
      title: recipe.title,
      // Tokens saved from a series card have always been labelled with the
      // series and episode; keeping that means the favourites list looks the
      // same as it did before the switch.
      meta: seriesPosition ? `סדרת עוגות ביסקוויטים · #${seriesPosition}` : recipe.siteCategory || recipe.foodType || "",
      href: recipeHref(recipe),
      image: recipeCardImage(recipe),
    };
  }
  return entries;
}

/* --------------------------------------------------------------- search */

/**
 * The secondary matchable text for a recipe — ingredients, tags, holidays,
 * series and the traits readers phrase as words.
 *
 * Shared by the global search index and the recipes board so the two cannot
 * drift into answering the same query differently. Quantities are stripped:
 * nobody searches "250 גרם", and the digits only add noise.
 */
export function recipeKeywords(recipe: SanityRecipeSummary): string {
  // Reads the server-joined string rather than the array: GROQ now joins the
  // ingredient lines so a board or search query never carries the array at all.
  const ingredients = (recipe.ingredientText || "").replace(/[\d.,/]+/g, " ");
  const traits = [
    // Both phrasings stay searchable: the chips now read ללא תנור, but readers
    // have always searched "ללא אפייה" and that query has to keep working.
    recipe.requiresOven === false ? "ללא תנור ללא אפייה" : "",
    recipe.difficulty === "קל" ? "קל ומהיר" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `${recipe.foodType || ""} ${recipe.siteCategory || ""} ${recipe.series || ""} ${recipe.tags.join(" ")} ${recipe.holidays.join(" ")} ${traits} ${ingredients}`
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function toSearchResult(recipe: SanityRecipeSummary): SearchResult {
  const meta = recipe.siteCategory || recipe.foodType || "מתכון";
  const keywords = recipeKeywords(recipe);

  return {
    type: "recipe",
    typeLabel: "מתכון",
    title: recipe.title,
    meta,
    href: recipeHref(recipe),
    image: recipeCardImage(recipe),
    search: `${recipe.title} ${meta} ${keywords}`.toLowerCase(),
    keywords,
  };
}
