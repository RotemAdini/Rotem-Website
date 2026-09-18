"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import DateCard from "./DateCard";
import type { DateBoardCard } from "@/lib/types";
import { dateSeriesLabel } from "@/lib/sanity/date-adapters";

export default function DatesBoard({ cards }: { cards: DateBoardCard[] }) {
  const [search, setSearch] = useState("");
  const [budget, setBudget] = useState("all");
  const [place, setPlace] = useState("all");
  const [duration, setDuration] = useState("all");
  const [series, setSeries] = useState("all");

  const filtered = useMemo(
    () =>
      cards.filter(
        (card) =>
          (budget === "all" || card.budget === budget) &&
          (place === "all" || card.place === place) &&
          (duration === "all" || card.duration === duration) &&
          (!search.trim() || card.search.includes(search.trim())) &&
          (series === "all" || card.series === series),
      ),
    [cards, search, budget, place, duration, series],
  );

  /** Every series present in the data, in the order the cards arrive (series
   * instalments first, then standalone), each with its own count. Derived, so
   * nothing here has to be updated when a series or a standalone idea is
   * added — and no total is hardcoded. */
  const seriesOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const card of cards) counts.set(card.series, (counts.get(card.series) ?? 0) + 1);
    return [...counts.entries()].map(([value, count]) => ({ value, count, label: dateSeriesLabel(value) }));
  }, [cards]);

  const hasActiveFilter = Boolean(search) || budget !== "all" || place !== "all" || duration !== "all" || series !== "all";

  const resetFilters = () => {
    setSearch("");
    setBudget("all");
    setPlace("all");
    setDuration("all");
    setSeries("all");
  };

  return (
    <>
      <section className="container discovery-filter panel">
        <div className="discovery-search">
          <span aria-hidden="true">⌕</span>
          {/* The placeholder was doing duty as the field's name, which it is
              not: it is not exposed as an accessible name and it vanishes the
              moment anything is typed (WCAG 3.3.2/4.1.2).

              The value is also no longer trimmed on every keystroke. It was,
              which silently swallowed every space as it was typed and made
              any multi-word search ("דייט בבית") impossible to enter. Trimming
              belongs at comparison time, below. */}
          <input
            id="dateSearch"
            type="search"
            aria-label="חיפוש רעיון לדייט"
            placeholder="חפשו רעיון לדייט..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="filter-group inline-filter">
          {/* Named in full: the ranges are what the couple spends on the whole
              date, which the old נמוך/בינוני/גבוה chips never made clear. */}
          {/* The visible label is tied to the group it labels, and each chip
              now reports its own selected state — both were colour/position
              only before (WCAG 1.3.1, 1.4.1, 4.1.2). */}
          <span id="date-budget-label">תקציב משוער לזוג</span>
          <div className="chips" role="group" aria-labelledby="date-budget-label">
            {([
              ["all", "הכל"],
              ["free", "חינם"],
              ["upto100", "עד 100 ₪"],
              ["100to250", "100–250 ₪"],
              ["250plus", "250 ₪ ומעלה"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`chip${budget === value ? " active" : ""}`}
                aria-pressed={budget === value}
                onClick={() => setBudget(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group inline-filter">
          <span id="date-place-label">איפה</span>
          <div className="chips" role="group" aria-labelledby="date-place-label">
            {([
              ["all", "הכל"],
              ["home", "בבית"],
              ["outside", "בחוץ"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`chip${place === value ? " active" : ""}`}
                aria-pressed={place === value}
                onClick={() => setPlace(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group inline-filter">
          <span id="date-duration-label">כמה זמן</span>
          {/* Had no accessible name at all — axe select-name, critical. */}
          <select aria-labelledby="date-duration-label" value={duration} onChange={(event) => setDuration(event.target.value)}>
            <option value="all">לא משנה</option>
            <option value="short">עד שעתיים</option>
            <option value="medium">חצי יום</option>
            <option value="long">יום שלם</option>
          </select>
        </div>
        <div className="filter-group inline-filter series-filter">
          <span id="date-series-label">סדרות</span>
          {/* Built from the cards actually present, so a new series or the
              first standalone idea appears here on its own. No count and no
              series key is written into this component. */}
          <div className="chips" role="group" aria-labelledby="date-series-label">
            <button type="button" className={`chip${series === "all" ? " active" : ""}`} aria-pressed={series === "all"} onClick={() => setSeries("all")}>
              הכל
            </button>
            {seriesOptions.map(({ value, label, count }) => (
              <button
                key={value}
                type="button"
                className={`chip${series === value ? " active" : ""}`}
                aria-pressed={series === value}
                onClick={() => setSeries(value)}
              >
                {label} <span className="chip-count">{count}</span>
              </button>
            ))}
          </div>
        </div>

        {hasActiveFilter && (
          <div className="filter-group inline-filter discovery-reset">
            <button type="button" className="text-button" onClick={resetFilters}>
              ניקוי הסינון
            </button>
          </div>
        )}
      </section>

      <section className="container listing-section">
        <div className="results-toolbar">
          <div>
            <span className="section-kicker">תבחרו מה מרגיש נכון היום</span>
            <h2>
              <span id="dateCount">{filtered.length}</span> רעיונות לדייט
            </h2>
            {/* Permanently mounted so it is actually announced when a chip,
                the select or the search box changes the count (WCAG 4.1.3). */}
            <p className="sr-only" role="status" aria-live="polite">
              {filtered.length === 0 ? "לא נמצאו רעיונות לדייט" : `${filtered.length} רעיונות לדייט מוצגים`}
            </p>
          </div>
          <Link href="/games" className="small-pill">
            מחפשים ערב בבית? נסו משחק זוגי
          </Link>
        </div>
        <div className="dates-grid" id="dateResults">
          {filtered.map((card) => (
            <DateCard key={card.key} href={card.href} title={card.title} image={card.image} favoriteId={card.favoriteId} favoriteAliases={card.favoriteAliases} tag={card.tag} description={card.description} footerLabel={card.footerLabel} />
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="empty-state" id="dateEmpty">
            <span aria-hidden="true">♡</span>
            <h3>אין כרגע התאמה מדויקת</h3>
            <p>שנו פילטר אחד ונמצא משהו אחר.</p>
            <button type="button" className="btn btn-primary compact" onClick={resetFilters}>
              ניקוי הסינון
            </button>
          </div>
        )}
      </section>
    </>
  );
}
