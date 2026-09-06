import type { FavoriteEntry } from "./types";
import { biscuitCakeSeries } from "./biscuit-cake-series";
import { dateSeriesAB } from "./date-series";

/** The small, static part of the favorites lookup (legacy series items).
 * Deliberately kept free of any dependency on lib/recipes.ts (which reads
 * data/recipes.json off disk via node:fs) so it can be imported directly by
 * the client-side FavoritesGrid component without pulling a Node-only
 * module into the browser bundle. The reviewed-recipes half of the catalog
 * is computed server-side instead — see lib/recipe-favorites.ts. */
export function getStaticFavoriteCatalog(): Record<string, FavoriteEntry> {
  const entries: Record<string, FavoriteEntry> = {};
  biscuitCakeSeries.forEach((item) => {
    entries[`biscuit-cake-${item.id}`] = {
      type: "recipe",
      title: item.title,
      meta: `סדרת עוגות ביסקוויטים · #${item.id}`,
      href: `/recipes/biscuit-cake-${item.id}`,
      image: item.image,
    };
  });
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
