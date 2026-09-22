import type { NextConfig } from "next";

/**
 * Every retired recipe and date URL, as a real routing-layer redirect.
 *
 * Why this cannot live in the page. `/recipes/[slug]` and `/dates/[slug]` are
 * statically generated, and `generateStaticParams` returns only the canonical
 * slugs, so an alias is an unknown param. Both routes now set
 * `dynamicParams = false`, which makes an unknown param a real 404 — so
 * without this list every legacy URL would simply 404.
 *
 * Before `dynamicParams = false`, an unknown param was rendered on demand in
 * a *prerender* context, where `permanentRedirect()` cannot set an HTTP
 * status: it degraded into a 200 carrying `<meta http-equiv="refresh">`,
 * cached for a year. Verified on a cold server — the first, uncached request
 * already answered 200 with `x-nextjs-prerender: 1`. Either way, this list is
 * the only thing that gives a legacy URL a genuine 308.
 *
 * The pages' own `resolveRecipeRoute()` / `resolveDateRoute()` redirect
 * branches are kept, but they are now build-time only and no longer act as a
 * runtime safety net: a slug retired after the last build 404s until the next
 * deploy, the same freshness contract the statically generated pages have.
 */

interface AliasRow {
  slug: string;
  aliases: string[];
}

/**
 * Reads one content type's canonical slugs and the aliases that must redirect
 * to them, and turns them into 308s under `basePath`.
 *
 * `listedFilter` must be the exact GROQ the matching data-layer module uses
 * to gate its own reads — `listed == true` for recipes (lib/sanity/recipes.ts)
 * and `listed != false` for date ideas (lib/sanity/dates.ts), which differ
 * because the two fields have different histories. Passing the expression
 * rather than a boolean is deliberate: a redirect generated for an item the
 * data layer will not serve is a 308 to a page that then 404s, which still
 * confirms the item exists — the thing `listed:false` is there to prevent.
 */
async function legacyRedirects(options: {
  type: string;
  basePath: string;
  label: string;
  listedFilter: string;
}): Promise<{ source: string; destination: string; permanent: true }[]> {
  const { type, basePath, label, listedFilter } = options;
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-09-07";
  if (!projectId) {
    console.warn(`[redirects] NEXT_PUBLIC_SANITY_PROJECT_ID is unset — no legacy ${label} redirects generated.`);
    return [];
  }

  // Both alias kinds the route resolvers honour: slugs retired into
  // slugHistory, and pre-migration route ids.
  const query = `*[_type == "${type}" && defined(slug.current) && ${listedFilter}]{
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

/**
 * The three retired stand-in routes.
 *
 * /checkout, /game and /play were pages for a demo product that never
 * existed. Their route files still call permanentRedirect() as the fallback,
 * but a redirect called from a *statically generated* page cannot set an HTTP
 * status — it degrades into a 200 carrying a meta refresh, exactly as
 * documented above for the alias slugs. Declared here they answer with a real
 * 308 and never render at all.
 */
const retiredRoutes = ["/checkout", "/game", "/play"].map((source) => ({
  source,
  destination: "/games",
  permanent: true as const,
}));

const nextConfig: NextConfig = {
  async redirects() {
    // Both types are gated on `listed` now. For recipes this is new: the
    // flag used to mean "duplicate of another post" and an unlisted recipe
    // stayed reachable at its own URL, so its aliases were still worth
    // redirecting. It is now the publication gate for recipes as well as
    // dates. Each filter is copied from that type's own data layer so the
    // two can never disagree about what is public.
    const [recipes, dates] = await Promise.all([
      legacyRedirects({ type: "recipe", basePath: "/recipes", label: "recipe", listedFilter: "listed == true" }),
      legacyRedirects({ type: "dateIdea", basePath: "/dates", label: "date", listedFilter: "listed != false" }),
    ]);
    return [...recipes, ...dates, ...retiredRoutes];
  },

  /**
   * Baseline privacy and security headers, applied to every route.
   *
   * The one that earns its place on privacy grounds is Referrer-Policy. The
   * game pages POST to an external mailing provider and every page links out
   * to Google Fonts, and without this the browser hands each of them the full
   * URL of the page the visitor was on. `strict-origin-when-cross-origin`
   * narrows that to the bare origin for any cross-origin request while
   * leaving same-origin navigation untouched.
   *
   * Two headers are deliberately NOT set here:
   *
   *   - Content-Security-Policy. The game pages are injected verbatim with
   *     dangerouslySetInnerHTML and carry inline style attributes, and
   *     /studio is a third-party SPA. A policy strict enough to be worth
   *     having would need per-route work and real testing, which is its own
   *     task rather than a rider on this one.
   *   - Strict-Transport-Security. It is the right thing to have, but it
   *     commits the domain (and any subdomain, depending on the directive)
   *     to HTTPS for the full max-age with no quick way back. That belongs
   *     to Netlify's own configuration and to a deliberate decision, not to
   *     a default added in passing.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Nothing on this site uses any of these, so they are switched off
          // rather than left to the browser default.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
