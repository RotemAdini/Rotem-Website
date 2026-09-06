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

/** Source dates are DD/MM/YYYY. Anything unparseable sorts to the very end
 * (oldest) rather than breaking the newest-first order of everything else. */
export function parseIsraeliDate(value: string | undefined): number | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((value || "").trim());
  if (!match) return null;
  return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])).getTime();
}

export function sortByPublishedDateDesc(recipes: ReviewedRecipe[]): ReviewedRecipe[] {
  return [...recipes].sort((a, b) => (parseIsraeliDate(b.publishedDate) || 0) - (parseIsraeliDate(a.publishedDate) || 0));
}

/** Image paths in data/recipes.json are stored relative to the project root
 * (e.g. "images/biscuit-cakes/…", "recipes/thumbnails/…") — the same folders
 * this migration copied into /public. Next.js needs a leading "/" to treat
 * them as public URLs. */
export function toPublicPath(path: string | null | undefined): string | null {
  if (!path) return null;
  return path.startsWith("/") ? path : `/${path}`;
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

/** A source line that's really a sub-heading for the ingredients that
 * follow it (e.g. "לרוטב טחינה ביתי:", "מצרכים לקרמל") rather than an
 * ingredient in its own right. */
export function isIngredientHeading(line: string): boolean {
  const text = (line || "").trim();
  if (!text) return false;
  if (/\d/.test(text)) return false;
  // A colon is the clearest signal, but many imported Instagram recipes use
  // short labels such as "לרוטב" or "לקרם" without punctuation. Treat only
  // a concise, label-shaped line as a heading: an ingredient like
  // "לקישוט - פיסטוק גרוס" must remain a checkbox item.
  if (/[:﹕]$/.test(text) || /^מצרכים(\s|$)/.test(text)) return true;
  if (/[\-–—]/.test(text) || text.length > 46) return false;
  return /^(?:לרוטב|לבצק|לקרם|לציפוי|למילוי|למלית|לבסיס|לתחתית|לגנאש|לקישוט|לסירופ|לטחינה|למרינדה|לקצפת|לקפה|לתערובת|לפסטה|לפירורים)(?:\s+[\p{L}׳״"']+){0,4}$/u.test(text);
}

/** Source instructions are sometimes already numbered ("1.\t...") from the
 * original document, and the template also numbers each step — producing a
 * visible double number. Strip the prefix only when it matches this step's
 * own position. */
export function stripRedundantStepNumber(text: string, stepNumber: number): string {
  const match = /^\s*(\d+)[.)]\s*/.exec(text || "");
  if (match && Number(match[1]) === stepNumber) return text.slice(match[0].length);
  return text;
}

export type InstructionLineKind = "step" | "heading" | "nutrition" | "note";

/** Preserve every imported instruction line, but keep section labels,
 * nutritional values and closing notes out of the numbered cooking flow. */
export function getInstructionLineKind(line: string): InstructionLineKind {
  const text = (line || "").trim();
  if (/^(?:ערכים(?:\s+תזונתיים)?|קלוריות|חלבון|שומן|פחמימ)/.test(text) || /^\d+(?:[.,]\d+)?\s*(?:קלור|חלבון|שומן|פחמימ)/.test(text)) {
    return "nutrition";
  }
  if (/^(?:ובת?אבון|בתיאבון|שימו לב)/.test(text)) return "note";
  if (/^(?:(?:ל(?:רוטב|בצק|קרם|ציפוי|מילוי|מלית|גנאש|סלמון))|הבסיס|קרם|גנאש|מלית|בשר|פירה|דפי אורז|קינואה|הכנת הקרם|הכנת הגנאש)\s*[:\-]/.test(text)) {
    return "heading";
  }
  return "step";
}
