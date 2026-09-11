import "server-only";
import type { SearchResult } from "./types";
import { getListedGames } from "./sanity/games";
import { toGameSearchResult } from "./sanity/game-adapters";
import { getListedRecipes } from "./sanity/recipes";
import { getListedDateIdeas } from "./sanity/dates";
import { toDateSearchResult } from "./sanity/date-adapters";
import { toSearchResult } from "./sanity/recipe-adapters";

/** The full site-search index: date ideas, games and recipes.
 *
 * Recipes, date ideas and games all come from Sanity now. Gifts have no real catalog
 * yet (see lib/favorites-catalog.ts / the gifts page), so gift results
 * legitimately stay at zero, same as before. */
export async function getSearchIndex(): Promise<SearchResult[]> {
  const dateResults: SearchResult[] = (await getListedDateIdeas()).map(toDateSearchResult);

  const gameResults: SearchResult[] = (await getListedGames()).map(toGameSearchResult);

  const recipeResults: SearchResult[] = (await getListedRecipes()).map(toSearchResult);

  return [...dateResults, ...gameResults, ...recipeResults];
}
