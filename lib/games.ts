import type { GameCatalogItem } from "./types";

// Source-backed games catalog. Cards link directly to the migrated product
// landing pages under /games. Gift prototypes remain intentionally hidden,
// same as on the original site (see lib/gifts.ts).
export const gamesCatalog: GameCatalogItem[] = [
  {
    slug: "forest-game",
    title: "היער הקסום",
    tagline: "שאלות עומק",
    description: "מסע זוגי מסתורי של שיחות עומק, משימות מקרבות ורגעי קסם.",
    kind: "deep",
    price: 48,
    kicker: "משחק דיגיטלי",
    image: "/games/assets/forest/forest-moonlit-pines.jpg",
    themeClass: "forest-card",
  },
  {
    slug: "race-game",
    title: "מירוץ האהבה",
    tagline: "תחרות",
    description: "11 תחנות של תחרות, צחוק ואתגרים זוגיים — מהספה בבית.",
    kind: "competition",
    price: 48,
    kicker: "משחק דיגיטלי",
    icon: "♜",
    themeClass: "race-card",
  },
  {
    slug: "memory-game",
    title: "משחק הזיכרון הגדול",
    tagline: "זיכרונות וצחוק",
    description: "40 שאלות, ניקוד ותחרות קלילה שמחזירה אתכם לרגעים אהובים.",
    kind: "fun",
    price: 48,
    kicker: "משחק דיגיטלי",
    icon: "♡",
    themeClass: "memory-card",
  },
  {
    slug: "bundle",
    title: "החבילה המלאה",
    tagline: "שלושה משחקים",
    description: "היער הקסום, מירוץ האהבה ומשחק הזיכרון הגדול במחיר מוזל.",
    kind: "all",
    price: 110,
    kicker: "חבילה דיגיטלית",
    icon: "✦",
    themeClass: "bundle-card",
  },
];

export const gameHref = (slug: GameCatalogItem["slug"]) => `/games/${slug}`;
