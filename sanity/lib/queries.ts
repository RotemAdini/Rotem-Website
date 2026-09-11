import { defineQuery } from "next-sanity";

/**
 * GROQ for resolving a URL to a document, including the redirect cases.
 *
 * NOT USED BY THE SITE YET. Recipes, date ideas and games are still rendered
 * from data/recipes.json and lib/*.ts. These queries exist so that switching a
 * page over later is a rendering change with no data-layer design work left,
 * and so the redirect behaviour the ID architecture promises is demonstrably
 * expressible against the schema as imported.
 *
 * Resolution order, per reports/id-architecture-audit-2026-09-07.md:
 *   1. current slug            -> render
 *   2. a retired slug          -> 308 redirect to the current slug
 *   3. a legacy route segment  -> 308 redirect to the current slug
 *   4. otherwise               -> 404
 *
 * Steps 2 and 3 are the same query shape and are combined below, so one lookup
 * answers "is this URL stale, and if so what replaced it?".
 */

/** Step 1: the canonical lookup a page would use. */
export const documentBySlugQuery = defineQuery(`
  *[_type == $type && slug.current == $slug][0]
`);

/**
 * Steps 2 and 3: given a URL segment that is not a current slug, find the
 * document that used to own it — either as a retired slug or as one of the
 * pre-migration route ids — and return where it should redirect to.
 *
 * `legacyRouteIds` covers every URL the site serves today, including the 34
 * unsuitable recipe ids and the biscuit-cake-NN pages, so no existing link can
 * 404 after the switch.
 */
export const redirectTargetQuery = defineQuery(`
  *[
    _type == $type &&
    slug.current != $segment &&
    (
      $segment in slugHistory[].slug ||
      $segment in legacyRouteIds
    )
  ][0]{
    "contentId": contentId,
    "slug": slug.current,
    "reason": select(
      $segment in slugHistory[].slug => "retired-slug",
      "legacy-route-id"
    )
  }
`);

/**
 * The mapping Supabase's favourites migration will need: every localStorage
 * token in circulation, paired with the canonical id that owns it. Many-to-one
 * by design — a merged biscuit-cake card and its catalog recipe are one item.
 */
export const favouriteAliasQuery = defineQuery(`
  *[_type in ["recipe", "dateIdea", "game"] && count(legacyIds) > 0]{
    contentId,
    "contentType": _type,
    legacyIds
  }
`);

/* ------------------------------------------------------------- holidays */

/**
 * The planned "חגים" section: a circular filter per holiday, and clicking one
 * lists every recipe whose `holidays` array contains that value.
 *
 * `holidays` is a plain array of strings, so membership is a single `in`
 * check and a recipe can sit under several holidays at once without any join
 * table, reference or extra document type. That is also why adding a sixth
 * holiday needs no migration: these queries never enumerate the vocabulary,
 * they only ask what a given document holds.
 *
 * NOT USED BY THE SITE YET — the frontend for this is deliberately unbuilt.
 */

/** Every listed recipe for one holiday, e.g. $holiday == "pesach". */
export const recipesByHolidayQuery = defineQuery(`
  *[_type == "recipe" && listed == true && status == "COMPLETE" && $holiday in holidays]
  | order(title asc){
    contentId,
    title,
    "slug": slug.current,
    siteCategory,
    categorySlug,
    holidays,
    "image": legacyImages[0].path
  }
`);

/**
 * Every holiday value currently in use, one entry per recipe that carries it —
 * tally it caller-side to decide which circles the חגים section should render,
 * so a holiday with no recipes yet does not become a dead end.
 *
 * Deliberately a flat list of stored values rather than a per-holiday
 * projection: it stays correct when a sixth holiday is added, because it never
 * names one. The Hebrew label for each value comes from
 * RECIPE_HOLIDAY_TITLES in sanity/schemaTypes/taxonomy.ts, which is why a label
 * can be reworded without touching a single document.
 */
export const holidayUsageQuery = defineQuery(`
  *[_type == "recipe" && listed == true && status == "COMPLETE"].holidays[]
`);

/** The editorial backlog: reviewed recipes still carrying no holiday at all. */
export const recipesWithoutHolidaysQuery = defineQuery(`
  count(*[
    _type == "recipe" &&
    status == "COMPLETE" &&
    (!defined(holidays) || count(holidays) == 0)
  ])
`);
