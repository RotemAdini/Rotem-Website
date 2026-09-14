import { defineField, defineType } from "sanity";

import { sanitySlugify } from "../lib/slugify";
import { isUniqueRouteSlug } from "../lib/isUniqueRouteSlug";
import { DATE_BUDGET_RANGES, DATE_BUDGETS, DATE_PLACES, DATE_SERIES } from "./taxonomy";

/**
 * A date idea.
 *
 * This is the general type for every date idea on the site. Belonging to an
 * editorial series is optional: the thirteen ideas imported from the א׳-ב׳ run
 * carry `seriesKey` and a position, and a standalone idea carries neither.
 * Standalone is a complete, first-class state — a future one-off date needs a
 * new document and nothing else, no schema change and no invented position.
 *
 * Preserves every field lib/date-series.ts currently supplies to the site,
 * plus the review caveats the content audit recorded: items 09, 10 and 13
 * contain text that was written as a plausible fill-in rather than from
 * Rotem's own account, and that warning must survive the migration rather
 * than quietly becoming indistinguishable from verified content.
 */
export const dateIdea = defineType({
  name: "dateIdea",
  title: "רעיון לדייט",
  type: "document",
  groups: [
    { name: "identity", title: "Identity" },
    { name: "content", title: "Content", default: true },
    { name: "media", title: "Media" },
    { name: "review", title: "Review" },
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
        "Permanent canonical identifier from data/migration/content-manifest.json. Supabase favourites point here.",
      validation: (rule) => rule.required().regex(/^date_[0-9A-HJKMNP-TV-Z]{26}$/, { name: "date_<ULID>" }),
    }),
    defineField({ name: "title", title: "כותרת", type: "string", group: "identity", validation: (rule) => rule.required() }),
    defineField({
      name: "alternateTitles",
      title: "כותרות קודמות",
      type: "array",
      group: "identity",
      of: [{ type: "string" }],
      readOnly: true,
      description: "Previously published titles, recorded automatically when the title changes.",
    }),
    defineField({
      name: "slug",
      title: "Slug (URL)",
      type: "slug",
      group: "identity",
      description:
        "The public URL, in Hebrew, generated from the title the first time only. Editing the title afterwards " +
        "does NOT change it. Changing a published slug retires the old value into Slug history.",
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
      description: "Previously published slugs, appended automatically when a published slug changes.",
    }),
    defineField({
      name: "legacyIds",
      title: "Legacy favourite tokens",
      type: "array",
      group: "identity",
      of: [{ type: "string" }],
      readOnly: true,
      description: 'Exact rotemFavorites tokens, e.g. "date-a-b-01".',
    }),
    defineField({
      name: "legacyRouteIds",
      title: "Legacy route segments",
      type: "array",
      group: "identity",
      of: [{ type: "string" }],
      readOnly: true,
      description: 'Current /dates/<id> segments, e.g. "01".',
    }),
    defineField({
      name: "seriesKey",
      title: "סדרה",
      type: "string",
      group: "identity",
      options: { list: DATE_SERIES.map((entry) => ({ title: entry.title, value: entry.value })) },
      description:
        "OPTIONAL. Leave empty for a standalone date idea — that is a normal, complete state, not a missing value. " +
        "Set it only when the idea really is an instalment of a run.",
    }),
    defineField({
      name: "seriesPosition",
      title: "מספר בסדרה",
      type: "number",
      group: "identity",
      description:
        "Position within סדרה above. Only meaningful when a series is set; leave empty for a standalone date rather " +
        "than inventing a number, which would put it in an order it has no place in.",
      validation: (rule) =>
        rule.min(1).custom((value, context) => {
          const parent = context.parent as { seriesKey?: string } | undefined;
          if (value != null && !parent?.seriesKey) return "A position only makes sense together with a series.";
          return true;
        }),
    }),
    defineField({
      name: "listed",
      title: "מוצג ברשימת הדייטים",
      type: "boolean",
      group: "identity",
      initialValue: true,
      description:
        "False keeps the idea out of /dates, the homepage and search while its content is still being written. " +
        "An idea with no value set counts as listed, so the existing ideas are unaffected.",
    }),

    /* ----------------------------------------------------------- content */
    defineField({
      name: "description",
      title: "תיאור",
      type: "text",
      group: "content",
      rows: 4,
      description: "Optional. The current site shows a fixed “מסדרת הדייטים א׳-ב׳” line; this replaces it when set.",
    }),
    defineField({
      name: "place",
      title: "מיקום",
      type: "string",
      group: "content",
      options: { list: DATE_PLACES.map((entry) => ({ title: entry.title, value: entry.value })) },
    }),
    defineField({
      name: "budgetRange",
      title: "תקציב משוער לזוג",
      type: "string",
      group: "content",
      options: { list: DATE_BUDGET_RANGES.map((entry) => ({ title: entry.title, value: entry.value })) },
      description:
        "The estimated total the couple spends on this date, taken from the date's own תוכנית הדייט → cost. " +
        "Drives the budget chips on /dates. LEAVE EMPTY when the stated cost straddles two ranges or the plan " +
        "says it depends on what you choose — an empty value shows under no range rather than being guessed.",
    }),
    defineField({
      name: "budget",
      title: "תקציב (ישן)",
      type: "string",
      group: "content",
      readOnly: true,
      options: { list: DATE_BUDGETS.map((entry) => ({ title: entry.title, value: entry.value })) },
      description:
        "Superseded by תקציב משוער לזוג above. Kept read-only so the previous values stay inspectable; nothing " +
        "on the site reads this field any more.",
    }),
    defineField({
      name: "plan",
      title: "תוכנית הדייט",
      type: "datePlan",
      group: "content",
    }),

    /* ------------------------------------------------------------- media */
    defineField({
      name: "legacyImages",
      title: "Legacy images (/public)",
      type: "array",
      group: "media",
      of: [{ type: "legacyImage" }],
      description: "The photos the live site serves today, by repository path.",
    }),
    defineField({
      name: "gallery",
      title: "Gallery (Sanity assets)",
      type: "array",
      group: "media",
      of: [{ type: "image", options: { hotspot: true }, fields: [{ name: "alt", title: "Alt text", type: "string" }] }],
    }),
    defineField({
      name: "videos",
      title: "Videos",
      type: "array",
      group: "media",
      of: [{ type: "legacyVideo" }],
      description: "No date idea currently has one; the field exists so a video can be added without a schema change.",
    }),

    /* ------------------------------------------------------------ review */
    defineField({
      name: "sourceUrl",
      title: "Instagram URL",
      type: "url",
      group: "review",
      description:
        "The post this idea came from, where one is known. Recorded so an idea drafted from a reel keeps a link back " +
        "to its own source instead of the provenance living only in someone's memory.",
    }),
    defineField({
      name: "needsRotemApproval",
      title: "דורש אישור רותם",
      type: "boolean",
      group: "review",
      initialValue: false,
      description:
        "True where the current text was written as a plausible fill-in rather than from Rotem's own account. " +
        "Carried over from the content audit of 6 September 2026 so the caveat is not lost.",
    }),
    defineField({
      name: "reviewNote",
      title: "הערת בדיקה",
      type: "text",
      group: "review",
      rows: 3,
    }),

    /* --------------------------------------------------------------- SEO */
    defineField({ name: "seoTitle", title: "SEO title", type: "string", group: "seo" }),
    defineField({ name: "seoDescription", title: "SEO description", type: "text", rows: 3, group: "seo" }),
  ],

  preview: {
    select: { title: "title", position: "seriesPosition", budgetRange: "budgetRange", needsApproval: "needsRotemApproval" },
    prepare({ title, position, budgetRange, needsApproval }) {
      const budget = DATE_BUDGET_RANGES.find((entry) => entry.value === budgetRange)?.title;
      return {
        title: title || "(ללא כותרת)",
        subtitle: [position ? `#${String(position).padStart(2, "0")}` : null, budget, needsApproval ? "דורש אישור" : null]
          .filter(Boolean)
          .join(" · "),
      };
    },
  },

  orderings: [{ title: "Series order", name: "seriesAsc", by: [{ field: "seriesPosition", direction: "asc" }] }],
});
