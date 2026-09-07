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

export type DateBudget = "low" | "medium" | "high";
export type DatePlace = "home" | "outside";

/** The legacy hand-authored "date ideas A-B" editorial series. */
export interface DateSeriesItem {
  id: string;
  title: string;
  image: string | null;
  images?: string[];
  place?: DatePlace;
  budget?: DateBudget;
  plan?: DatePlan;
}

export type GameFilterKind = "all" | "competition" | "deep" | "fun" | "romance";

/** One card in the /games catalog. */
export interface GameCatalogItem {
  slug: "forest-game" | "race-game" | "memory-game" | "bundle";
  title: string;
  tagline: string;
  description: string;
  kind: GameFilterKind;
  price: number;
  kicker: string;
  image?: string;
  /** Decorative letter/icon shown instead of a photo, matching the original chip look. */
  icon?: string;
  themeClass: string;
}

export type FavoriteKind = "recipe" | "date" | "game" | "gift";

/** One entry resolvable from a favorited id (see lib/favorites.ts). */
export interface FavoriteEntry {
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
  metaLeft: string;
  metaRight: string;
  search: string;
  type: "sweet" | "savory";
  bake: "no-bake" | "regular";
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
  search: string;
}
