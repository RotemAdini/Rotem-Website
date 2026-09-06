import "server-only";
import type { FavoriteEntry } from "./types";
import { getReviewedRecipes, reviewedRecipeCardImage } from "./recipes";

/** The reviewed-recipes catalog is ~500KB and lib/recipes.ts reads it via
 * node:fs — kept server-only and computed into a small id→entry lookup
 * (rather than shipping the whole catalog to the client, unlike the
 * original site's client-side `fetch("data/recipes.json")`). Passed as a
 * prop into the client FavoritesGrid component. */
export function getRecipeFavoriteCatalog(): Record<string, FavoriteEntry> {
  const entries: Record<string, FavoriteEntry> = {};
  getReviewedRecipes().forEach((recipe) => {
    entries[`recipe-${recipe.id}`] = {
      type: "recipe",
      title: recipe.title,
      meta: recipe.siteCategory || recipe.foodType || "",
      href: `/recipes/${recipe.id}`,
      image: reviewedRecipeCardImage(recipe),
    };
  });
  return entries;
}
