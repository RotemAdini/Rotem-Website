import { defineField, defineType } from "sanity";

/**
 * One retired URL slug. Appended whenever an editor changes a document's slug,
 * so the route resolver can permanently redirect an old link to the current
 * one instead of 404ing. This is what makes a slug safely editable — see
 * reports/id-architecture-audit-2026-09-07.md section C.
 */
export const retiredSlug = defineType({
  name: "retiredSlug",
  title: "Retired slug",
  type: "object",
  fields: [
    defineField({ name: "slug", title: "Slug", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "retiredAt", title: "Retired at", type: "datetime" }),
  ],
  preview: {
    select: { title: "slug", subtitle: "retiredAt" },
  },
});

/**
 * A photo that currently lives in the repository under /public rather than in
 * Sanity's asset store.
 *
 * The migration deliberately does NOT upload the site's photos yet: the live
 * site still serves every image from /public, and re-hosting hundreds of files
 * is a separate, reversible-once decision. Recording the exact path here means
 * nothing is lost, the importer stays idempotent, and each document can be
 * upgraded to a real Sanity asset later without changing its contentId.
 */
export const legacyImage = defineType({
  name: "legacyImage",
  title: "Legacy image (served from /public)",
  type: "object",
  fields: [
    defineField({
      name: "path",
      title: "Repository path",
      type: "string",
      description: 'Path as stored in the current data, e.g. "images/recipes/sweet/honey-butter-toast/IMG_5881-web.JPEG".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "role",
      title: "Role",
      type: "string",
      options: {
        list: [
          { title: "Thumbnail (cards)", value: "thumbnail" },
          { title: "Main (detail hero)", value: "main" },
          { title: "Hero", value: "hero" },
          { title: "Gallery", value: "gallery" },
          { title: "Unpublished original", value: "new" },
        ],
      },
    }),
  ],
  preview: {
    select: { title: "path", subtitle: "role" },
  },
});

/** A video that exists on disk but that the current site has no way to show. */
export const legacyVideo = defineType({
  name: "legacyVideo",
  title: "Legacy video (served from /public)",
  type: "object",
  fields: [
    defineField({ name: "path", title: "Repository path", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "caption", title: "Caption", type: "string" }),
  ],
  preview: { select: { title: "path", subtitle: "caption" } },
});

/** Where a recipe's text originally came from (a Word document or a CSV row).
 * Pure provenance — carried over so the import loses nothing. */
export const sourceFileRef = defineType({
  name: "sourceFileRef",
  title: "Source file",
  type: "object",
  fields: [
    defineField({ name: "path", title: "Path", type: "string" }),
    defineField({ name: "type", title: "Type", type: "string" }),
    defineField({ name: "row", title: "Row", type: "number" }),
  ],
  preview: { select: { title: "path", subtitle: "type" } },
});

/** The cost / time / effort breakdown shown on a date-idea detail page. */
export const datePlan = defineType({
  name: "datePlan",
  title: "Date plan",
  type: "object",
  fields: [
    defineField({ name: "cost", title: "עלות", type: "string" }),
    defineField({ name: "duration", title: "משך", type: "string" }),
    defineField({
      name: "effort",
      title: "מאמץ (1-5)",
      type: "number",
      validation: (rule) => rule.min(1).max(5),
    }),
    defineField({ name: "needed", title: "מה צריך", type: "array", of: [{ type: "string" }] }),
    defineField({ name: "prepAhead", title: "הכנה מראש", type: "array", of: [{ type: "string" }] }),
    defineField({ name: "whatYouDo", title: "מה עושים", type: "text", rows: 4 }),
    defineField({ name: "note", title: "הערה אישית", type: "text", rows: 3 }),
  ],
});

export const objectTypes = [retiredSlug, legacyImage, legacyVideo, sourceFileRef, datePlan];
