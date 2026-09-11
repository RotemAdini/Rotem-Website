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
  seriesPosition: number | null;
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
  seriesPosition,
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

/** Series order, which is the order the board and the homepage have always
 * shown these in. */
function bySeriesPosition(dates: SanityDateIdea[]): SanityDateIdea[] {
  return [...dates].sort((a, b) => (a.seriesPosition ?? 0) - (b.seriesPosition ?? 0));
}

/* ------------------------------------------------------------- accessors */

export async function getAllDateIdeas(): Promise<SanityDateIdea[]> {
  return bySeriesPosition(await fetchDates("true"));
}

/**
 * The date ideas shown publicly.
 *
 * The previous implementation showed every item in lib/date-series.ts with no
 * filter at all, so this is deliberately the same set as getAllDateIdeas().
 * It exists as a named seam for when a publication rule is decided; adding a
 * condition here must be an explicit decision, not a side effect of this
 * migration. `needsRotemApproval` in particular does NOT hide anything — the
 * current site shows those three items.
 */
export async function getListedDateIdeas(): Promise<SanityDateIdea[]> {
  return getAllDateIdeas();
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
  const dates = await fetchDates("contentId != $excludeContentId && count(legacyImages) > 0", { excludeContentId });
  return bySeriesPosition(dates).slice(0, count);
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
