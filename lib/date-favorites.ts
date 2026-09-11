import "server-only";
import type { FavoriteEntry } from "./types";
import { getAllDateIdeas } from "./sanity/dates";
import { toDateFavoriteEntries } from "./sanity/date-adapters";

/**
 * The date half of the favourites lookup, computed on the server from Sanity
 * and merged with the recipe half before being passed into the client
 * FavoritesGrid.
 *
 * Every token an item answers to gets an entry, so a `date-a-b-NN` favourite
 * saved before the migration still resolves — and now links to the canonical
 * Hebrew slug rather than the old numeric URL.
 */
export async function getDateFavoriteCatalog(): Promise<Record<string, FavoriteEntry>> {
  const dates = await getAllDateIdeas();
  return Object.assign({}, ...dates.map(toDateFavoriteEntries)) as Record<string, FavoriteEntry>;
}
