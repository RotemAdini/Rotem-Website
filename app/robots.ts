import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

/**
 * Everything a reader can browse stays crawlable — recipes, date ideas, games
 * and the rest of the public site are the whole point of the site being
 * indexed.
 *
 * The four disallowed prefixes are the ones that are never a useful search
 * result and should not be sitting in an index:
 *
 *   /studio    — the Sanity editing interface
 *   /dashboard — the signed-in reader's own page
 *   /account   — the signed-in reader's own page
 *   /auth      — the OAuth callback, which only ever means something mid-flow
 *
 * This is a crawling hint, not access control: those routes are protected by
 * their own auth checks, and robots.txt is read by well-behaved crawlers only.
 *
 * The sitemap line is what turns app/sitemap.ts from a file nobody requests
 * into the discovery path a crawler actually follows.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/studio", "/dashboard", "/account", "/auth"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
