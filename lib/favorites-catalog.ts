import type { FavoriteEntry } from "./types";
import { dateSeriesAB } from "./date-series";

/**
 * The small, static part of the favorites lookup: date ideas, which still
 * render from lib/date-series.ts.
 *
 * Deliberately free of any Node-only dependency so the client-side
 * FavoritesGrid can import it directly. The recipe half — including every
 * `biscuit-cake-NN` token, which now resolves to a canonical Sanity recipe
 * rather than a legacy series page — is computed server-side instead. See
 * lib/recipe-favorites.ts.
 */
export function getStaticFavoriteCatalog(): Record<string, FavoriteEntry> {
  const entries: Record<string, FavoriteEntry> = {};
  dateSeriesAB.forEach((item) => {
    entries[`date-a-b-${item.id}`] = {
      type: "date",
      title: item.title,
      meta: `סדרת הא-ב · #${item.id}`,
      href: `/dates/${item.id}`,
      image: item.image,
    };
  });
  return entries;
}
