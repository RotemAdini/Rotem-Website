// Shared TypeScript types for the site's content: recipes (from the reviewed
// Excel-import catalog), the two hand-authored "editorial series" (biscuit
// cakes, date series A-B), and the games catalog. These mirror the exact
// shapes already used by the original static site's data/recipes.json and
// script.js, so migrating to Next.js doesn't change any content or field
// names — only how it's loaded and rendered.

/** A recipe's image set. Any field can be missing until reviewed. */
export interface RecipeImages {
  thumbnail: string | null;
  main: string | null;
  hero: string | null;
  /** Extra gallery photos beyond the hero image, when more than one exists. */
  gallery?: string[];
  new?: string[];
}

export interface RecipeImageMatch {
  confidence: "NONE" | "LOW" | "MEDIUM" | "HIGH" | string;
  method: string | null;
  imageKey: string | null;
}

export interface RecipeSourceFile {
  path: string;
  type: string;
  row?: number;
}

export type RecipeStatus = "COMPLETE" | "NEEDS_REVIEW";

/** One row of the reviewed recipe catalog (data/recipes.json). */
export interface Recipe {
  id: string;
  slug: string;
  title: string;
  sourceUrl: string;
  ingredients: string[];
  instructions: string[];
  images: RecipeImages;
  imageMatch: RecipeImageMatch;
  sourceFiles: RecipeSourceFile[];
  status: RecipeStatus;
  issues: string[];
  /** Only present once a recipe has been reviewed and numbered. */
  sequenceId?: number;
  publishedDate?: string; // DD/MM/YYYY, as supplied in the source spreadsheet
  contentCategory?: string;
  foodType?: string;
  siteCategory?: string;
  categorySlug?: string;
  difficulty?: string;
  difficultySlug?: string;
  prepTimeMinutes?: number;
  ingredientsText?: string;
  instructionsText?: string;
  notes?: string;
  series?: string;
  tags?: string[];
}

export interface RecipesCatalog {
  generatedAt: string;
  sourceRoot: string;
  recipes: Recipe[];
  unmatchedImages?: unknown;
}

/** A recipe that has passed the same "is it ready to show publicly" checks
 * the original site's script.js applied before rendering a catalog card. */
export interface ReviewedRecipe extends Recipe {
  sequenceId: number;
  status: "COMPLETE";
}

/** The legacy hand-authored "biscuit cake" editorial series. */
export interface BiscuitCakeSeriesItem {
  id: string;
  title: string;
  image: string | null;
  images?: string[];
}

/** Cost / time / effort breakdown shown on a date-series detail page. */
export interface DatePlan {
  cost?: string;
  duration?: string;
  effort?: number;
  needed?: string[];
  prepAhead?: string[];
  whatYouDo?: string;
  note?: string;
}

/** Estimated total spend for the couple. "unknown" = the date's stated cost
 * straddles two ranges or depends on what the couple chooses, so the card
 * matches no budget chip rather than being guessed into one. */
export type DateBudget = "free" | "upto100" | "100to250" | "250plus" | "unknown";
/** The subjective vocabulary the frozen hand-authored series still carries.
 * Deliberately not mapped onto DateBudget: "low" meant anything from 0 ₪ to
 * 150 ₪ depending on the card, so converting it would invent precision. */
export type LegacyDateBudget = "low" | "medium" | "high";
export type DatePlace = "home" | "outside";

/** The legacy hand-authored "date ideas A-B" editorial series. */
export interface DateSeriesItem {
  id: string;
  title: string;
  image: string | null;
  images?: string[];
  place?: DatePlace;
  budget?: LegacyDateBudget;
  plan?: DatePlan;
}

export type GameFilterKind = "all" | "competition" | "deep" | "fun" | "romance";

/** One card in the /games catalog. */
export interface GameCatalogItem {
  /** Product route segment. Widened from the original four-value union so a
   * Sanity-sourced product satisfies this type; the routes themselves are
   * unchanged. */
  slug: string;
  title: string;
  tagline: string;
  description: string;
  kind: GameFilterKind;
  price: number | null;
  kicker: string;
  image?: string;
  /** Decorative letter/icon shown instead of a photo, matching the original chip look. */
  icon?: string;
  themeClass: string;
  /** Catalog button label. Optional so the frozen reference in lib/games.ts
   * still satisfies this type unchanged. */
  ctaLabel?: string;
}

export type FavoriteKind = "recipe" | "date" | "game" | "gift";

/** One entry resolvable from a favorited id (see lib/favorites.ts). */
export interface FavoriteEntry {
  /** Canonical identity of the item this token resolves to. Several legacy
   * tokens can share one — that is how a merged recipe renders as a single
   * card instead of one card per saved token. Absent for content that has
   * not been migrated to a canonical id yet. */
  contentId?: string;
  type: FavoriteKind;
  title: string;
  meta: string;
  href: string;
  image?: string | null;
}

/** One renderable card on the recipes board — either a reviewed catalog
 * recipe or a legacy "biscuit cake series" stand-in, normalized to the same
 * shape so the board can filter/sort/render them uniformly. */
export interface RecipeBoardCard {
  key: string;
  href: string;
  title: string;
  image: string | null;
  favoriteId: string;
  /** Every legacy token this recipe answers to, so the heart also lights up
   * for a favourite that was saved under an absorbed record's token.
   * Optional so the frozen JSON-backed reference in lib/recipe-board.ts, which
   * predates merged recipes, still satisfies this type unchanged. */
  favoriteAliases?: string[];
  metaLeft: string;
  metaRight: string;
  search: string;
  /** Ingredients, category, series and tags. The board's text search reads this
   * through the shared ranking engine in lib/search-rank.ts, so /recipes and
   * /search answer an ingredient query the same way. */
  keywords?: string;
  type: "sweet" | "savory";
  /** From the recipe's own requiresOven field. "unknown" = the recipe does not
   * settle it, and such a card matches neither oven chip. */
  bake: "no-oven" | "oven" | "unknown";
  difficulty: string;
  category: string;
  time: number;
  series: string;
  tags: string[];
  sortWeight: number;
}

/** One renderable card on the dates board. */
export interface DateBoardCard {
  key: string;
  href: string;
  title: string;
  image: string | null;
  favoriteId: string;
  /** Every legacy token this item answers to. Optional so the frozen
   * JSON-backed reference in lib/date-board.ts still satisfies this type. */
  favoriteAliases?: string[];
  tag: string;
  description: string;
  footerLabel: string;
  search: string;
  budget: DateBudget;
  place: DatePlace;
  duration: "short" | "medium" | "long";
  series: string;
}

export type SearchResultType = "recipe" | "date" | "game" | "gift";

export interface SearchResult {
  type: SearchResultType;
  typeLabel: string;
  title: string;
  meta: string;
  href: string;
  image?: string | null;
  /** Lowercased title + meta + keywords, kept for any caller that still does a
   * plain substring test. Ranking uses the individual fields instead. */
  search: string;
  /** Secondary matchable text — a recipe's ingredients and tags, a game's
   * tagline. Matched at a lower weight than the title so "טחינה" finds the
   * recipes that use it without outranking a recipe named after it. */
  keywords?: string;
}
