"use client";

import { useMemo, useState } from "react";
import DateCard from "./DateCard";
import type { DateBoardCard } from "@/lib/types";

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

  return (
    <>
      <section className="container discovery-filter panel">
        <div className="discovery-search">
          <span>⌕</span>
          <input id="dateSearch" type="search" placeholder="חפשו רעיון לדייט..." value={search} onChange={(event) => setSearch(event.target.value.trim())} />
        </div>
        <div className="filter-group inline-filter">
          <span>תקציב</span>
          <div className="chips">
            {([
              ["all", "הכל"],
              ["low", "עד ₪100"],
              ["medium", "בינוני"],
              ["high", "מושקע"],
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
          <div className="chips">
            <button
              className={`chip${series === "date-a-b" ? " active" : ""}`}
              onClick={() => setSeries(series === "date-a-b" ? "all" : "date-a-b")}
            >
              סדרת הא-ב
            </button>
          </div>
        </div>
      </section>

      <section className="container listing-section">
        <div className="results-toolbar">
          <div>
            <span className="section-kicker">תבחרו מה מרגיש נכון היום</span>
            <h2>
              <span id="dateCount">{filtered.length}</span> רעיונות לדייט
            </h2>
          </div>
          <a href="/games" className="small-pill">
            מחפשים ערב בבית? נסו משחק זוגי
          </a>
        </div>
        <div className="dates-grid" id="dateResults">
          {filtered.map((card) => (
            <DateCard key={card.key} href={card.href} title={card.title} image={card.image} favoriteId={card.favoriteId} tag={card.tag} description={card.description} footerLabel={card.footerLabel} />
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="empty-state" id="dateEmpty">
            <span>♡</span>
            <h3>אין כרגע התאמה מדויקת</h3>
            <p>שנו פילטר אחד ונמצא משהו אחר.</p>
          </div>
        )}
      </section>
    </>
  );
}
