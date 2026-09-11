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

/** The fixed line the board has always shown under a date's title. Sanity has
 * an optional `description`; none is set today, so this stays the fallback. */
const SERIES_BLURB = "מסדרת הדייטים א׳-ב׳";

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

/** "רעיון #07" — the footer label, from the series position. */
export function dateFooterLabel(dateIdea: SanityDateIdea): string {
  const position = dateIdea.seriesPosition;
  return position ? `רעיון #${String(position).padStart(2, "0")}` : "רעיון";
}

export function dateDescription(dateIdea: SanityDateIdea): string {
  return dateIdea.description?.trim() || SERIES_BLURB;
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
    tag: "סדרה",
    description: dateDescription(dateIdea),
    footerLabel: dateFooterLabel(dateIdea),
    search: `${dateIdea.title} סדרת דייטים א ב`,
    // Read from the date's own audited range. Undecided stays "unknown" so
    // the card appears under no budget chip instead of a guessed one.
    budget: (dateIdea.budgetRange as DateBudget) || "unknown",
    place: (dateIdea.place as DatePlace) || "outside",
    // The board's duration chip has never been backed by real data; every card
    // has always been "medium". Kept as-is so the filter behaves identically.
    duration: "medium",
    series: "date-a-b",
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
      meta: dateIdea.seriesPosition ? `סדרת הא-ב · #${String(dateIdea.seriesPosition).padStart(2, "0")}` : "סדרת הא-ב",
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
    meta: SERIES_BLURB,
    href: dateHref(dateIdea),
    image: dateCardImage(dateIdea),
    search: `${dateIdea.title} ${keywords}`.toLowerCase(),
    keywords,
  };
}
