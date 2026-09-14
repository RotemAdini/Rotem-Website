import type { SanityDateIdea } from "./dates";
import type { DateBoardCard, DateBudget, DatePlace, DatePlan, FavoriteEntry, SearchResult } from "@/lib/types";
import { toPublicPath } from "@/lib/recipe-text";

/**
 * Pure mappings from a Sanity date idea to the shapes the existing UI renders.
 *
 * The reference for every rule is lib/date-board.ts and app/dates/[id]/page.tsx
 * as they were before the switch — both still on disk. The goal is the same
 * card, the same copy and the same favourite token as before.
 */

/** The Hebrew label for each editorial series, and the blurb the board shows
 * under a title when the idea has no description of its own. A standalone idea
 * gets neither: claiming it came from a series it is not in would be wrong. */
const SERIES_LABELS: Record<string, string> = { "date-a-b": "סדרת הא-ב" };
const SERIES_BLURBS: Record<string, string> = { "date-a-b": "מסדרת הדייטים א׳-ב׳" };

/** The filter value a card carries. Standalone is a real, selectable value,
 * not the absence of one. */
export const STANDALONE_SERIES = "standalone";

export function dateSeriesValue(dateIdea: SanityDateIdea): string {
  return dateIdea.seriesKey || STANDALONE_SERIES;
}

export function dateSeriesLabel(seriesValue: string): string {
  return SERIES_LABELS[seriesValue] ?? "דייט בודד";
}

/** The chip on a card: the series an idea is in, or what a standalone idea
 * is. One helper so every card that renders a chip — the board, the related
 * strip — says the same thing about the same idea. */
export function dateTag(dateIdea: SanityDateIdea): string {
  return dateIdea.seriesKey ? "סדרה" : "דייט בודד";
}

/** The heading over the related strip on a detail page.
 *
 * "עוד רעיונות מהסדרה" is kept for an idea that really is in a series, which
 * is every one of the thirteen א׳-ב׳ instalments, so their pages read exactly
 * as they did. A standalone idea gets the neutral wording instead of being
 * made to introduce a series it does not belong to. */
export function dateRelatedHeading(dateIdea: SanityDateIdea): string {
  return dateIdea.seriesKey ? "עוד רעיונות מהסדרה ♡" : "עוד רעיונות לדייטים ♡";
}

/* --------------------------------------------------------------- images */

/** The card photo: the item's lead image. */
export function dateCardImage(dateIdea: SanityDateIdea): string | null {
  const main = dateIdea.images.find((image) => image.role === "main") ?? dateIdea.images[0];
  return toPublicPath(main?.path ?? null);
}

/**
 * The detail page's click-to-swap gallery: every distinct photo, in stored
 * order.
 *
 * A date idea may legitimately have several different photos — five, in one
 * case — and that gallery is content. Only an exact repeat of the same path
 * is dropped; nothing is collapsed.
 */
export function dateGalleryImages(dateIdea: SanityDateIdea): string[] {
  return dateIdea.images
    .map((image) => toPublicPath(image.path))
    .filter((src, index, all): src is string => Boolean(src) && all.indexOf(src) === index);
}

/* ------------------------------------------------------------ behaviour */

/** The favourite token this item must answer to — `date-a-b-NN`, exactly what
 * the previous implementation wrote to localStorage. */
export function dateFavoriteId(dateIdea: SanityDateIdea): string {
  return dateIdea.legacyIds[0] ?? `date-${dateIdea.contentId}`;
}

export function dateHref(dateIdea: SanityDateIdea): string {
  return `/dates/${dateIdea.slug}`;
}

/** "רעיון #07" for a series instalment; a standalone idea has no number and
 * is labelled by what it is instead of being given a position it lacks. */
export function dateFooterLabel(dateIdea: SanityDateIdea): string {
  const position = dateIdea.seriesPosition;
  if (dateIdea.seriesKey && position) return `רעיון #${String(position).padStart(2, "0")}`;
  return "רעיון לדייט";
}

export function dateDescription(dateIdea: SanityDateIdea): string {
  const own = dateIdea.description?.trim();
  if (own) return own;
  return (dateIdea.seriesKey && SERIES_BLURBS[dateIdea.seriesKey]) || "";
}

/** The plan object the existing DatePlanPanel renders, with Sanity's nulls
 * mapped back to the optional fields that component expects. */
export function datePlan(dateIdea: SanityDateIdea): DatePlan | null {
  const plan = dateIdea.plan;
  if (!plan) return null;
  return {
    cost: plan.cost ?? undefined,
    duration: plan.duration ?? undefined,
    effort: plan.effort ?? undefined,
    needed: plan.needed,
    prepAhead: plan.prepAhead,
    whatYouDo: plan.whatYouDo ?? undefined,
    note: plan.note ?? undefined,
  };
}

/* ----------------------------------------------------------- board cards */

export function toDateBoardCard(dateIdea: SanityDateIdea): DateBoardCard {
  return {
    key: dateIdea.contentId,
    href: dateHref(dateIdea),
    title: dateIdea.title,
    image: dateCardImage(dateIdea),
    favoriteId: dateFavoriteId(dateIdea),
    favoriteAliases: dateIdea.legacyIds,
    tag: dateTag(dateIdea),
    description: dateDescription(dateIdea),
    footerLabel: dateFooterLabel(dateIdea),
    // Only a real series instalment claims the series words. A standalone idea
    // that matched "סדרת דייטים א ב" would answer a search it has nothing to do with.
    search: `${dateIdea.title} דייט רעיון לדייט${dateIdea.seriesKey ? " סדרת דייטים א ב" : ""}`,
    // Read from the date's own audited range. Undecided stays "unknown" so
    // the card appears under no budget chip instead of a guessed one.
    budget: (dateIdea.budgetRange as DateBudget) || "unknown",
    place: (dateIdea.place as DatePlace) || "outside",
    // The board's duration chip has never been backed by real data; every card
    // has always been "medium". Kept as-is so the filter behaves identically.
    duration: "medium",
    series: dateSeriesValue(dateIdea),
  };
}

/* ------------------------------------------------------------ favorites */

/** token -> entry for every favourite token this date idea answers to. */
export function toDateFavoriteEntries(dateIdea: SanityDateIdea): Record<string, FavoriteEntry> {
  const entries: Record<string, FavoriteEntry> = {};
  for (const token of new Set([dateFavoriteId(dateIdea), ...dateIdea.legacyIds])) {
    entries[token] = {
      contentId: dateIdea.contentId,
      type: "date",
      title: dateIdea.title,
      meta:
        dateIdea.seriesKey && dateIdea.seriesPosition
          ? `${dateSeriesLabel(dateIdea.seriesKey)} · #${String(dateIdea.seriesPosition).padStart(2, "0")}`
          : "רעיון לדייט",
      href: dateHref(dateIdea),
      image: dateCardImage(dateIdea),
    };
  }
  return entries;
}

/* --------------------------------------------------------------- search */

export function toDateSearchResult(dateIdea: SanityDateIdea): SearchResult {
  // Only the title used to be searchable, so the words a reader would actually
  // type — "דייט בבית", "רעיון זוגי" — found nothing at all. place and budget
  // are stored as English slugs, so they are mapped to the Hebrew the filter
  // bar already shows rather than indexed raw.
  const PLACE_WORDS: Record<string, string> = { home: "בבית", outside: "בחוץ" };
  const BUDGET_WORDS: Record<string, string> = {
    free: "חינם בחינם ללא עלות תקציב קטן",
    upto100: "תקציב קטן זול עד 100",
    "100to250": "תקציב בינוני",
    "250plus": "מושקע יקר",
  };
  const keywords = [
    "דייט רעיון לדייט זוגי זוגיות ערב",
    dateIdea.description || "",
    PLACE_WORDS[dateIdea.place || ""] || "",
    BUDGET_WORDS[dateIdea.budgetRange || ""] || "",
  ]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  return {
    type: "date",
    typeLabel: "דייט",
    title: dateIdea.title,
    // The series line only for an idea that is actually in one.
    meta: dateDescription(dateIdea) || "רעיון לדייט",
    href: dateHref(dateIdea),
    image: dateCardImage(dateIdea),
    search: `${dateIdea.title} ${keywords}`.toLowerCase(),
    keywords,
  };
}
