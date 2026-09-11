/**
 * The site's already-approved content classifications, extracted verbatim from
 * the 160 reviewed recipes in data/recipes.json. Nothing here is invented: the
 * category and difficulty pairs are exactly the ones lib/categories.ts and the
 * /recipes filter chips already use, and `foodType` is the free-text label
 * Rotem entered in the review spreadsheet.
 *
 * scripts/verify-sanity-import.ts asserts that every value in the live data
 * still appears in these lists, so a new classification can never be
 * introduced silently by an import.
 */

/** siteCategory <-> categorySlug, the pairing the /recipes board filters on. */
export const RECIPE_CATEGORIES = [
  { title: "עוגות וקינוחים", value: "cakes" },
  { title: "עוגיות", value: "cookies" },
  { title: "ארוחות בוקר ובראנץ׳", value: "brunch" },
  { title: "פסטות", value: "pasta" },
  { title: "לחמים ומאפים", value: "bread" },
  { title: "מנות עיקריות", value: "mains" },
  { title: "תוספות", value: "sides" },
  { title: "ארוחות קלות", value: "light" },
  { title: "נשנושים ומנות ראשונות", value: "starters" },
  { title: "משקאות", value: "drinks" },
  { title: "סלטים", value: "salads" },
] as const;

/**
 * Sweet or savoury — an axis of its own, independent of siteCategory.
 *
 * It has to be stored rather than derived: the board used to infer it from
 * `siteCategory === "עוגות וקינוחים"`, which made every cookie, pancake,
 * sweet bread and iced coffee "savoury". No category mapping can replace it
 * either — ארוחות בוקר ובראנץ׳ holds both פנקייק מלוח and פנקייק חלבון, and
 * נשנושים holds both ממרח חצילים and כדורי רפאלו.
 */
export const RECIPE_TASTES = [
  { title: "מתוק", value: "sweet" },
  { title: "מלוח", value: "savory" },
] as const;

/** difficulty <-> difficultySlug. */
export const RECIPE_DIFFICULTIES = [
  { title: "קל", value: "easy" },
  { title: "בינוני", value: "medium" },
  { title: "קשה", value: "hard" },
] as const;

/** Labels and filter values must describe the same classification. Both may be absent. */
export function taxonomyPairIssues(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const doc = value as Record<string, unknown>;
  const issues: string[] = [];
  for (const [labelField, slugField, entries] of [
    ["siteCategory", "categorySlug", RECIPE_CATEGORIES],
    ["difficulty", "difficultySlug", RECIPE_DIFFICULTIES],
  ] as const) {
    const label = doc[labelField];
    const slug = doc[slugField];
    if (!label && !slug) continue;
    if (!entries.some((entry) => entry.title === label && entry.value === slug)) {
      issues.push(`${labelField} and ${slugField} must be a matching pair (or both empty)`);
    }
  }
  return issues;
}

/** The free-text "sort of food this is" label from the review spreadsheet.
 * Kept as an open list rather than a strict enum: it has near-duplicates
 * ("עוגה"/"עוגות", "פסטה"/"פסטות") that are Rotem's to consolidate, not this
 * migration's. */
export const RECIPE_FOOD_TYPES = [
  "עוגה",
  "עוגות",
  "קינוחים",
  "קינוח",
  "עוגיות",
  "ארוחות בוקר ובראנץ׳",
  "ארוחת בוקר",
  "פסטות",
  "פסטה",
  "מאפים מלוחים",
  "מאפה",
  "בשר",
  "עוף",
  "דגים",
  "תוספות",
  "מנות ראשונות",
  "נשנושים ומנות ראשונות",
  "נשנוש",
  "משקאות",
  "לחמים",
  "לחם",
  "סלט",
  "אורז",
  "תפוחי אדמה",
  "אחר",
] as const;

/** The only editorial series the recipe catalog currently has. */
export const RECIPE_SERIES = [{ title: "עוגות ביסקוויטים", value: "עוגות ביסקוויטים" }] as const;

/**
 * Holidays a recipe can be surfaced under — a taxonomy of its own, entirely
 * separate from siteCategory, foodType and series. A recipe may carry zero,
 * one or several of these; most carry none.
 *
 * This is discovery/filter metadata, not a label: nothing here is meant to be
 * rendered as a badge on a recipe card. Its purpose is the planned "חגים"
 * section, where each holiday is a circular filter that lists every recipe
 * whose `holidays` array contains that value.
 *
 * Stored value is the stable English slug, displayed value is the Hebrew
 * title — the same split `categorySlug`/`siteCategory` and
 * `difficultySlug`/`difficulty` already use. It matters here for two reasons:
 * the value is what a future `/recipes?holiday=…` URL carries, and rewording a
 * Hebrew label (or spelling `ראש השנה` with a hyphen) then costs nothing,
 * because no document holds the label.
 *
 * Adding a holiday later is an append to this array and nothing else. The
 * field is a plain `array of string`, so a new value needs no schema
 * migration, no new document type and no rewrite of existing recipes: the
 * checkbox simply appears in the Studio, unticked everywhere.
 *
 * Removing a value is the case that does need care — recipes already carrying
 * it would keep a value the Studio no longer offers — so retire a holiday only
 * after clearing it from the recipes that use it.
 */
export const RECIPE_HOLIDAYS = [
  { title: "פסח", value: "pesach" },
  { title: "שבועות", value: "shavuot" },
  { title: "ראש השנה", value: "rosh-hashana" },
  { title: "חנוכה", value: "hanukkah" },
  { title: "פורים", value: "purim" },
] as const;

export type RecipeHolidaySlug = (typeof RECIPE_HOLIDAYS)[number]["value"];

/** Hebrew label for a stored holiday slug, for whoever renders the חגים section. */
export const RECIPE_HOLIDAY_TITLES: Record<string, string> = Object.fromEntries(
  RECIPE_HOLIDAYS.map((entry) => [entry.value, entry.title]),
);

export const RECIPE_STATUSES = [
  { title: "COMPLETE — reviewed and publishable", value: "COMPLETE" },
  { title: "NEEDS_REVIEW — not shown on the site", value: "NEEDS_REVIEW" },
] as const;

/**
 * Estimated total cost for the couple, for the whole date.
 *
 * These replaced נמוך/בינוני/גבוה, which meant different things on different
 * cards — a 60 ₪ evening and a 250 ₪ evening were both filed as the same
 * "low"/"high". Each range is decided from the date's own stated plan.cost.
 */
export const DATE_BUDGET_RANGES = [
  { title: "חינם", value: "free" },
  { title: "עד 100 ₪", value: "upto100" },
  { title: "100–250 ₪", value: "100to250" },
  { title: "250 ₪ ומעלה", value: "250plus" },
] as const;

/** Superseded by DATE_BUDGET_RANGES. Kept so the old field still renders in
 * the Studio while its values remain on the documents. */
export const DATE_BUDGETS = [
  { title: "נמוך", value: "low" },
  { title: "בינוני", value: "medium" },
  { title: "גבוה", value: "high" },
] as const;

export const DATE_PLACES = [
  { title: "בבית", value: "home" },
  { title: "בחוץ", value: "outside" },
] as const;

/** The /games filter chips. */
export const GAME_KINDS = [
  { title: "הכל / חבילה", value: "all" },
  { title: "תחרות", value: "competition" },
  { title: "שאלות עומק", value: "deep" },
  { title: "כיף", value: "fun" },
  { title: "רומנטיקה", value: "romance" },
] as const;
