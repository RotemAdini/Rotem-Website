import type { BiscuitCakeSeriesItem } from "./types";

// Source-backed editorial series, ported verbatim from the original
// script.js. The page templates stay shared; each item supplies its own
// title/image so the detail pages don't duplicate layout per recipe.
export const biscuitCakeSeries: BiscuitCakeSeriesItem[] = [
  { id: "01", title: "עוגת ביסקוויטים פיסטוק", image: "/images/biscuit-cakes/01-pistachio/IMG_5024-web.PNG" },
  { id: "02", title: "עוגת ביסקוויטים קרמבו", image: "/images/biscuit-cakes/02-krembo/IMG_5008-web.JPEG" },
  { id: "03", title: "עוגת ביסקוויטים מוקה", image: "/images/biscuit-cakes/03-mocha/IMG_5176-web.JPEG" },
  { id: "04", title: "עוגת ביסקוויטים קראנץ׳ נוטלה", image: "/images/biscuit-cakes/04-nutella-crunch/IMG_3692.JPEG" },
  { id: "05", title: "עוגת ביסקוויטים לימון ונענע", image: null },
  { id: "06", title: "עוגת ביסקוויטים קרפ", image: "/images/biscuit-cakes/06-crepe/IMG_7314-web.JPEG" },
  { id: "07", title: "פירמידת ביסקוויטים כשרה לפסח", image: null },
  {
    id: "08",
    title: "עוגת ביסקוויטים אלפחורס",
    image: "/images/biscuit-cakes/08-alfajores/08-alfajores-1-web.JPEG",
    images: [
      "/images/biscuit-cakes/08-alfajores/08-alfajores-1-web.JPEG",
      "/images/biscuit-cakes/08-alfajores/08-alfajores-2-web.JPEG",
    ],
  },
  {
    id: "09",
    title: "כדורי ביסקוויטים",
    image: "/images/biscuit-cakes/09-biscuit-balls/09-biscuit-balls-1-web.JPEG",
    images: [
      "/images/biscuit-cakes/09-biscuit-balls/09-biscuit-balls-1-web.JPEG",
      "/images/biscuit-cakes/09-biscuit-balls/09-biscuit-balls-2-web.JPEG",
    ],
  },
  {
    id: "10",
    title: "עוגת ביסקוויטים טריפל שוקולד",
    image: "/images/biscuit-cakes/10-triple-chocolate/10-triple-chocolate-1-web.JPEG",
    images: [
      "/images/biscuit-cakes/10-triple-chocolate/10-triple-chocolate-1-web.JPEG",
      "/images/biscuit-cakes/10-triple-chocolate/10-triple-chocolate-2-web.JPEG",
    ],
  },
  {
    id: "11",
    title: "פצצת אוראו וביסקוויטים",
    image: "/images/biscuit-cakes/11-oreo-bomb/11-oreo-bomb-1-web.JPEG",
    images: [
      "/images/biscuit-cakes/11-oreo-bomb/11-oreo-bomb-1-web.JPEG",
      "/images/biscuit-cakes/11-oreo-bomb/11-oreo-bomb-2-web.JPEG",
    ],
  },
  { id: "12", title: "עוגת ביסקוויטים פקאן סיני", image: "/images/biscuit-cakes/12-chinese-pecan/IMG_3691.JPEG" },
  { id: "13", title: "עוגת ביסקוויטים פירות יער", image: "/images/biscuit-cakes/13-berries/IMG_3515-web.JPEG" },
  { id: "14", title: "עוגת ביסקוויטים באונטי", image: "/images/biscuit-cakes/14-bounty/IMG_3690.JPEG" },
];

/** A few legacy stand-ins don't have a photo yet but are the same recipe as
 * a fuller reviewed catalog record that arrived later (matched by title
 * rather than image path — see lib/recipes.ts). */
export const BISCUIT_SERIES_TITLE_MATCH: Record<string, string> = {
  "עוגת קראנץ׳ נוטלה": "04",
  "עוגת ביסקוויטים לימונענע": "05",
  "עוגת ביסקוויטים באונטי": "14",
};

export function getBiscuitCakeItem(id: string): BiscuitCakeSeriesItem | undefined {
  return biscuitCakeSeries.find((item) => item.id === id);
}

/** Up to `count` other series items that have a real photo, excluding the
 * current one — used for the "related" strip on detail pages, and (with no
 * excludeId) for the default not-found state's suggestions. */
export function getRelatedBiscuitItems(excludeId: string | undefined, count: number): BiscuitCakeSeriesItem[] {
  return biscuitCakeSeries.filter((item) => item.image && item.id !== excludeId).slice(0, count);
}

export function biscuitSeriesFolderId(path: string | null | undefined): string | null {
  // Matches the raw catalog path ("images/biscuit-cakes/11-oreo-bomb/…") as
  // well as its public-URL form ("/images/biscuit-cakes/…").
  const match = /images\/biscuit-cakes\/(\d+)-/.exec(path || "");
  return match ? match[1] : null;
}
