import type { MetadataRoute } from "next";

import { getSanityClient } from "@/sanity/lib/client";
import { absoluteUrl } from "@/lib/seo";

/**
 * The site's XML sitemap, served at /sitemap.xml and pointed at from
 * robots.txt.
 *
 * What it lists is exactly what the site is willing to have indexed: the
 * homepage, the four hub pages, the informational pages, every listed recipe
 * and every listed date idea. What it leaves out is as deliberate:
 *
 *   /search, /favorites        thin or per-reader; nothing stable to index
 *   /account, /dashboard,      already disallowed in robots.txt
 *   /studio, /auth
 *   /gifts                     behind FEATURES.gifts, answers 404 today
 *   /checkout, /game, /play    redirect-only legacy stand-ins
 *   legacy recipe/date aliases they 308 to the canonical URL, which is here
 *
 * `listed` is read the same way each content type's own data layer reads it,
 * so an unlisted item cannot appear here even though this file does its own
 * query: recipes are `listed == true`, dates and games are `listed != false`
 * (the field postdates their import, and an absent value means listed).
 */

interface SitemapRow {
  slug: string;
  updatedAt: string;
}

/** Sanity being unreachable must not fail a production build. A sitemap that
 * is missing a section is recoverable on the next deploy; a build that does
 * not finish is not. */
async function rows(filter: string, label: string): Promise<SitemapRow[]> {
  try {
    return await getSanityClient().fetch<SitemapRow[]>(
      `*[${filter} && defined(slug.current)]{"slug": slug.current, "updatedAt": _updatedAt}`,
    );
  } catch (error) {
    console.warn(`[sitemap] could not read ${label} (${String(error)}) — section omitted.`);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [recipes, dates, games] = await Promise.all([
    rows(`_type == "recipe" && listed == true`, "recipes"),
    rows(`_type == "dateIdea" && listed != false`, "date ideas"),
    rows(`_type == "game" && listed != false`, "games"),
  ]);

  const newest = (list: SitemapRow[]): Date | undefined => {
    const times = list.map((row) => Date.parse(row.updatedAt)).filter((time) => Number.isFinite(time));
    return times.length ? new Date(Math.max(...times)) : undefined;
  };

  const entry = (
    path: string,
    priority: number,
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
    lastModified?: Date | string,
  ): MetadataRoute.Sitemap[number] => ({
    url: absoluteUrl(path),
    priority,
    changeFrequency,
    ...(lastModified ? { lastModified } : {}),
  });

  return [
    entry("/", 1, "weekly", newest([...recipes, ...dates])),

    // Hubs. These change whenever anything under them does.
    entry("/recipes", 0.9, "weekly", newest(recipes)),
    entry("/dates", 0.9, "weekly", newest(dates)),
    entry("/games", 0.9, "monthly", newest(games)),

    ...recipes.map((row) => entry(`/recipes/${row.slug}`, 0.8, "monthly", row.updatedAt)),
    ...dates.map((row) => entry(`/dates/${row.slug}`, 0.7, "monthly", row.updatedAt)),
    // A game's public page is /games/<slug>; "bundle" is one of them.
    ...games.map((row) => entry(`/games/${row.slug}`, 0.8, "monthly", row.updatedAt)),

    entry("/about", 0.5, "yearly"),
    entry("/faq", 0.5, "yearly"),
    entry("/contact", 0.4, "yearly"),
    entry("/privacy", 0.2, "yearly"),
    entry("/terms", 0.2, "yearly"),
    entry("/accessibility", 0.2, "yearly"),
  ];
}
