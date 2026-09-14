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
          (!search || card.search.includes(search)) &&
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
          <span>⌕</span>
          <input id="dateSearch" type="search" placeholder="חפשו רעיון לדייט..." value={search} onChange={(event) => setSearch(event.target.value.trim())} />
        </div>
        <div className="filter-group inline-filter">
          {/* Named in full: the ranges are what the couple spends on the whole
              date, which the old נמוך/בינוני/גבוה chips never made clear. */}
          <span>תקציב משוער לזוג</span>
          <div className="chips">
            {([
              ["all", "הכל"],
              ["free", "חינם"],
              ["upto100", "עד 100 ₪"],
              ["100to250", "100–250 ₪"],
              ["250plus", "250 ₪ ומעלה"],
            ] as const).map(([value, label]) => (
              <button key={value} className={`chip${budget === value ? " active" : ""}`} onClick={() => setBudget(value)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group inline-filter">
          <span>איפה</span>
          <div className="chips">
            {([
              ["all", "הכל"],
              ["home", "בבית"],
              ["outside", "בחוץ"],
            ] as const).map(([value, label]) => (
              <button key={value} className={`chip${place === value ? " active" : ""}`} onClick={() => setPlace(value)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group inline-filter">
          <span>כמה זמן</span>
          <select value={duration} onChange={(event) => setDuration(event.target.value)}>
            <option value="all">לא משנה</option>
            <option value="short">עד שעתיים</option>
            <option value="medium">חצי יום</option>
            <option value="long">יום שלם</option>
          </select>
        </div>
        <div className="filter-group inline-filter series-filter">
          <span>סדרות</span>
          {/* Built from the cards actually present, so a new series or the
              first standalone idea appears here on its own. No count and no
              series key is written into this component. */}
          <div className="chips">
            <button className={`chip${series === "all" ? " active" : ""}`} onClick={() => setSeries("all")}>
              הכל
            </button>
            {seriesOptions.map(({ value, label, count }) => (
              <button
                key={value}
                className={`chip${series === value ? " active" : ""}`}
                onClick={() => setSeries(value)}
              >
                {label} <span className="chip-count">{count}</span>
              </button>
            ))}
          </div>
        </div>

        {hasActiveFilter && (
          <div className="filter-group inline-filter discovery-reset">
            <button className="text-button" onClick={resetFilters}>
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
            <span>♡</span>
            <h3>אין כרגע התאמה מדויקת</h3>
            <p>שנו פילטר אחד ונמצא משהו אחר.</p>
            <button className="btn btn-primary compact" onClick={resetFilters}>
              ניקוי הסינון
            </button>
          </div>
        )}
      </section>
    </>
  );
}
