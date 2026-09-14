import "server-only";
import type { FavoriteEntry } from "./types";
import { getListedDateIdeas } from "./sanity/dates";
import { toDateFavoriteEntries } from "./sanity/date-adapters";

/**
 * The date half of the favourites lookup, computed on the server from Sanity
 * and merged with the recipe half before being passed into the client
 * FavoritesGrid.
 *
 * Every token an item answers to gets an entry, so a `date-a-b-NN` favourite
 * saved before the migration still resolves — and now links to the canonical
 * Hebrew slug rather than the old numeric URL.
 *
 * Listed ideas only. An entry carries a title, a link and a photo, so building
 * one for an unlisted idea would publish exactly the content `listed:false`
 * exists to withhold. Nothing is lost by leaving it out: the Supabase row and
 * the localStorage token both survive untouched, so the item reappears in the
 * grid if the idea is listed later.
 */
export async function getDateFavoriteCatalog(): Promise<Record<string, FavoriteEntry>> {
  const dates = await getListedDateIdeas();
  return Object.assign({}, ...dates.map(toDateFavoriteEntries)) as Record<string, FavoriteEntry>;
}
