import type { NextConfig } from "next";

/**
 * Every retired recipe and date URL, as a real routing-layer redirect.
 *
 * Why this cannot live in the page. `/recipes/[slug]` and `/dates/[slug]` are
 * statically generated, and `generateStaticParams` returns only the canonical
 * slugs — an alias is therefore an unknown param, which Next renders on demand
 * in a *prerender* context. `permanentRedirect()` inside a prerender cannot set
 * an HTTP status, so it degrades into a 200 carrying
 * `<meta http-equiv="refresh">`, which Next then caches for a year. Verified on
 * a cold server: the first, uncached request already answered 200 with
 * `x-nextjs-prerender: 1`.
 *
 * A redirect declared here runs before the page renders, so the alias answers
 * with a genuine 308 and the canonical pages stay SSG. The pages' own
 * `resolveRecipeRoute()` / `resolveDateRoute()` redirect branches are
 * deliberately left in place as the safety net: they still cover anything
 * retired after the last build.
 *
 * The list is a build-time snapshot, which is the same freshness contract the
 * statically generated pages already have.
 */

interface AliasRow {
  slug: string;
  aliases: string[];
}

/**
 * Reads one content type's canonical slugs and the aliases that must redirect
 * to them, and turns them into 308s under `basePath`.
 *
 * `listedOnly` gates the read the same way the site's own data layer does. An
 * unlisted idea must not be reachable at any URL, so its legacy ids are not
 * given a redirect either — a 308 to a page that then 404s would still confirm
 * the idea exists, which is the thing `listed:false` is there to prevent.
 */
async function legacyRedirects(options: {
  type: string;
  basePath: string;
  label: string;
  listedOnly?: boolean;
}): Promise<{ source: string; destination: string; permanent: true }[]> {
  const { type, basePath, label, listedOnly = false } = options;
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-09-07";
  if (!projectId) {
    console.warn(`[redirects] NEXT_PUBLIC_SANITY_PROJECT_ID is unset — no legacy ${label} redirects generated.`);
    return [];
  }

  // Both alias kinds the route resolvers honour: slugs retired into
  // slugHistory, and pre-migration route ids.
  const query = `*[_type == "${type}" && defined(slug.current)${listedOnly ? " && listed != false" : ""}]{
    "slug": slug.current,
    "aliases": coalesce(slugHistory[].slug, []) + coalesce(legacyRouteIds, [])
  }`;
  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${encodeURIComponent(query)}`;

  let rows: AliasRow[];
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`Sanity responded ${res.status}`);
    rows = (await res.json()).result ?? [];
  } catch (error) {
    // Never fail the build over this. The page-level redirect still answers
    // these URLs; they just answer with the meta refresh until the next build.
    console.warn(`[redirects] could not read legacy ${label} slugs (${String(error)}) — none generated.`);
    return [];
  }

  const canonical = new Set(rows.map((row) => row.slug));
  const seen = new Set<string>();
  const redirects: { source: string; destination: string; permanent: true }[] = [];

  for (const row of rows) {
    for (const alias of row.aliases ?? []) {
      // A live slug must never be redirected away from its own page, and one
      // alias must resolve to exactly one destination. Together these are what
      // makes a redirect loop impossible.
      if (!alias || canonical.has(alias) || seen.has(alias)) continue;
      seen.add(alias);
      redirects.push({
        // `source` is matched against the raw, percent-encoded pathname, so a
        // Hebrew alias written literally never matches — measured: all 141
        // ASCII recipe aliases redirected and all 35 Hebrew ones fell through
        // to the page. Encoding leaves the ASCII ones byte-identical, which is
        // what the thirteen numeric date ids are. `destination` is the
        // opposite: Next encodes it on the way into Location.
        source: `${basePath}/${encodeURIComponent(alias)}`,
        destination: `${basePath}/${row.slug}`,
        permanent: true,
      });
    }
  }
  console.log(`[redirects] ${redirects.length} legacy ${label} URL(s) -> 308`);
  return redirects;
}

const nextConfig: NextConfig = {
  async redirects() {
    const [recipes, dates] = await Promise.all([
      legacyRedirects({ type: "recipe", basePath: "/recipes", label: "recipe" }),
      // Dates are gated on `listed`; recipes are not, because the recipe layer
      // has always served every published recipe.
      legacyRedirects({ type: "dateIdea", basePath: "/dates", label: "date", listedOnly: true }),
    ]);
    return [...recipes, ...dates];
  },
};

export default nextConfig;
