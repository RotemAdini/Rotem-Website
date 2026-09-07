import type { DateBoardCard } from "./types";
import { dateSeriesAB } from "./date-series";

export function getDateBoardCards(): DateBoardCard[] {
  return dateSeriesAB.map((item) => ({
    key: `date-a-b-${item.id}`,
    href: `/dates/${item.id}`,
    title: item.title,
    image: item.image,
    favoriteId: `date-a-b-${item.id}`,
    tag: "סדרה",
    description: "מסדרת הדייטים א׳-ב׳",
    footerLabel: `רעיון #${item.id}`,
    search: `${item.title} סדרת דייטים א ב`,
    budget: item.budget || "medium",
    place: item.place || "outside",
    duration: "medium",
    series: "date-a-b",
  }));
}
