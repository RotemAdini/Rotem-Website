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
 * The gate every public read carries.
 *
 * It lives here, as one constant threaded through every accessor, rather than
 * at the call sites: a single lookup that forgets it — a detail page, a static
 * param, a favourite token — is exactly how an unfinished idea reaches the
 * public site, and that is a mistake no reviewer reliably catches. There is
 * deliberately no accessor left that reads date ideas without it.
 *
 * Written as `!= false` rather than `== true` because an idea migrated before
 * the field existed has no value at all and must stay listed; `coalesce` is
 * not available in a filter expression.
 */
const LISTED = `listed != false`;

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

/**
 * The date ideas shown publicly — and, since there is no ungated accessor, the
 * only date ideas this site can read at all.
 *
 * Two independent gates keep an unfinished idea off the site, because either
 * one alone can be undone by an ordinary editorial action:
 *
 *   1. A Sanity draft is not readable through the token-less client this site
 *      uses, so an idea left as a draft cannot appear anywhere. That gate
 *      disappears the moment someone presses Publish in the Studio, which is
 *      why it is never relied on by itself.
 *   2. `listed` is the gate that survives publishing. An idea whose plan is
 *      still empty stays listed:false until its content is written.
 *
 * Ideas migrated before this field existed have no value and count as listed,
 * so the א׳-ב׳ run is unaffected. `needsRotemApproval` still does NOT hide
 * anything — the site has always shown those three items.
 */
export async function getListedDateIdeas(): Promise<SanityDateIdea[]> {
  return byDisplayOrder(await fetchDates(LISTED));
}

/**
 * One idea by its canonical slug, or null.
 *
 * An unlisted idea returns null, which is the same answer a slug that never
 * existed gets. The caller therefore cannot tell the two apart, and no title,
 * description, sourceUrl or image can leak through a direct request.
 */
export async function getDateIdeaByCanonicalSlug(slug: string): Promise<SanityDateIdea | null> {
  const [dateIdea] = await fetchDates(`${LISTED} && slug.current == $slug`, { slug });
  return dateIdea ?? null;
}

/** The slugs that get a prerendered route. An unlisted idea is absent, so it
 * is never built into a public page in the first place. */
export async function getAllDateSlugs(): Promise<string[]> {
  return getSanityClient().fetch<string[]>(
    `*[_type == "dateIdea" && defined(slug.current) && ${LISTED}].slug.current`,
  );
}

/** Up to `count` other ideas that have a photo, for the related strip — the
 * same rule the previous implementation used. */
export async function getRelatedDateIdeas(excludeContentId: string, count: number): Promise<SanityDateIdea[]> {
  const dates = await fetchDates(`${LISTED} && contentId != $excludeContentId && count(legacyImages) > 0`, {
    excludeContentId,
  });
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
 *
 * Both lookups are gated on `listed`, so an unlisted idea is "not-found" at
 * every one of them: its own slug 404s, and so does any legacy id pointing at
 * it, which would otherwise have redirected a visitor to a page that 404s
 * anyway while confirming the idea exists.
 */
export async function resolveDateRoute(segment: string): Promise<DateRouteResolution> {
  const canonical = await getDateIdeaByCanonicalSlug(segment);
  if (canonical) return { kind: "canonical", dateIdea: canonical };

  const [alias] = await fetchDates(
    `${LISTED} && slug.current != $segment && ($segment in slugHistory[].slug || $segment in legacyRouteIds)`,
    { segment },
  );
  if (!alias) return { kind: "not-found" };

  return {
    kind: "redirect",
    slug: alias.slug,
    reason: alias.slugHistory.includes(segment) ? "retired-slug" : "legacy-route-id",
  };
}
