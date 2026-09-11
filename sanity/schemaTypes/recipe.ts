import { defineField, defineType } from "sanity";

import { sanitySlugify } from "../lib/slugify";
import { isUniqueRouteSlug } from "../lib/isUniqueRouteSlug";
import {
  RECIPE_CATEGORIES,
  RECIPE_DIFFICULTIES,
  RECIPE_FOOD_TYPES,
  RECIPE_TASTES,
  RECIPE_HOLIDAYS,
  RECIPE_SERIES,
  RECIPE_STATUSES,
  taxonomyPairIssues,
} from "./taxonomy";

/**
 * A recipe.
 *
 * Field-for-field a superset of what the live site reads out of
 * data/recipes.json plus lib/biscuit-cake-series.ts, so nothing is lost by
 * importing. The taxonomy is the existing one — no new categories, difficulty
 * levels or series were introduced.
 *
 * Identity follows reports/id-architecture-audit-2026-09-07.md:
 *   contentId  immutable, opaque, minted once in data/migration/content-manifest.json
 *   slug       human-readable URL, freely editable, never a relationship key
 *   legacyIds  the localStorage favourite tokens this recipe must keep answering to
 */
export const recipe = defineType({
  name: "recipe",
  title: "מתכון",
  type: "document",
  validation: (rule) => rule.custom((value) => taxonomyPairIssues(value).join("; ") || true),
  groups: [
    { name: "identity", title: "Identity" },
    { name: "content", title: "Content", default: true },
    { name: "classification", title: "Classification" },
    { name: "media", title: "Media" },
    { name: "provenance", title: "Provenance" },
    { name: "seo", title: "SEO" },
  ],
  fields: [
    /* ---------------------------------------------------------- identity */
    defineField({
      name: "contentId",
      title: "Content ID (immutable)",
      type: "string",
      group: "identity",
      readOnly: true,
      description:
        "Permanent canonical identifier, assigned once by data/migration/content-manifest.json. " +
        "Supabase favourites point at this value. Never edit it — editing it orphans every saved favourite.",
      validation: (rule) => rule.required().regex(/^recipe_[0-9A-HJKMNP-TV-Z]{26}$/, { name: "recipe_<ULID>" }),
    }),
    defineField({
      name: "title",
      title: "כותרת",
      type: "string",
      group: "identity",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "alternateTitles",
      title: "כותרות קודמות",
      type: "array",
      group: "identity",
      of: [{ type: "string" }],
      readOnly: true,
      description:
        "Other titles this recipe has been published under — from a recorded title correction, or from a second " +
        "Instagram post that was merged into this one. Kept as source history so no published wording is lost.",
    }),
    defineField({
      name: "slug",
      title: "Slug (URL)",
      type: "slug",
      group: "identity",
      description:
        "The public URL, in Hebrew, generated from the title the first time only. Editing the title afterwards " +
        "does NOT change it — press Generate deliberately if you want it re-derived. Changing a published slug " +
        "retires the old value into Slug history, so the old link keeps working.",
      options: { source: "title", slugify: sanitySlugify, maxLength: 80, isUnique: isUniqueRouteSlug },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slugHistory",
      title: "Slug history",
      type: "array",
      group: "identity",
      of: [{ type: "retiredSlug" }],
      readOnly: true,
      description:
        "Previously published slugs, appended automatically when a published slug changes. Each one permanently " +
        "redirects to the current slug.",
    }),
    defineField({
      name: "legacyIds",
      title: "Legacy favourite tokens",
      type: "array",
      group: "identity",
      of: [{ type: "string" }],
      readOnly: true,
      description:
        'Exact rotemFavorites localStorage tokens, e.g. "recipe-instagram-112" and "biscuit-cake-04". ' +
        "Read-only: these are the migration keys for existing saved favourites.",
    }),
    defineField({
      name: "legacyRouteIds",
      title: "Legacy route segments",
      type: "array",
      group: "identity",
      of: [{ type: "string" }],
      readOnly: true,
      description: 'Current URL segments, e.g. "instagram-112". Each must permanently redirect to the current slug.',
    }),
    defineField({
      name: "sequenceId",
      title: "Sequence ID",
      type: "number",
      group: "identity",
      readOnly: true,
      description: "The review-spreadsheet row number. Stable, but not the canonical id.",
    }),

    /* ----------------------------------------------------------- content */
    defineField({
      name: "ingredients",
      title: "מצרכים",
      type: "array",
      group: "content",
      of: [{ type: "string" }],
      description: "One line per source line, including section headings — presentation decides how to render them.",
    }),
    defineField({
      name: "instructions",
      title: "אופן ההכנה",
      type: "array",
      group: "content",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "notes",
      title: "הערות",
      type: "text",
      group: "content",
      rows: 4,
    }),
    defineField({
      name: "disclosure",
      title: "גילוי נאות / קרדיט",
      type: "string",
      group: "content",
      description:
        "שיתוף פעולה ממומן או קרדיט. מוצג בראש עמוד המתכון, בנפרד מהוראות ההכנה — לא כשלב בישול.",
    }),
    defineField({
      name: "prepTimeMinutes",
      title: "זמן הכנה (דקות)",
      type: "number",
      group: "content",
      validation: (rule) => rule.min(0),
      description:
        "Active preparation time only. Leave empty when no verified value exists — the page hides the stat rather " +
        "than showing an invented number. Overnight refrigeration is not prep time; put that in Notes.",
    }),
    defineField({
      name: "requiresOven",
      title: "דורש תנור",
      type: "boolean",
      group: "content",
      description:
        'True = דורש תנור. False = ללא תנור. Drives the "אופן הכנה" chips on /recipes. LEAVE EMPTY when the ' +
        'recipe itself does not settle it — empty means "not decided", and such a recipe appears under neither ' +
        "chip rather than being guessed into one. Decide it from the ingredients and instructions only, never " +
        "from the title, the category, or which source the recipe came from. A dish that is fried, chilled, " +
        "frozen, blended or cooked on the hob is ללא תנור even when it looks like a cake.",
      options: { layout: "checkbox" },
    }),
    defineField({
      name: "requiresBaking",
      title: "דורש אפייה בתנור (ישן)",
      type: "boolean",
      group: "content",
      readOnly: true,
      description:
        "Superseded by דורש תנור above, which was audited against every recipe's own instructions. Kept read-only " +
        "so the previous values stay inspectable; nothing on the site reads this field any more.",
      options: { layout: "checkbox" },
    }),

    /* ---------------------------------------------------- classification */
    defineField({
      name: "siteCategory",
      title: "קטגוריה באתר",
      type: "string",
      group: "classification",
      options: { list: RECIPE_CATEGORIES.map((entry) => ({ title: entry.title, value: entry.title })) },
    }),
    defineField({
      name: "categorySlug",
      title: "Category slug",
      type: "string",
      group: "classification",
      options: { list: RECIPE_CATEGORIES.map((entry) => ({ title: `${entry.title} (${entry.value})`, value: entry.value })) },
      description: "Drives the /recipes?category= filter. Paired with the Hebrew category above.",
    }),
    defineField({
      name: "taste",
      title: "מתוק / מלוח",
      type: "string",
      group: "classification",
      options: { list: RECIPE_TASTES.map((entry) => ({ title: entry.title, value: entry.value })), layout: "radio" },
      description:
        "Drives the מתוק/מלוח chips on /recipes. Independent of the category — a cookie, a pancake or a sweet " +
        "bread is מתוק while sitting in עוגיות, בראנץ׳ or לחמים. Set it per recipe; never infer it from the category.",
    }),
    defineField({
      name: "foodType",
      title: "סוג מאכל",
      type: "string",
      group: "classification",
      options: { list: [...RECIPE_FOOD_TYPES] },
      description: "Free-text label from the review spreadsheet; the near-duplicates are Rotem's to consolidate.",
    }),
    defineField({
      name: "difficulty",
      title: "רמת קושי",
      type: "string",
      group: "classification",
      options: { list: RECIPE_DIFFICULTIES.map((entry) => ({ title: entry.title, value: entry.title })) },
    }),
    defineField({
      name: "difficultySlug",
      title: "Difficulty slug",
      type: "string",
      group: "classification",
      options: { list: RECIPE_DIFFICULTIES.map((entry) => ({ title: entry.title, value: entry.value })) },
    }),
    defineField({
      name: "series",
      title: "סדרה",
      type: "string",
      group: "classification",
      options: { list: RECIPE_SERIES.map((entry) => ({ title: entry.title, value: entry.value })) },
      description:
        'A biscuit cake is an ordinary recipe carrying series = "עוגות ביסקוויטים" — there is deliberately no ' +
        "separate document type for it.",
    }),
    defineField({
      name: "seriesPosition",
      title: "מיקום בסדרה",
      type: "number",
      group: "classification",
      description: "Episode number within the series (1-14). Left empty where the source data does not establish one.",
    }),
    defineField({
      name: "holidays",
      title: "חגים",
      type: "array",
      group: "classification",
      of: [{ type: "string" }],
      // A checklist, not a tag input: `list` + `layout: "grid"` renders the
      // whole controlled vocabulary as tickboxes, so assigning a recipe to
      // Passover and Shavuot is two clicks and nothing outside the vocabulary
      // can be typed in.
      options: {
        list: RECIPE_HOLIDAYS.map((entry) => ({ title: entry.title, value: entry.value })),
        layout: "grid",
      },
      validation: (rule) => rule.unique(),
      description:
        "לאילו חגים המתכון מתאים — אפשר לסמן כמה, אפשר גם אף אחד. " +
        "Discovery metadata for the planned חגים section only: a recipe may belong to zero, one or several " +
        "holidays, this is a separate axis from קטגוריה / סוג מאכל / סדרה, and it is deliberately not shown as a " +
        "badge on the recipe card. Editing it never touches contentId or slug, so a recipe can be added to or " +
        "removed from a holiday at any time without breaking a link or a saved favourite.",
    }),
    defineField({
      name: "tags",
      title: "תגיות",
      type: "array",
      group: "classification",
      of: [{ type: "string" }],
      options: { layout: "tags" },
    }),

    /* ------------------------------------------------------------- media */
    defineField({
      name: "legacyImages",
      title: "Legacy images (/public)",
      type: "array",
      group: "media",
      of: [{ type: "legacyImage" }],
      description:
        "The photos the live site serves today, by repository path. Preserved verbatim; the site keeps reading " +
        "these until images are uploaded into Sanity's asset store.",
    }),
    defineField({
      name: "legacyImageFolder",
      title: "Legacy image folder slug",
      type: "string",
      group: "media",
      readOnly: true,
      description:
        'English folder name under images/recipes/**, e.g. "honey-butter-toast", recorded only where the data ' +
        "already establishes it. This is a storage location, NOT a URL: it never determines or influences the " +
        "slug above, and an unresolved folder mapping does not block anything.",
    }),
    defineField({
      name: "gallery",
      title: "Gallery (Sanity assets)",
      type: "array",
      group: "media",
      of: [{ type: "image", options: { hotspot: true }, fields: [{ name: "alt", title: "Alt text", type: "string" }] }],
      description: "Empty until photos are uploaded to Sanity. Adding one here does not affect the live site yet.",
    }),

    /* -------------------------------------------------------- provenance */
    defineField({
      name: "sourceUrl",
      title: "Instagram URL",
      type: "url",
      group: "provenance",
    }),
    defineField({
      name: "instagramShortcode",
      title: "Instagram shortcode",
      type: "string",
      group: "provenance",
      readOnly: true,
      description: "Instagram's own immutable id for the post. Unique across the catalog; used to verify the import.",
    }),
    defineField({
      name: "publishedDate",
      title: "תאריך פרסום",
      type: "string",
      group: "provenance",
      description: "DD/MM/YYYY, kept as text exactly as the source spreadsheet supplied it.",
    }),
    defineField({
      name: "status",
      title: "Review status",
      type: "string",
      group: "provenance",
      options: { list: RECIPE_STATUSES.map((entry) => ({ title: entry.title, value: entry.value })) },
      initialValue: "NEEDS_REVIEW",
    }),
    defineField({
      name: "listed",
      title: "Listed on /recipes",
      type: "boolean",
      group: "provenance",
      initialValue: true,
      description: "False for a recipe that stays reachable at its own URL but is hidden from the board (duplicates).",
    }),
    defineField({
      name: "alternateSourceUrls",
      title: "Other posts of this recipe",
      type: "array",
      group: "provenance",
      of: [{ type: "url" }],
      readOnly: true,
      description:
        "Instagram posts of the same dish that were absorbed into this record. Kept so no published post is " +
        "forgotten, even though the site shows one recipe.",
    }),
    defineField({
      name: "absorbedSequenceIds",
      title: "Absorbed sequence numbers",
      type: "array",
      group: "provenance",
      of: [{ type: "number" }],
      readOnly: true,
      description: "Review-spreadsheet rows that were merged into this record.",
    }),
    defineField({
      name: "retiredContentIds",
      title: "Retired content IDs",
      type: "array",
      group: "provenance",
      of: [{ type: "string" }],
      readOnly: true,
      description:
        "Canonical ids that an earlier version of the manifest had minted for records since absorbed here. " +
        "Recorded so a Supabase row written against an old id can still be resolved.",
    }),
    defineField({
      name: "issues",
      title: "Data issues",
      type: "array",
      group: "provenance",
      of: [{ type: "string" }],
      readOnly: true,
      description: "Carried over from data/recipes.json so the review backlog survives the migration.",
    }),
    defineField({
      name: "sourceFiles",
      title: "Source files",
      type: "array",
      group: "provenance",
      of: [{ type: "sourceFileRef" }],
      readOnly: true,
    }),
    defineField({
      name: "contentCategory",
      title: "Content category",
      type: "string",
      group: "provenance",
      readOnly: true,
      description: 'Top-level bucket from the review spreadsheet — "FOOD" for every current recipe.',
    }),
    defineField({
      name: "ingredientsText",
      title: "מצרכים (טקסט מקורי)",
      type: "text",
      group: "provenance",
      rows: 6,
      readOnly: true,
      description:
        "The unsplit ingredients blob exactly as the review spreadsheet supplied it. The site renders the parsed " +
        "list above; this is kept so the original wording can always be recovered.",
    }),
    defineField({
      name: "instructionsText",
      title: "אופן ההכנה (טקסט מקורי)",
      type: "text",
      group: "provenance",
      rows: 6,
      readOnly: true,
    }),
    defineField({
      name: "imageMatchConfidence",
      title: "Image match confidence",
      type: "string",
      group: "provenance",
      readOnly: true,
    }),
    defineField({
      name: "imageMatchMethod",
      title: "Image match method",
      type: "string",
      group: "provenance",
      readOnly: true,
    }),
    defineField({
      name: "imageMatchKey",
      title: "Image match key",
      type: "string",
      group: "provenance",
      readOnly: true,
    }),

    /* --------------------------------------------------------------- SEO */
    defineField({ name: "seoTitle", title: "SEO title", type: "string", group: "seo" }),
    defineField({ name: "seoDescription", title: "SEO description", type: "text", rows: 3, group: "seo" }),
  ],

  preview: {
    select: { title: "title", status: "status", sequenceId: "sequenceId", category: "siteCategory" },
    prepare({ title, status, sequenceId, category }) {
      return {
        title: title || "(ללא כותרת)",
        subtitle: [sequenceId ? `#${sequenceId}` : null, category, status].filter(Boolean).join(" · "),
      };
    },
  },

  orderings: [
    { title: "Sequence", name: "sequenceAsc", by: [{ field: "sequenceId", direction: "asc" }] },
    { title: "Title", name: "titleAsc", by: [{ field: "title", direction: "asc" }] },
  ],
});
