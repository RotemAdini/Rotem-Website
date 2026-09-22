import "server-only";
import type { FavoriteEntry } from "./types";
import { getListedRecipes } from "./sanity/recipes";
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
 * Listed recipes only, matching getDateFavoriteCatalog(). This used to read
 * every recipe, on the reasoning that an unlisted one was still reachable at
 * its own URL so a favourite saved for it should keep showing. That reasoning
 * no longer holds: `listed` is now the publication gate, and an entry here
 * carries a title, a link and a photo — building one for an unlisted recipe
 * would publish exactly the content the flag exists to withhold.
 *
 * Nothing is lost by leaving it out. The Supabase row and the localStorage
 * token both survive untouched, so the item reappears in the grid if the
 * recipe is listed again.
 */
export async function getRecipeFavoriteCatalog(): Promise<Record<string, FavoriteEntry>> {
  const recipes = await getListedRecipes();
  return Object.assign({}, ...recipes.map(toFavoriteEntries)) as Record<string, FavoriteEntry>;
}
