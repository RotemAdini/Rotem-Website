import { defineField, defineType } from "sanity";

import { GAME_KINDS } from "./taxonomy";

/**
 * A digital game product.
 *
 * Sanity owns the MARKETING side of a game only: what it is called, how it is
 * described, what it looks like, and the price shown on the card. It
 * deliberately owns nothing about money or access:
 *
 *   - no Grow/payment identifiers, order records or webhook state
 *   - no entitlements, licences, unlock flags or "who has bought this"
 *
 * Those belong to Supabase later. Keeping them out of the CMS means an editor
 * can never grant or revoke access by editing content, and a CMS outage can
 * never affect what a paying customer owns.
 */
export const game = defineType({
  name: "game",
  title: "משחק",
  type: "document",
  groups: [
    { name: "identity", title: "Identity" },
    { name: "marketing", title: "Marketing", default: true },
    { name: "media", title: "Media" },
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
      description: "Permanent canonical identifier from data/migration/content-manifest.json.",
      validation: (rule) => rule.required().regex(/^game_[0-9A-HJKMNP-TV-Z]{26}$/, { name: "game_<ULID>" }),
    }),
    defineField({ name: "title", title: "שם המשחק", type: "string", group: "identity", validation: (rule) => rule.required() }),
    defineField({
      name: "slug",
      title: "Slug (URL)",
      type: "slug",
      group: "identity",
      readOnly: true,
      validation: (rule) => rule.required(),
      description:
        "Currently also the route folder under app/games/ and the landing-page filename, so the four existing " +
        "English slugs are locked until dynamic game routing is supported. Editing the title does not change it.",
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
      description: "Empty today — games are not favouritable on the current site. Reserved so they can become so.",
    }),
    defineField({
      name: "legacyRouteIds",
      title: "Legacy route segments",
      type: "array",
      group: "identity",
      of: [{ type: "string" }],
      readOnly: true,
    }),

    defineField({
      name: "displayOrder",
      title: "סדר תצוגה",
      type: "number",
      group: "identity",
      description: "Position in the /games grid. The catalog has always had a deliberate order; this is where it lives.",
    }),
    defineField({
      name: "listed",
      title: "מוצג בקטלוג",
      type: "boolean",
      group: "identity",
      initialValue: true,
      description:
        "Hides a product from the /games grid without deleting it or touching its page. Purely a catalog-visibility " +
        "flag — it grants and revokes nothing, and has no bearing on who can access a game.",
    }),

    /* --------------------------------------------------------- marketing */
    defineField({ name: "tagline", title: "משפט מפתח", type: "string", group: "marketing" }),
    defineField({ name: "kicker", title: "תווית", type: "string", group: "marketing", description: 'e.g. "משחק דיגיטלי".' }),
    defineField({
      name: "description",
      title: "תיאור",
      type: "text",
      group: "marketing",
      rows: 3,
    }),
    defineField({
      name: "kind",
      title: "סוג",
      type: "string",
      group: "marketing",
      options: { list: GAME_KINDS.map((entry) => ({ title: entry.title, value: entry.value })) },
      description: "Drives the /games filter chips.",
    }),
    defineField({
      name: "price",
      title: "מחיר תצוגה (₪)",
      type: "number",
      group: "marketing",
      validation: (rule) => rule.min(0).custom((value, context) =>
        context.document?.listed !== false && value == null ? "Listed games must have a display price." : true,
      ),
      description:
        "DISPLAY ONLY — the number shown on the card. It does not authorize a charge and is not the source of " +
        "truth for what a customer is billed; payment stays with Grow and, later, Supabase.",
    }),
    defineField({
      name: "ctaLabel",
      title: "טקסט כפתור בקטלוג",
      type: "string",
      group: "marketing",
      description:
        'The button on the /games card (default "לפרטים"). Deliberately scoped to the catalog card: the buy ' +
        "buttons on a product's own landing page carry a price inside their label and cross-sell the other " +
        "products, so they stay in that page's markup rather than being pulled apart into fields.",
    }),
    defineField({
      name: "includedGames",
      title: "משחקים הכלולים בחבילה",
      type: "array",
      group: "marketing",
      of: [{ type: "reference", to: [{ type: "game" }] }],
      description:
        "For a bundle: which products it contains. Real product structure, so it belongs here rather than being " +
        "left implicit in the landing page's markup. Nothing renders it yet.",
    }),
    defineField({
      name: "marketingBody",
      title: "תוכן שיווקי",
      type: "array",
      group: "marketing",
      of: [{ type: "block" }],
      description:
        "Empty after the import. The current landing-page copy still lives in content/games/<slug>.html and is " +
        "rendered from there; moving it here is a later, separate step.",
    }),
    defineField({
      name: "legacyLandingPagePath",
      title: "Legacy landing page",
      type: "string",
      group: "marketing",
      readOnly: true,
      description: "Repository path of the HTML the site currently renders for this product.",
    }),

    /* ------------------------------------------------------------- media */
    defineField({
      name: "legacyImages",
      title: "Legacy images (/public)",
      type: "array",
      group: "media",
      of: [{ type: "legacyImage" }],
    }),
    defineField({
      name: "icon",
      title: "אייקון",
      type: "string",
      group: "media",
      description: "Decorative character shown when a product has no photo (e.g. ♜, ♡, ✦).",
    }),
    defineField({
      name: "themeClass",
      title: "Theme class",
      type: "string",
      group: "media",
      readOnly: true,
      description: "CSS class the existing card styling keys off (e.g. forest-card). Presentation detail, kept verbatim.",
    }),
    defineField({
      name: "gallery",
      title: "Gallery (Sanity assets)",
      type: "array",
      group: "media",
      of: [{ type: "image", options: { hotspot: true }, fields: [{ name: "alt", title: "Alt text", type: "string" }] }],
    }),

    /* --------------------------------------------------------------- SEO */
    defineField({ name: "seoTitle", title: "SEO title", type: "string", group: "seo" }),
    defineField({ name: "seoDescription", title: "SEO description", type: "text", rows: 3, group: "seo" }),
  ],

  preview: {
    select: { title: "title", subtitle: "tagline", price: "price" },
    prepare({ title, subtitle, price }) {
      return { title, subtitle: [subtitle, price ? `₪${price}` : null].filter(Boolean).join(" · ") };
    },
  },
});
