"use client";

import { useMemo, useState } from "react";
import type { SearchResult, SearchResultType } from "@/lib/types";

const TYPES: { value: SearchResultType | "all"; label: string }[] = [
  { value: "all", label: "הכל" },
  { value: "recipe", label: "מתכונים" },
  { value: "date", label: "דייטים" },
  { value: "game", label: "משחקים" },
  { value: "gift", label: "מתנות" },
];

export default function SearchBoard({ index }: { index: SearchResult[] }) {
  const [term, setTerm] = useState("");
  const [type, setType] = useState<SearchResultType | "all">("all");

  const filtered = useMemo(
    () => index.filter((item) => (type === "all" || item.type === type) && (!term || item.search.includes(term))),
    [index, term, type],
  );

  return (
    <>
      <section className="page-hero search-hero">
        <div className="container simple-hero">
          <span className="eyebrow">חפשו בכל האתר</span>
          <h1>
            מה בא לכם למצוא? <span>⌕</span>
          </h1>
          <label className="global-search-box">
            <span>⌕</span>
            <input
              id="globalSearchInput"
              type="search"
              placeholder="למשל: שוקולד, פיקניק, משחק זוגי..."
              autoFocus
              onChange={(event) => setTerm(event.target.value.trim().toLowerCase())}
            />
          </label>
        </div>
      </section>

      <section className="container global-results">
        <div className="results-toolbar">
          <div>
            <span className="section-kicker">תוצאות</span>
            <h2>
              <span id="globalResultCount">{filtered.length}</span> פריטים
            </h2>
          </div>
          <div className="chips">
            {TYPES.map((item) => (
              <button key={item.value} className={`chip${type === item.value ? " active" : ""}`} onClick={() => setType(item.value)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="global-results-grid">
          {filtered.map((item) => (
            <a className="global-result-card" href={item.href} key={`${item.type}-${item.href}`}>
              <span className="result-type">{item.typeLabel}</span>
              {item.image ? <img src={item.image} alt={item.title} /> : <div className="result-placeholder">♡</div>}
              <div>
                <h3>{item.title}</h3>
                <p>{item.meta}</p>
              </div>
            </a>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="empty-state">
            <span>⌕</span>
            <h3>לא מצאתי משהו מתאים</h3>
            <p>נסו מילה אחרת או עברו לקטגוריה אחרת.</p>
          </div>
        )}
      </section>
    </>
  );
}
