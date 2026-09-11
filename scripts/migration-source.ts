/**
 * Reads the site's CURRENT content sources and normalizes them into the shape
 * the migration manifest and the Sanity importer both consume.
 *
 * This module deliberately re-states the "is a recipe reviewed/routable?"
 * filter rather than importing lib/recipes.ts, because that module is marked
 * `server-only` and throws when imported outside a React Server Component.
 * The filter below is character-for-character the same predicate — see
 * getReviewedRecipes() in lib/recipes.ts — and buildManifest() asserts the
 * resulting count against the number of /recipes/[id] pages the site builds,
 * so the two can never drift apart silently.
 *
 * Nothing here writes to disk or mutates any existing data file.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  biscuitCakeSeries,
  BISCUIT_SERIES_TITLE_MATCH,
  biscuitSeriesFolderId,
} from "../lib/biscuit-cake-series.ts";
import { dateSeriesAB } from "../lib/date-series.ts";
import { gamesCatalog } from "../lib/games.ts";
import type { BiscuitCakeSeriesItem, DateSeriesItem, GameCatalogItem, Recipe } from "../lib/types.ts";

export const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export type ContentType = "recipe" | "dateIdea" | "game";

/** data/recipes.json is stored with a UTF-8 BOM; strip it exactly as lib/recipes.ts does. */
export function loadRecipeCatalog(): { generatedAt: string; recipes: Recipe[] } {
  const raw = fs.readFileSync(path.join(PROJECT_ROOT, "data/recipes.json"), "utf8");
  return JSON.parse(raw.replace(/^﻿/, "")) as { generatedAt: string; recipes: Recipe[] };
}

/** Same predicate as lib/recipes.ts getReviewedRecipes(): these are exactly the
 * recipes that currently get a statically generated /recipes/[id] route. */
export function getReviewedRecipes(recipes: Recipe[]): Recipe[] {
  return recipes.filter(
    (recipe) =>
      Number.isInteger(recipe.sequenceId) &&
      recipe.status === "COMPLETE" &&
      !!recipe.ingredients?.length &&
      !!recipe.instructions?.length,
  );
}

/** Same predicate as lib/recipes.ts getListableRecipes(): reviewed recipes that
 * are additionally shown on the /recipes board (duplicates stay routable but
 * unlisted). Preserved so the Sanity documents can reproduce it exactly. */
export function isListable(recipe: Recipe): boolean {
  return !(recipe.issues || []).some((issue) => issue.startsWith("DUPLICATE_OF"));
}

/** The Instagram shortcode is the one immutable natural key the recipe data
 * already carries: unique across all 160 reviewed recipes, assigned by
 * Instagram, and never editable by us. */
export function instagramShortcode(sourceUrl: string | undefined): string | null {
  const match = /instagram\.com\/(?:[^/]+\/)?(?:reel|reels|p|tv)\/([^/?#]+)/i.exec(sourceUrl || "");
  return match ? match[1] : null;
}

/** The English image-folder slug a recipe's photos already live under, e.g.
 * "images/recipes/sweet/honey-butter-toast/IMG_5881-web.JPEG" -> "honey-butter-toast".
 * Only 34 of the 160 reviewed recipes have their photos wired up, so this is
 * null for the rest — it is recorded, never guessed. */
export function recipeImageFolderSlug(recipe: Recipe): string | null {
  const candidates = [recipe.images?.thumbnail, recipe.images?.main, recipe.images?.hero, ...(recipe.images?.gallery || [])];
  for (const candidate of candidates) {
    const match = /images\/recipes\/[^/]+\/([^/]+)\//.exec(candidate || "");
    if (match) return match[1];
  }
  return null;
}

/**
 * Canonical form for an image path: root-relative, no leading slash.
 *
 * The two current sources disagree — data/recipes.json stores
 * "images/biscuit-cakes/01-pistachio/IMG_5024-web.PNG" while
 * lib/biscuit-cake-series.ts stores the public-URL form with a leading slash.
 * They are the same file, and lib/recipes.ts toPublicPath() adds the slash back
 * at render time. Normalizing here is what lets a merged document hold one
 * entry per real photo instead of two.
 */
export function normalizeImagePath(value: string): string {
  return value.replace(/^\/+/, "");
}

/** Every distinct image path a recipe currently references, in display order. */
export function recipeImagePaths(recipe: Recipe): string[] {
  const paths = [
    recipe.images?.thumbnail,
    recipe.images?.main,
    recipe.images?.hero,
    ...(recipe.images?.gallery || []),
    ...(recipe.images?.new || []),
  ];
  return [...new Set(paths.filter((value): value is string => Boolean(value)).map(normalizeImagePath))];
}

/**
 * Corrections to the source data that only a person can make, applied in the
 * migration layer so that data/recipes.json, lib/*.ts, public/ and images/ are
 * never edited by this process.
 *
 * Each entry records who decided it and why, so a reader a year from now can
 * tell a reviewed decision apart from an inference. Nothing may be added here
 * that was not explicitly decided by Rotem.
 */
export interface CatalogCorrection {
  /** The reviewed-catalog row this correction applies to. */
  sequenceId: number;
  /** Replaces the catalog title. The original is preserved as an alternate. */
  canonicalTitle?: string;
  /** Treat this catalog record and that legacy biscuit-series item as one
   * recipe, with the CATALOG record surviving. */
  mergeWithBiscuitId?: string;
  /**
   * Treat this catalog record and that legacy biscuit-series item as one
   * recipe, with the SERIES item surviving — the opposite direction to
   * mergeWithBiscuitId. Used when the series item is the one that already
   * carries the canonical, editorially-authored content.
   */
  absorbIntoBiscuitId?: string;
  /**
   * The surviving document's ingredients/instructions were written in the
   * Studio and intentionally no longer match data/recipes.json. The verifier
   * reports these rather than failing on the difference.
   */
  contentAuthoredInSanity?: boolean;
  decidedBy: string;
  note: string;
}

export const CATALOG_CORRECTIONS: CatalogCorrection[] = [
  {
    sequenceId: 190,
    canonicalTitle: "עוגת ביסקוויטים פקאן סיני",
    mergeWithBiscuitId: "12",
    decidedBy: "Rotem, 8 September 2026",
    note:
      'Catalog row 190 ("עוגת ביסקוויטים פקאן מסוכר") and legacy biscuit-series item 12 ' +
      '("עוגת ביסקוויטים פקאן סיני") are the same cake. The series title is canonical, the cake is ' +
      "episode 12, and the two must be one Recipe. The manifest builder had flagged the position as " +
      "unresolved rather than guessing at it; this is the answer.",
  },
  {
    sequenceId: 171,
    absorbIntoBiscuitId: "07",
    canonicalTitle: "עוגת פירמידה לפסח",
    contentAuthoredInSanity: true,
    decidedBy: "Rotem, 8 September 2026",
    note:
      'Catalog row 171 ("עוגת פירמידה") and legacy biscuit-series item 07 are the same pyramid cake — there is ' +
      "only one. The series item survives, because it carries the canonical title and the ingredients and " +
      "instructions Rotem wrote in the Studio; row 171 is absorbed and contributes its verified source metadata " +
      "(Instagram URL and shortcode, sequenceId, publish date, prep time, difficulty, food type) plus its route " +
      "and favourite token as aliases. Its own title is kept in alternateTitles.",
  },
];

export function getCatalogCorrection(sequenceId: number | undefined): CatalogCorrection | undefined {
  return CATALOG_CORRECTIONS.find((correction) => correction.sequenceId === sequenceId);
}

/** The correction, if any, that folds a catalog row into this series item. */
export function getBiscuitAbsorption(biscuitId: string): CatalogCorrection | undefined {
  return CATALOG_CORRECTIONS.find((correction) => correction.absorbIntoBiscuitId === biscuitId);
}

/** Catalog rows that are absorbed into a series item and therefore get no
 * canonical entry of their own. */
export function isAbsorbedIntoBiscuit(sequenceId: number | undefined): boolean {
  return CATALOG_CORRECTIONS.some(
    (correction) => correction.sequenceId === sequenceId && Boolean(correction.absorbIntoBiscuitId),
  );
}

/** The title a recipe should be published under: a recorded correction if one
 * exists, otherwise the catalog title unchanged. */
export function canonicalTitle(recipe: Recipe): string {
  return getCatalogCorrection(recipe.sequenceId)?.canonicalTitle || recipe.title;
}

/* --------------------------------------------------------------- holidays */

/**
 * Holiday assignments carried over from the source material.
 *
 * `holidays` is a taxonomy of its own — separate from siteCategory, foodType
 * and series — and `data/recipes.json` has no field for it, so the values live
 * here, in the migration layer, exactly like CATALOG_CORRECTIONS above. The
 * site's own data files are still never edited by this process.
 *
 * The bar for an entry in this table is deliberately narrow, because a wrong
 * holiday is worse than a missing one: **the recipe's own Instagram caption
 * has to name the holiday and tie this recipe to it.** A dish that is merely
 * associated with a holiday (cheesecake, doughnuts, hamantaschen), a
 * holiday-specific custom mentioned without the holiday ("משלוח מנות",
 * "הדלקת נרות"), a bare "חג שמח" sign-off, and a publish date that happens to
 * fall near a festival are all *not* enough. Those cases are listed in
 * HOLIDAY_REVIEW_CANDIDATES below and imported with an empty `holidays`, for
 * Rotem to decide.
 *
 * The evidence quote is the exact caption fragment the assignment rests on, so
 * a later reader can re-check the call without going back to the CSVs.
 * Captions were read from data/source-materials/recipes/, matched to catalog
 * rows by Instagram shortcode — the CSV's own `sequence_id` column does NOT
 * line up with data/recipes.json's `sequenceId` and must not be used to join.
 */
export interface HolidayAssignment {
  /** The reviewed-catalog row this applies to. */
  sequenceId: number;
  /** Title at the time of writing, for readability only — sequenceId is the key. */
  title: string;
  /** Values from RECIPE_HOLIDAYS in sanity/schemaTypes/taxonomy.ts. */
  holidays: string[];
  /** The caption wording that names the holiday. */
  evidence: string;
}

export const HOLIDAY_ASSIGNMENTS: HolidayAssignment[] = [
  {
    sequenceId: 3,
    title: "כדורי שום",
    holidays: ["shavuot"],
    evidence: "…ושפשוט יהיה לכם מושלם לחג שבועות שמתקרב",
  },
  {
    sequenceId: 35,
    title: "בראוניז דבש",
    holidays: ["rosh-hashana"],
    evidence: "מתכון לבראוניז דבש שמושלם לערב ראש השנה!!!",
  },
  {
    sequenceId: 59,
    title: "לביבות תפוח אדמה אפויות",
    holidays: ["hanukkah"],
    evidence: "אני יודעת שבחנוכה עושים הרבה ארוחות משפחתיות אז הלביבות האלו יבואו בול",
  },
  {
    sequenceId: 93,
    title: "בלינצ׳ס במילוי גבינה",
    holidays: ["pesach"],
    evidence: "מתכון ראשון מתוך סדרת המתכונים שתעלה לכבוד פסח 🍷",
  },
  {
    sequenceId: 95,
    title: "עוגת קרמבו כשרה",
    holidays: ["pesach"],
    evidence: "עוגת קרמבו כשרה לפסח 😍 — מתכון שני מתוך סדרת המתכונים שתעלה לכבוד פסח",
  },
  {
    sequenceId: 96,
    title: "פאי רועים",
    holidays: ["pesach"],
    evidence: "פאי רועים קטלנייי לפסח!!!! — מתכון שלישי מתוך סדרת המתכונים שתעלה לכבוד פסח",
  },
  {
    sequenceId: 97,
    title: "בורקס מצה",
    holidays: ["pesach"],
    evidence: "מתכון לבורקס מצה ענקיייי מושלם לפסח!!!!! — מתכון רביעי מתוך סדרת המתכונים שתעלה לכבוד פסח",
  },
  {
    sequenceId: 98,
    title: "עוגיות בראוניז",
    holidays: ["pesach"],
    evidence: "עוגיות בראוניז מטורפות לפסח — מתכון חמישי מתוך סדרת המתכונים שתעלה לכבוד פסח",
  },
  {
    sequenceId: 99,
    title: "חיתוכיות קוקוס ושוקולד",
    holidays: ["pesach"],
    evidence: "חיתוכיות קוקוס ושוקולד קטלניות לפסח 😍 — מתכון שישי מתוך סדרת המתכונים שתעלה לכבוד פסח",
  },
  {
    sequenceId: 133,
    title: "סלמון עם ניוקי ועגבניות שרי ברוטב ירוק",
    holidays: ["shavuot"],
    evidence: "וכל זה בתבנית אחת – הכי חגיגי לשבועות! 🤍",
  },
  {
    sequenceId: 169,
    title: "עוגיות בראוניז עם מילוי שוקולד לבן",
    holidays: ["pesach"],
    evidence: "עוגיות בראוניז במילוי שוקולד לבן נדירות לפסח 😍",
  },
  {
    sequenceId: 171,
    title: "עוגת פירמידה",
    holidays: ["pesach"],
    evidence: "עוגת פירמידה לפסח … עוגת ביסקוויטים בצורת פירמידה מושלמת לפסח",
  },
];

/**
 * Recipes a keyword sweep surfaced that are NOT being assigned, and why.
 *
 * Recorded rather than silently dropped, so the judgement is reviewable and so
 * Rotem gets a worklist instead of having to re-find these. Every one of them
 * imports with an empty `holidays` and stays that way until she decides.
 *
 * `suggestion` is what the signal points at — a question for her, never a
 * value this migration writes.
 */
export interface HolidayReviewCandidate {
  sequenceId: number;
  title: string;
  suggestion: string | null;
  reason: string;
}

export const HOLIDAY_REVIEW_CANDIDATES: HolidayReviewCandidate[] = [
  {
    sequenceId: 55,
    title: "חלת שקדים",
    suggestion: null,
    reason:
      'Keyword false positive, listed so nobody re-adds it: the caption\'s "בשבועות האחרונים" means "in recent ' +
      'weeks", not the festival. Published 24/11/2023, nowhere near Shavuot. Must stay unassigned.',
  },
  {
    sequenceId: 83,
    title: "אוזני המן אמסטרדם",
    suggestion: "purim",
    reason:
      'Hamantaschen, and the caption says "אם תכינו לו אותם במשלוח מנות" — a Purim-only custom. The word פורים ' +
      "itself never appears, so this is one inferential step and needs Rotem's yes.",
  },
  {
    sequenceId: 90,
    title: "בצק אחד שיוצא ממנו מגוון של עוגיות",
    suggestion: "purim",
    reason:
      'Caption signs off "חג פורים שמח 😍" and notes "כן גם אוזני המן". But it is a general shortcrust dough that ' +
      "makes many cookies, and the Purim mention is a greeting plus one shape option — not the recipe being for " +
      "Purim. Rotem's call whether the חגים section should carry it.",
  },
  {
    sequenceId: 61,
    title: "סופגניות אשל",
    suggestion: "hanukkah",
    reason:
      'Doughnuts, and the caption remembers a grandmother making them "בכל שנה בהדלקת נרות". Candle-lighting is ' +
      "not exclusively Hanukkah in the wording, and חנוכה is never written.",
  },
  {
    sequenceId: 51,
    title: "סופגניות אפויות",
    suggestion: "hanukkah",
    reason: "Doughnuts, published 15/11/2023. The caption is entirely about baked-vs-fried and names no holiday.",
  },
  {
    sequenceId: 172,
    title: "מצה בריי מושחתת עם גבינות",
    suggestion: "pesach",
    reason:
      "Built on matzah and published 03/04/2026, inside Passover. Matzah is an ingredient, not a holiday name, and " +
      "the caption says nothing about פסח — assigning would be inference from ingredient plus date.",
  },
  {
    sequenceId: 173,
    title: "שוקו פאי מצה",
    suggestion: "pesach",
    reason:
      'Same as 172: "הקינוח הכי מושלם שאפשר להכין ממצה", published 05/04/2026. The word "Passover" appears only in ' +
      "an English summary added to the review spreadsheet, not in Rotem's caption.",
  },
  {
    sequenceId: 9,
    title: "עוגת גבינה",
    suggestion: "shavuot",
    reason: "Cheesecake — a Shavuot association, never stated. Applies to the whole cheesecake set below too.",
  },
  { sequenceId: 30, title: "עוגת גבינה קרמית דלת שומן", suggestion: "shavuot", reason: "Cheesecake; no holiday named." },
  { sequenceId: 73, title: "עוגת גבינה פירורים בלי שמנת מתוקה", suggestion: "shavuot", reason: "Cheesecake; no holiday named." },
  { sequenceId: 112, title: "עוגת גבינה קרמית", suggestion: "shavuot", reason: "Cheesecake; no holiday named." },
  { sequenceId: 135, title: "עוגת גבינה טריקולד מנומרת", suggestion: "shavuot", reason: "Cheesecake; no holiday named." },
  { sequenceId: 183, title: "רולדת שמרים עוגת גבינה", suggestion: "shavuot", reason: "Cheesecake; no holiday named." },
  {
    sequenceId: 37,
    title: "מאפינס שקדים בציפוי דבש",
    suggestion: "rosh-hashana",
    reason:
      'Honey glaze "באווירת החג", published 11/09/2023 near Rosh Hashana — but "החג" is never named, and the same ' +
      "caption offers maple as an alternative.",
  },
  {
    sequenceId: 119,
    title: "טורטיות ממולאות בפרגית",
    suggestion: "rosh-hashana",
    reason:
      'Pomegranate, honey and cinnamon, published 13/10/2024, caption ends "שיהיה חג שמח 😍". Autumn 2024 puts ' +
      "Rosh Hashana, Yom Kippur and Sukkot all in range; the caption picks none of them.",
  },
  {
    sequenceId: 120,
    title: "עוגת פאדג׳ שוקולד פרווה",
    suggestion: null,
    reason:
      'Caption ends "שיהיה לנו חג שמח ❤️" and the cake is פרווה, published 16/10/2024. Which חג is unstated.',
  },
];

/**
 * The one legacy biscuit-series item with no catalog record behind it, and so
 * no sequenceId to key on. Its hand-authored title in lib/biscuit-cake-series.ts
 * names the holiday outright, which clears the same bar as the table above.
 */
export const BISCUIT_HOLIDAY_ASSIGNMENTS: Record<string, { holidays: string[]; evidence: string }> = {
  "07": { holidays: ["pesach"], evidence: 'Series title: "פירמידת ביסקוויטים כשרה לפסח".' },
};

/** The holidays a recipe should be imported with: a recorded assignment if one
 * exists, otherwise none. Never inferred. */
export function holidaysFor(sequenceId: number | undefined): string[] {
  return HOLIDAY_ASSIGNMENTS.find((entry) => entry.sequenceId === sequenceId)?.holidays ?? [];
}

/** Same, for a standalone biscuit-series item addressed by its legacy id. */
export function holidaysForBiscuit(biscuitId: string | undefined): string[] {
  return (biscuitId && BISCUIT_HOLIDAY_ASSIGNMENTS[biscuitId]?.holidays) || [];
}

export interface BiscuitOverlap {
  biscuitId: string;
  biscuitTitle: string;
  recipeId: string;
  recipeSequenceId: number;
  recipeTitle: string;
  method: "image-folder" | "reviewed-title-alias" | "recorded-decision";
}

/**
 * Reproduces lib/recipes.ts getCoveredBiscuitIds(): which legacy biscuit-cake
 * series items are the same real recipe as a reviewed catalog record. The site
 * already relies on this to avoid listing the same cake twice, so it is an
 * existing, reviewed decision rather than a new judgement made here.
 *
 * Two mechanisms, in the same priority order the site uses:
 *   1. the recipe's photos live in that series item's image folder
 *      ("images/biscuit-cakes/11-oreo-bomb/..." -> biscuit item "11")
 *   2. an explicit, hand-reviewed title alias (BISCUIT_SERIES_TITLE_MATCH)
 *      for the three series items that have no photo yet
 */
export function findBiscuitOverlaps(reviewed: Recipe[]): BiscuitOverlap[] {
  const byId = new Map(biscuitCakeSeries.map((item) => [item.id, item]));
  const overlaps: BiscuitOverlap[] = [];

  for (const recipe of reviewed) {
    const fromImage =
      biscuitSeriesFolderId(recipe.images?.thumbnail) ||
      biscuitSeriesFolderId(recipe.images?.main) ||
      biscuitSeriesFolderId(recipe.images?.hero);
    const fromTitle = BISCUIT_SERIES_TITLE_MATCH[recipe.title];
    // A recorded decision outranks both, because it is the only one of the
    // three that a person actually made.
    const fromDecision = getCatalogCorrection(recipe.sequenceId)?.mergeWithBiscuitId;
    const biscuitId = fromDecision || fromImage || fromTitle;
    if (!biscuitId) continue;

    const item = byId.get(biscuitId);
    if (!item) continue;

    overlaps.push({
      biscuitId,
      biscuitTitle: item.title,
      recipeId: recipe.id,
      recipeSequenceId: recipe.sequenceId as number,
      recipeTitle: recipe.title,
      method: fromDecision ? "recorded-decision" : fromImage ? "image-folder" : "reviewed-title-alias",
    });
  }

  return overlaps;
}

export function allBiscuitItems(): BiscuitCakeSeriesItem[] {
  return biscuitCakeSeries;
}

export function allDateItems(): DateSeriesItem[] {
  return dateSeriesAB;
}

export function allGames(): GameCatalogItem[] {
  return gamesCatalog;
}

/* ------------------------------------------------------------------ slugs */

/**
 * Slug generation lives in sanity/lib/slugify.ts so that the manifest and the
 * Studio's "Generate" button can never produce different slugs for the same
 * title. Re-exported here because the migration scripts are its other caller.
 */
export { slugifyTitle } from "../sanity/lib/slugify.ts";

/**
 * A catalog recipe route id that should not survive into the new URL scheme.
 *
 * The reviewed catalog only ever produced two id shapes: the clean, opaque
 * "instagram-<sequenceId>" form (126 recipes), and everything else — 33 raw
 * Hebrew caption fragments or meaningless collision artifacts such as "עו-9",
 * plus one flattened Instagram URL. Testing for the good shape rather than
 * pattern-matching the bad ones keeps this exact: the manifest builder asserts
 * that it selects exactly the 34 recipes named in
 * reports/id-architecture-audit-2026-09-07.md.
 */
export function isUnsuitableRecipeRouteId(id: string): boolean {
  return !/^instagram-\d+$/.test(id);
}
