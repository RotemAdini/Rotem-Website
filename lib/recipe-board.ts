import type { RecipeBoardCard } from "./types";
import { biscuitCakeSeries } from "./biscuit-cake-series";
import {
  getCoveredBiscuitIds,
  getListableRecipes,
  parseIsraeliDate,
  reviewedRecipeCardImage,
  reviewedRecipeSeriesSlug,
  sortByPublishedDateDesc,
} from "./recipes";

/** Builds the full recipes-board card list in the same composition the
 * original script.js produced: every reviewed catalog recipe (newest
 * first), then any legacy "biscuit cake series" stand-in that isn't already
 * covered by a fuller reviewed record, in their original 01–14 order. */
export function getRecipeBoardCards(): RecipeBoardCard[] {
  const reviewed = sortByPublishedDateDesc(getListableRecipes());
  const coveredBiscuitIds = getCoveredBiscuitIds(reviewed);

  const reviewedCards: RecipeBoardCard[] = reviewed.map((recipe) => ({
    key: `recipe-${recipe.id}`,
    href: `/recipes/${recipe.id}`,
    title: recipe.title,
    image: reviewedRecipeCardImage(recipe),
    favoriteId: `recipe-${recipe.id}`,
    metaLeft: recipe.siteCategory || recipe.foodType || "",
    metaRight: recipe.prepTimeMinutes ? `${recipe.prepTimeMinutes} דק׳` : "",
    search: `${recipe.title} ${recipe.foodType || ""}`,
    type: recipe.siteCategory === "עוגות וקינוחים" ? "sweet" : "savory",
    bake: "regular",
    difficulty: recipe.difficultySlug || "all",
    category: recipe.categorySlug || "all",
    time: recipe.prepTimeMinutes || 0,
    series: reviewedRecipeSeriesSlug(recipe),
    tags: recipe.tags ?? [],
    sortWeight: parseIsraeliDate(recipe.publishedDate) || 0,
  }));

  const legacyCards: RecipeBoardCard[] = biscuitCakeSeries
    .filter((item) => !coveredBiscuitIds.has(item.id))
    .map((item) => ({
      key: `biscuit-cake-${item.id}`,
      href: `/recipes/biscuit-cake-${item.id}`,
      title: item.title,
      image: item.image,
      favoriteId: `biscuit-cake-${item.id}`,
      metaLeft: `פרק ${parseInt(item.id, 10)} בסדרת עוגות הביסקוויטים`,
      metaRight: "עוגות",
      search: `${item.title} עוגת ביסקוויטים`,
      type: "sweet",
      bake: "no-bake",
      difficulty: "easy",
      category: "cakes",
      time: 30,
      series: "biscuit-cakes",
      tags: [],
      sortWeight: -1, // sinks below every dated reviewed recipe, in original 01-14 order
    }));

  return [...reviewedCards, ...legacyCards];
}

/** Tag filter chips are only ever populated from tags that actually occur
 * in the reviewed catalog (never invented) — legacy stand-ins carry no tags. */
export function getRecipeTagOptions(cards: RecipeBoardCard[]): string[] {
  return [...new Set(cards.flatMap((card) => card.tags))];
}
