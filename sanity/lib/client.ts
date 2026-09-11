import { createClient, type SanityClient } from "next-sanity";

import { apiVersion, dataset, requireProjectId } from "../env";

/**
 * Read-only Sanity client for the website.
 *
 * NOTHING IN THE SITE USES THIS YET — recipes, dates and games are still read
 * from data/recipes.json and lib/*.ts exactly as before. It exists so the
 * eventual switch is a page-by-page change with no setup work left to do.
 *
 * Created lazily rather than at module load so that importing this file in an
 * environment without Sanity configured (a fresh clone, CI) fails only if the
 * client is actually used, with a message that says what to do about it.
 *
 * `useCdn: false` because every page that will eventually consume this is
 * statically generated at build time, where the CDN's cached copy would only
 * add staleness.
 */
let client: SanityClient | null = null;

export function getSanityClient(): SanityClient {
  if (!client) {
    client = createClient({
      projectId: requireProjectId(),
      dataset,
      apiVersion,
      useCdn: false,
      perspective: "published",
    });
  }
  return client;
}
