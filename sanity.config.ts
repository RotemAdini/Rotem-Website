"use client";

/**
 * Sanity Studio configuration, mounted inside this Next.js app at /studio.
 *
 * The Studio is embedded rather than deployed separately so there is one
 * repository, one deploy and one set of environment variables to manage.
 * The site itself does not read from Sanity yet — see sanity/lib/client.ts.
 */

import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";

import { createPublishWithSlugHistory } from "./sanity/actions/publishWithSlugHistory";
import { apiVersion, dataset, projectId } from "./sanity/env";
import { schemaTypes } from "./sanity/schemaTypes";

/** Document types that carry a slug and therefore need slug-history handling. */
const SLUGGED_TYPES = ["recipe", "dateIdea", "game"];

export default defineConfig({
  name: "rotem-adini",
  title: "רותם עדיני",
  basePath: "/studio",
  projectId,
  dataset,
  schema: {
    types: schemaTypes,
    // These types require manifest-assigned canonical IDs. Keep editing
    // existing documents available without offering unpublishable new ones.
    templates: (templates) => templates.filter((template) => !SLUGGED_TYPES.includes(template.schemaType)),
  },
  plugins: [structureTool(), visionTool({ defaultApiVersion: apiVersion })],
  document: {
    actions: (previousActions, context) => {
      if (!SLUGGED_TYPES.includes(context.schemaType)) return previousActions;

      return (
        previousActions
          // contentId is the permanent link between a Sanity document and a
          // Supabase favourite. Duplicating a document would copy it and
          // silently create two documents claiming the same canonical id.
          .filter((action) => action.action !== "duplicate")
          // Changing a published slug retires the old one into slugHistory in
          // the same publish, so the previous URL keeps resolving.
          .map((action) => (action.action === "publish" ? createPublishWithSlugHistory(action) : action))
      );
    },
  },
});
