import type { NextConfig } from "next";

/**
 * Every retired recipe URL, as a real routing-layer redirect.
 *
 * Why this cannot live in the page. `/recipes/[slug]` is statically generated,
 * and `generateStaticParams` returns only the 159 canonical slugs — an alias is
 * therefore an unknown param, which Next renders on demand in a *prerender*
 * context. `permanentRedirect()` inside a prerender cannot set an HTTP status,
 * so it degrades into a 200 carrying `<meta http-equiv="refresh">`, which Next
 * then caches for a year. Verified on a cold server: the first, uncached
 * request already answered 200 with `x-nextjs-prerender: 1`.
 *
 * A redirect declared here runs before the page renders, so the alias answers
 * with a genuine 308 and the canonical pages stay SSG. The page's own
 * `resolveRecipeRoute()` redirect branch is deliberately left in place as the
 * safety net: it still covers anything retired after the last build.
 *
 * The list is a build-time snapshot, which is the same freshness contract the
 * statically generated recipe pages already have.
 */
async function legacyRecipeRedirects() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-09-07";
  if (!projectId) {
    console.warn("[redirects] NEXT_PUBLIC_SANITY_PROJECT_ID is unset — no legacy recipe redirects generated.");
    return [];
  }

  // Both alias kinds the route resolver honours: slugs retired into
  // slugHistory, and pre-migration route ids.
  const query = `*[_type == "recipe" && defined(slug.current)]{
    "slug": slug.current,
    "aliases": coalesce(slugHistory[].slug, []) + coalesce(legacyRouteIds, [])
  }`;
  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${encodeURIComponent(query)}`;

  let rows: { slug: string; aliases: string[] }[];
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`Sanity responded ${res.status}`);
    rows = (await res.json()).result ?? [];
  } catch (error) {
    // Never fail the build over this. The page-level redirect still answers
    // these URLs; they just answer with the meta refresh until the next build.
    console.warn(`[redirects] could not read legacy recipe slugs (${String(error)}) — none generated.`);
    return [];
  }

  const canonical = new Set(rows.map((row) => row.slug));
  const seen = new Set<string>();
  const redirects: { source: string; destination: string; permanent: true }[] = [];

  for (const row of rows) {
    for (const alias of row.aliases ?? []) {
      // A live slug must never be redirected away from its own page, and one
      // alias must resolve to exactly one destination.
      if (!alias || canonical.has(alias) || seen.has(alias)) continue;
      seen.add(alias);
      redirects.push({
        // `source` is matched against the raw, percent-encoded pathname, so a
        // Hebrew alias written literally never matches — measured: all 141
        // ASCII aliases redirected and all 35 Hebrew ones fell through to the
        // page. Encoding leaves the ASCII ones byte-identical. `destination`
        // is the opposite: Next encodes it on the way into Location.
        source: `/recipes/${encodeURIComponent(alias)}`,
        destination: `/recipes/${row.slug}`,
        permanent: true,
      });
    }
  }
  console.log(`[redirects] ${redirects.length} legacy recipe URL(s) -> 308`);
  return redirects;
}

const nextConfig: NextConfig = {
  async redirects() {
    return legacyRecipeRedirects();
  },
};

export default nextConfig;
