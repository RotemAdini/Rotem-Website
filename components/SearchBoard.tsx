"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { SearchResult, SearchResultType } from "@/lib/types";
import { rankResults } from "@/lib/search-rank";
import { isGameHref } from "@/lib/is-game-href";
import { FEATURES } from "@/lib/features";

const TYPES: { value: SearchResultType | "all"; label: string }[] = [
  { value: "all", label: "הכל" },
  { value: "recipe", label: "מתכונים" },
  { value: "date", label: "דייטים" },
  { value: "game", label: "משחקים" },
  // Hidden entirely while the gifts catalogue is behind its flag, rather than
  // left as a permanently disabled chip.
  ...(FEATURES.gifts ? [{ value: "gift" as const, label: "מתנות" }] : []),
];

/** Shown before anything is typed. Each one is a real query that returns
 * results, including ingredient-only ones now that ingredients are indexed. */
const SUGGESTIONS = ["שוקולד", "עוגת ביסקוויטים", "טחינה", "ללא אפייה", "פסטה", "דייט בבית", "משחק זוגי"];

const PAGE_SIZE = 24;

export default function SearchBoard({ index }: { index: SearchResult[] }) {
  const [term, setTerm] = useState("");
  const [type, setType] = useState<SearchResultType | "all">("all");
  const [visible, setVisible] = useState(PAGE_SIZE);

  // Ranked, not filtered: an empty query deliberately returns nothing so the
  // page can show suggestions rather than all 176 items ordered by type.
  const ranked = useMemo(() => rankResults(index, term), [index, term]);
  const results = useMemo(() => (type === "all" ? ranked : ranked.filter((item) => item.type === type)), [ranked, type]);

  const hasQuery = term.trim().length > 0;
  const shown = results.slice(0, visible);

  function updateTerm(value: string) {
    setTerm(value);
    setVisible(PAGE_SIZE);
  }

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
              placeholder="שם של מתכון, מצרך, או רעיון לדייט..."
              autoFocus
              value={term}
              onChange={(event) => updateTerm(event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="container global-results">
        {!hasQuery ? (
          <div className="search-intro">
            <div className="search-suggestions">
              <h2>אפשר להתחיל מכאן</h2>
              <p>אפשר לחפש גם לפי מצרך — למשל טחינה, נוטלה או שמנת מתוקה.</p>
              <div className="chips">
                {SUGGESTIONS.map((item) => (
                  <button key={item} type="button" className="chip" onClick={() => updateTerm(item)}>
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div className="search-shortcuts">
              <Link href="/recipes">
                <strong>כל המתכונים</strong>
                <span>סינון לפי קטגוריה, זמן הכנה ורמת קושי</span>
              </Link>
              <Link href="/dates">
                <strong>רעיונות לדייטים</strong>
                <span>לפי תקציב, מיקום ואורך הערב</span>
              </Link>
              <Link href="/games">
                <strong>משחקים לזוג</strong>
                <span>ערב אחר, בלי לצאת מהבית</span>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="results-toolbar">
              <div>
                <span className="section-kicker">תוצאות</span>
                <h2>
                  <span id="globalResultCount">{results.length}</span> פריטים
                </h2>
              </div>
              <div className="chips">
                {TYPES.map((item) => {
                  const count = item.value === "all" ? ranked.length : ranked.filter((row) => row.type === item.value).length;
                  return (
                    <button
                      key={item.value}
                      className={`chip${type === item.value ? " active" : ""}`}
                      disabled={count === 0}
                      onClick={() => {
                        setType(item.value);
                        setVisible(PAGE_SIZE);
                      }}
                    >
                      {item.label} {count > 0 && <span className="chip-count">{count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="global-results-grid">
              {shown.map((item) => {
                const body = (
                  <>
                    <span className="result-type">{item.typeLabel}</span>
                    {item.image ? <img src={item.image} alt={item.title} /> : <div className="result-placeholder">♡</div>}
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.meta}</p>
                    </div>
                  </>
                );
                const key = `${item.type}-${item.href}`;
                // A game landing page is a legacy widget with its own scripts
                // that expect a fresh document load, so those keep a plain <a>.
                // Everything else navigates client-side.
                return isGameHref(item.href) ? (
                  <a className="global-result-card" href={item.href} key={key}>
                    {body}
                  </a>
                ) : (
                  <Link className="global-result-card" href={item.href} key={key}>
                    {body}
                  </Link>
                );
              })}
            </div>

            {results.length > shown.length && (
              <div className="load-more-row">
                <button type="button" className="btn btn-secondary" onClick={() => setVisible((n) => n + PAGE_SIZE)}>
                  להציג עוד תוצאות
                </button>
                <span className="load-more-count">
                  מוצגות {shown.length} מתוך {results.length}
                </span>
              </div>
            )}

            {results.length === 0 && (
              <div className="empty-state">
                <span>⌕</span>
                <h3>לא מצאתי משהו מתאים</h3>
                <p>נסו מילה אחרת, או חפשו לפי מצרך — למשל שוקולד, גבינה או טחינה.</p>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
