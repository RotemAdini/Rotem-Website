"use client";

import { useState } from "react";

const OCCASIONS = [
  ["all", "הכל"],
  ["couple", "לזוג"],
  ["small", "קטנה ומתוקה"],
  ["experience", "חוויה"],
  ["hosting", "אירוח"],
] as const;

/** The gifts board has no real catalog connected yet (see README history —
 * gift ideas were never supplied), so this only reproduces the original
 * filter UI's look/feel; there's nothing to actually filter. Results always
 * show the same empty state, exactly like the original static page. */
export default function GiftsFilterBar() {
  const [occasion, setOccasion] = useState<string>("all");

  return (
    <section className="container shop-intro gift-toolbar">
      <div>
        <span className="section-kicker">בואו נמצא משהו מתאים</span>
        <h2>
          <span id="giftCount">0</span> רעיונות
        </h2>
      </div>
      <div className="filter-stack">
        <div className="chips" role="group" aria-labelledby="gift-occasion-label">
          <span id="gift-occasion-label" className="sr-only">
            סינון לפי אירוע
          </span>
          {OCCASIONS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`chip${occasion === value ? " active" : ""}`}
              aria-pressed={occasion === value}
              onClick={() => setOccasion(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {/* Had no accessible name. This board is behind FEATURES.gifts and
            renders nothing today, but it is fixed alongside the others so the
            flag can be switched on without reintroducing the failure. */}
        <label className="sr-only" htmlFor="giftBudget">
          סינון לפי תקציב
        </label>
        <select id="giftBudget" defaultValue="all">
          <option value="all">כל התקציבים</option>
          <option value="low">עד ₪100</option>
          <option value="mid">₪100–₪200</option>
          <option value="high">₪200+</option>
        </select>
      </div>
    </section>
  );
}
