export interface Category {
  slug: string;
  label: string;
}

/** All recipe categories, in the exact order used by the recipes-board
 * category <select>. */
export const RECIPE_CATEGORIES: Category[] = [
  { slug: "cakes", label: "עוגות וקינוחים" },
  { slug: "cookies", label: "עוגיות" },
  { slug: "pasta", label: "פסטות" },
  { slug: "drinks", label: "משקאות" },
  { slug: "bread", label: "לחמים ומאפים" },
  { slug: "light", label: "ארוחות קלות" },
  { slug: "mains", label: "מנות עיקריות" },
  { slug: "starters", label: "נשנושים ומנות ראשונות" },
  { slug: "brunch", label: "בראנץ׳" },
  { slug: "salads", label: "סלטים" },
  { slug: "sides", label: "תוספות" },
];

/** The subset (and order) shown as circular thumbnails on the homepage. */
export const HOME_CATEGORY_SLUGS = ["cakes", "cookies", "pasta", "drinks", "bread", "brunch", "salads"];

export const HOME_CATEGORIES: Category[] = HOME_CATEGORY_SLUGS.map(
  (slug) => RECIPE_CATEGORIES.find((category) => category.slug === slug)!,
);
