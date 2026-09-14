import "server-only";

import { getSanityClient } from "@/sanity/lib/client";

/**
 * The date-idea data layer, backed by Sanity.
 *
 * Server-only, like the recipe layer: importing it from a Client Component is
 * a build error, and reads use the public dataset with no token.
 *
 * Video is deliberately not part of the projection. The schema has a `videos`
 * field and no date idea uses it; this migration neither reads, renders nor
 * models it.
 *
 * The previous local implementation stays on disk untouched in
 * lib/date-series.ts and lib/date-board.ts. Nothing imports them any more;
 * they are the reference for what this layer must reproduce.
 */

export interface SanityDateImage {
  path: string;
  /** main | gallery — see sanity/schemaTypes/objects.ts. */
  role: string | null;
}

export interface SanityDatePlan {
  cost: string | null;
  duration: string | null;
  effort: number | null;
  needed: string[];
  prepAhead: string[];
  whatYouDo: string | null;
  note: string | null;
}

export interface SanityDateIdea {
  seoTitle: string | null;
  seoDescription: string | null;
  contentId: string;
  title: string;
  slug: string;
  slugHistory: string[];
  legacyIds: string[];
  legacyRouteIds: string[];
  /** The editorial series this idea belongs to, or null for a standalone one.
   * Null is a complete state, not a missing value. */
  seriesKey: string | null;
  /** Position inside seriesKey. Null whenever seriesKey is null — a standalone
   * idea is deliberately given no number rather than a fabricated one. */
  seriesPosition: number | null;
  /** False hides the idea from /dates, the homepage and search while its
   * content is still being written. Absent counts as listed. */
  listed: boolean;
  description: string | null;
  place: string | null;
  budgetRange: string | null;
  plan: SanityDatePlan | null;
  images: SanityDateImage[];
  /** Carried through untouched. Nothing renders it; it exists so the editorial
   * caveat recorded during the migration is not lost. */
  needsRotemApproval: boolean;
  reviewNote: string | null;
}

const DATE_FIELDS = /* groq */ `{
  seoTitle,
  seoDescription,
  contentId,
  title,
  "slug": slug.current,
  "slugHistory": coalesce(slugHistory[].slug, []),
  "legacyIds": coalesce(legacyIds, []),
  "legacyRouteIds": coalesce(legacyRouteIds, []),
  seriesKey,
  seriesPosition,
  "listed": coalesce(listed, true),
  description,
  place,
  budgetRange,
  plan{
    cost,
    duration,
    effort,
    "needed": coalesce(needed, []),
    "prepAhead": coalesce(prepAhead, []),
    whatYouDo,
    note
  },
  "images": coalesce(legacyImages[]{path, role}, []),
  "needsRotemApproval": coalesce(needsRotemApproval, false),
  reviewNote
}`;

async function fetchDates(filter: string, params: Record<string, unknown> = {}): Promise<SanityDateIdea[]> {
  return getSanityClient().fetch<SanityDateIdea[]>(`*[_type == "dateIdea" && ${filter}] ${DATE_FIELDS}`, params);
}

/**
 * Series instalments first, in their own order, then standalone ideas.
 *
 * Sorting by `seriesPosition ?? 0` would have given every standalone idea the
 * same position 0 and floated them above instalment #1 in an arbitrary order.
 * A standalone idea has no position by design, so it is ordered by title
 * instead — stable, and it never disturbs the series order the board and the
 * homepage have always shown.
 */
function byDisplayOrder(dates: SanityDateIdea[]): SanityDateIdea[] {
  return [...dates].sort((a, b) => {
    const aSeries = Boolean(a.seriesKey), bSeries = Boolean(b.seriesKey);
    if (aSeries !== bSeries) return aSeries ? -1 : 1;
    if (aSeries && bSeries) return (a.seriesPosition ?? 0) - (b.seriesPosition ?? 0);
    return a.title.localeCompare(b.title, "he");
  });
}

/* ------------------------------------------------------------- accessors */

export async function getAllDateIdeas(): Promise<SanityDateIdea[]> {
  return byDisplayOrder(await fetchDates("true"));
}

/**
 * The date ideas shown publicly.
 *
 * Two independent gates keep an unfinished idea off the site, because either
 * one alone can be undone by an ordinary editorial action:
 *
 *   1. A Sanity draft is not readable through the token-less client this site
 *      uses, so an idea left as a draft cannot appear anywhere. That gate
 *      disappears the moment someone presses Publish in the Studio.
 *   2. `listed` is the gate that survives publishing. An idea whose plan is
 *      still empty stays listed:false until its content is written.
 *
 * Ideas migrated before this field existed have no value and count as listed,
 * so the א׳-ב׳ run is unaffected. `needsRotemApproval` still does NOT hide
 * anything — the site has always shown those three items.
 */
export async function getListedDateIdeas(): Promise<SanityDateIdea[]> {
  return byDisplayOrder(await fetchDates("listed != false"));
}

export async function getDateIdeaByCanonicalSlug(slug: string): Promise<SanityDateIdea | null> {
  const [dateIdea] = await fetchDates("slug.current == $slug", { slug });
  return dateIdea ?? null;
}

export async function getAllDateSlugs(): Promise<string[]> {
  return getSanityClient().fetch<string[]>(`*[_type == "dateIdea" && defined(slug.current)].slug.current`);
}

/** Up to `count` other ideas that have a photo, for the "more from the
 * series" strip — the same rule the previous implementation used. */
export async function getRelatedDateIdeas(excludeContentId: string, count: number): Promise<SanityDateIdea[]> {
  const dates = await fetchDates("contentId != $excludeContentId && listed != false && count(legacyImages) > 0", { excludeContentId });
  return byDisplayOrder(dates).slice(0, count);
}

/* ------------------------------------------------------ route resolution */

export type DateRouteResolution =
  | { kind: "canonical"; dateIdea: SanityDateIdea }
  | { kind: "redirect"; slug: string; reason: "retired-slug" | "legacy-route-id" }
  | { kind: "not-found" };

/**
 * Resolves one /dates/<segment> URL:
 *
 *   1. the current canonical slug        -> render
 *   2. a slug retired into slugHistory   -> permanent redirect
 *   3. a pre-migration route id ("01")   -> permanent redirect
 *   4. otherwise                         -> 404
 */
export async function resolveDateRoute(segment: string): Promise<DateRouteResolution> {
  const canonical = await getDateIdeaByCanonicalSlug(segment);
  if (canonical) return { kind: "canonical", dateIdea: canonical };

  const [alias] = await fetchDates(
    "slug.current != $segment && ($segment in slugHistory[].slug || $segment in legacyRouteIds)",
    { segment },
  );
  if (!alias) return { kind: "not-found" };

  return {
    kind: "redirect",
    slug: alias.slug,
    reason: alias.slugHistory.includes(segment) ? "retired-slug" : "legacy-route-id",
  };
}
