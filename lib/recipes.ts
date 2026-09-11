import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { Recipe, RecipesCatalog, ReviewedRecipe } from "./types";
import { BISCUIT_SERIES_TITLE_MATCH, biscuitSeriesFolderId } from "./biscuit-cake-series";

// Read (rather than statically `import`) the original data/recipes.json: the
// file was saved with a UTF-8 BOM, which Node/webpack's JSON module loader
// rejects as invalid JSON. Parsing it manually and stripping the BOM avoids
// having to touch the original data file at all.
function loadCatalog(): RecipesCatalog {
  const raw = fs.readFileSync(path.join(process.cwd(), "data/recipes.json"), "utf8");
  return JSON.parse(raw.replace(/^﻿/, "")) as RecipesCatalog;
}

const catalog = loadCatalog();

/** Maps the Excel "series" column to the same slug the legacy biscuit-cake
 * cards use, so the existing "סדרת עוגות ביסקוויטים" filter chip matches
 * these catalog records too. */
const RECIPE_SERIES_SLUGS: Record<string, string> = {
  "עוגות ביסקוויטים": "biscuit-cakes",
};

export function reviewedRecipeSeriesSlug(recipe: Recipe): string {
  return (recipe.series && RECIPE_SERIES_SLUGS[recipe.series]) || "";
}

/** A recipe is only shown publicly once it has been reviewed (COMPLETE),
 * numbered (sequenceId), and actually has ingredients + instructions —
 * mirrors the exact filter the original script.js applied before rendering
 * a catalog card. */
export function getReviewedRecipes(): ReviewedRecipe[] {
  return catalog.recipes.filter(
    (recipe): recipe is ReviewedRecipe =>
      Number.isInteger(recipe.sequenceId) &&
      recipe.status === "COMPLETE" &&
      !!recipe.ingredients?.length &&
      !!recipe.instructions?.length,
  );
}

/** A couple of catalog records are the same recipe posted to Instagram
 * twice; only the more complete one is ever listed — the other keeps its
 * data and URL, it just isn't shown a second time. */
export function getListableRecipes(): ReviewedRecipe[] {
  return getReviewedRecipes().filter((recipe) => !(recipe.issues || []).some((issue) => issue.startsWith("DUPLICATE_OF")));
}

// The pure text/date helpers this module used to define now live in
// lib/recipe-text.ts, so the Sanity data layer and the shared components can
// use them without pulling in this module's `server-only` marker and its
// synchronous read of data/recipes.json. They are re-exported unchanged, so
// every existing import of this module keeps working exactly as before.
export {
  parseIsraeliDate,
  isIngredientHeading,
  classifyIngredientLines,
  stripRedundantStepNumber,
  getInstructionLineKind,
  classifyInstructionLines,
  toPublicPath,
  type IngredientLineKind,
  type ClassifiedIngredientLine,
  type InstructionLineKind,
  type ClassifiedInstructionLine,
} from "./recipe-text";
// Also imported, not just re-exported, because the functions below call them.
import { parseIsraeliDate, toPublicPath } from "./recipe-text";

export function sortByPublishedDateDesc(recipes: ReviewedRecipe[]): ReviewedRecipe[] {
  return [...recipes].sort((a, b) => (parseIsraeliDate(b.publishedDate) || 0) - (parseIsraeliDate(a.publishedDate) || 0));
}

/** Cards use the small, web-optimized thumbnail first (falling back to the
 * original photo); the detail page prefers the original full-resolution
 * photo for its large hero image. */
export function reviewedRecipeCardImage(recipe: Recipe): string | null {
  return toPublicPath(recipe.images?.thumbnail || recipe.images?.main || recipe.images?.hero);
}
export function reviewedRecipeHeroImage(recipe: Recipe): string | null {
  return toPublicPath(recipe.images?.main || recipe.images?.hero || recipe.images?.thumbnail);
}
export function reviewedRecipeGalleryImages(recipe: Recipe): string[] {
  const hero = reviewedRecipeHeroImage(recipe);
  const gallery = (recipe.images?.gallery || []).map((path) => toPublicPath(path));
  return [hero, ...gallery].filter((src, index, all): src is string => Boolean(src) && all.indexOf(src) === index);
}

/** Legacy "biscuit cake series" ids already covered by a fuller reviewed
 * catalog record (matched by image folder, or by title for the couple of
 * items that don't have a photo yet) — used to avoid showing the same
 * recipe twice, once as a legacy stand-in and once as the real record. */
export function getCoveredBiscuitIds(recipes: ReviewedRecipe[]): Set<string> {
  return new Set(
    recipes
      .map(
        (recipe) =>
          biscuitSeriesFolderId(recipe.images?.thumbnail) ||
          biscuitSeriesFolderId(recipe.images?.main) ||
          biscuitSeriesFolderId(recipe.images?.hero) ||
          BISCUIT_SERIES_TITLE_MATCH[recipe.title],
      )
      .filter((id): id is string => Boolean(id)),
  );
}

export function getRecipeById(id: string): ReviewedRecipe | undefined {
  return getReviewedRecipes().find((recipe) => recipe.id === id);
}

/** All recipe ids that should get a statically generated /recipes/[id] page. */
export function getAllRecipeIds(): string[] {
  return getReviewedRecipes().map((recipe) => recipe.id);
}

/** The most recently published reviewed recipe (with a photo) in a given
 * homepage category, used for the circular category thumbnails. */
export function getLatestRecipeImageForCategory(categorySlug: string): { image: string; title: string } | null {
  const inCategory = sortByPublishedDateDesc(
    getListableRecipes().filter((recipe) => recipe.categorySlug === categorySlug),
  );
  const latestWithImage = inCategory.find((recipe) => reviewedRecipeCardImage(recipe));
  if (!latestWithImage) return null;
  const image = reviewedRecipeCardImage(latestWithImage);
  return image ? { image, title: latestWithImage.title } : null;
}

/** The latest reviewed recipes with a photo, for the homepage highlights panel. */
export function getHomeHighlightRecipes(count = 5): ReviewedRecipe[] {
  return sortByPublishedDateDesc(getListableRecipes().filter((recipe) => reviewedRecipeCardImage(recipe))).slice(0, count);
}
