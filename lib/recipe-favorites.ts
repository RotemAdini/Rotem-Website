import "server-only";
import type { FavoriteEntry } from "./types";
import { getAllRecipes } from "./sanity/recipes";
import { toFavoriteEntries } from "./sanity/recipe-adapters";

/**
 * The recipe half of the favourites lookup, computed on the server from Sanity
 * and passed into the client FavoritesGrid as a small id -> entry map (rather
 * than shipping the whole catalog to the browser).
 *
 * Every token a recipe answers to gets an entry, not just its primary one. A
 * recipe that absorbed a legacy series card owns both `recipe-<old id>` and
 * `biscuit-cake-NN`, so a favourite saved under either one still resolves —
 * which is the whole point of keeping the legacy aliases in Sanity.
 *
 * `getAllRecipes()` rather than the listed ones: a recipe hidden from the
 * board is still reachable at its own URL, and a favourite saved for it must
 * not vanish from the list.
 */
export async function getRecipeFavoriteCatalog(): Promise<Record<string, FavoriteEntry>> {
  const recipes = await getAllRecipes();
  return Object.assign({}, ...recipes.map(toFavoriteEntries)) as Record<string, FavoriteEntry>;
}
