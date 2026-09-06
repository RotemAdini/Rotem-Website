import type { SearchResult } from "./types";
import { dateSeriesAB } from "./date-series";
import { gamesCatalog, gameHref } from "./games";
import { getListableRecipes, reviewedRecipeCardImage, sortByPublishedDateDesc } from "./recipes";

/** The full site-search index: date ideas, games and reviewed recipes.
 * Gifts have no real catalog yet (see lib/favorites-catalog.ts / the gifts
 * page), so gift results legitimately stay at zero, same as the original. */
export function getSearchIndex(): SearchResult[] {
  const dateResults: SearchResult[] = dateSeriesAB.map((item) => ({
    type: "date",
    typeLabel: "דייט",
    title: item.title,
    meta: "מסדרת הדייטים א׳-ב׳",
    href: `/dates/${item.id}`,
    image: item.image,
    search: item.title.toLowerCase(),
  }));

  const gameResults: SearchResult[] = gamesCatalog.map((game) => ({
    type: "game",
    typeLabel: "משחק",
    title: game.title,
    meta: `${game.kicker} · ${game.tagline}`,
    href: gameHref(game.slug),
    image: game.image,
    search: `${game.title} ${game.tagline}`.toLowerCase(),
  }));

  const recipeResults: SearchResult[] = sortByPublishedDateDesc(getListableRecipes()).map((recipe) => ({
    type: "recipe",
    typeLabel: "מתכון",
    title: recipe.title,
    meta: recipe.siteCategory || recipe.foodType || "מתכון",
    href: `/recipes/${recipe.id}`,
    image: reviewedRecipeCardImage(recipe),
    search: `${recipe.title} ${recipe.foodType || ""} ${(recipe.tags || []).join(" ")}`.toLowerCase(),
  }));

  return [...dateResults, ...gameResults, ...recipeResults];
}
