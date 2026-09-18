"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import RecipeCard from "./RecipeCard";
import type { RecipeBoardCard } from "@/lib/types";
import { RECIPE_CATEGORIES } from "@/lib/categories";
import { rankBy } from "@/lib/search-rank";

interface RecipesBoardProps {
  cards: RecipeBoardCard[];
  tagOptions: string[];
}

type SortMode = "default" | "time-asc" | "name";

/** How many cards a page of results shows. The board used to render the whole
 * catalogue — 159 cards and a 12,000px page — on every visit. */
const PAGE_SIZE = 24;

/** The interactive part of the recipes board: search, chip/select filters,
 * series + tag chips, sort, and the results grid + empty state. A direct
 * port of script.js's recipe-filter logic, but driven by React state
 * (filtering the card array) instead of toggling an `is-hidden` class on
 * DOM nodes built ahead of time. */
export default function RecipesBoard({ cards, tagOptions }: RecipesBoardProps) {
  const searchParams = useSearchParams();

  const initialCategory = searchParams.get("category") || "all";
  const quick = searchParams.get("quick");
  const initialTime = quick === "30" ? "30" : "all";
  const initialBake = quick === "no-bake" ? "no-oven" : "all";
  const initialDifficulty = quick === "easy" ? "easy" : "all";

  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [type, setType] = useState<"all" | "sweet" | "savory">("all");
  const [time, setTime] = useState(initialTime);
  const [bake, setBake] = useState<"all" | "no-oven" | "oven">(initialBake as "all" | "no-oven");
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [category, setCategory] = useState(initialCategory);
  const [series, setSeries] = useState<string>("all");
  const [tag, setTag] = useState("all");
  const [sort, setSort] = useState<SortMode>("default");

  const filtered = useMemo(() => {
    // Filters first, then the text query — so the query always ranks whatever
    // the chips and selects left behind, never the whole catalogue.
    const result = cards.filter((card) => {
      const matchesType = type === "all" || card.type === type;
      const matchesBake = bake === "all" || card.bake === bake;
      const matchesDifficulty = difficulty === "all" || card.difficulty === difficulty;
      const matchesCategory = category === "all" || card.category === category;
      const matchesTime = time === "all" || card.time <= Number(time);
      const matchesSeries = series === "all" || card.series === series;
      const matchesTag = tag === "all" || card.tags.includes(tag);
      return matchesType && matchesBake && matchesDifficulty && matchesCategory && matchesTime && matchesSeries && matchesTag;
    });

    // The same scoring engine /search uses (lib/search-rank.ts), reading each
    // card's title, category and keywords — ingredients included. With no
    // query rankBy returns the list untouched, so the sort control still owns
    // the order in the normal case.
    const matched = rankBy(
      result.map((card) => ({ ...card, meta: card.metaLeft })),
      search,
    );

    if (sort === "time-asc") return [...matched].sort((a, b) => a.time - b.time);
    if (sort === "name") return [...matched].sort((a, b) => a.title.localeCompare(b.title, "he"));
    // With a query and the default sort, relevance order is what rankBy
    // already produced — re-sorting by date would throw it away.
    if (search.trim()) return matched;
    return [...matched].sort((a, b) => b.sortWeight - a.sortWeight);
  }, [cards, search, type, bake, difficulty, category, time, series, tag, sort]);

  const [visible, setVisible] = useState(PAGE_SIZE);

  // Any change to the result set starts the page count over, so narrowing a
  // filter can never leave the reader scrolled past the end of the new list.
  // Keyed off the filtered array's identity, which useMemo already recomputes
  // exactly when one of the filter inputs changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(PAGE_SIZE);
  }, [filtered]);

  const shown = filtered.slice(0, visible);

  /**
   * Keeps ?q= in step with the box so a refresh or a shared link restores the
   * search. Written with replaceState rather than router.replace: this page is
   * a Server Component, and a real navigation per keystroke would re-run it.
   * Every other filter stays where it was — the existing ?category= and ?quick=
   * links keep working untouched.
   */
  const syncQuery = useCallback((value: string) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (value.trim()) url.searchParams.set("q", value.trim());
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", url);
  }, []);

  const updateSearch = useCallback(
    (value: string) => {
      setSearch(value);
      syncQuery(value);
    },
    [syncQuery],
  );

  const resetFilters = () => {
    updateSearch("");
    setType("all");
    setTime("all");
    setBake("all");
    setDifficulty("all");
    setCategory("all");
    setSeries("all");
    setTag("all");
  };

  const hasQuery = search.trim().length > 0;

  return (
    <>
      {/* The board's own search, above the filters so it reads as the primary
          way in — the same shape the dates board uses. It searches recipes
          only; the site-wide search still lives at /search. */}
      <section className="container recipe-search-bar">
        <label className="recipe-search-field">
          <span aria-hidden="true">⌕</span>
          <input
            id="recipeSearch"
            type="search"
            value={search}
            placeholder="חיפוש מתכון, מצרך או קטגוריה…"
            aria-label="חיפוש בתוך המתכונים"
            onChange={(event) => updateSearch(event.target.value)}
          />
          {hasQuery && (
            <button type="button" className="recipe-search-clear" onClick={() => updateSearch("")} aria-label="ניקוי החיפוש">
              ✕
            </button>
          )}
        </label>
        {/* The visible line is unchanged — it still appears only once there
            is a query, so the layout is what it was. */}
        {hasQuery && (
          <p className="recipe-search-status">
            {filtered.length === 0
              ? `אין תוצאות עבור “${search.trim()}”`
              : `${filtered.length} תוצאות עבור “${search.trim()}”`}
          </p>
        )}
        {/* The announcement is a separate, permanently mounted region. It has
            to be permanent because a live region inserted together with its
            first message is routinely never read, and separate because the
            count also changes when a chip or select is used, with nothing
            visible appearing to say so (WCAG 4.1.3). */}
        <p className="sr-only" role="status" aria-live="polite">
          {filtered.length === 0 ? "לא נמצאו מתכונים" : `${filtered.length} מתכונים מוצגים`}
        </p>
      </section>

      <section className="container filter-layout">
      <section className="filters-panel panel" id="recipeFilters" aria-labelledby="recipe-filters-heading">
        <div className="filter-title-row">
          <div>
            <span className="section-kicker">סינון וחיפוש</span>
            <h2 id="recipe-filters-heading">מה בא לכם?</h2>
          </div>
          <button type="button" className="text-button" onClick={resetFilters}>
            נקה הכל
          </button>
        </div>

        {/* Each chip row is a labelled group whose buttons carry their own
            selected state. Both were previously visual only: the heading sat
            beside the chips with nothing tying them together, and "selected"
            was a background colour — so the state was unavailable to a screen
            reader (WCAG 1.3.1, 4.1.2) and carried by colour alone (1.4.1). */}
        <div className="filter-group">
          <h3 id="filter-type-label">סוג</h3>
          <div className="chips" role="group" aria-labelledby="filter-type-label">
            {(["all", "sweet", "savory"] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={`chip${type === value ? " active" : ""}`}
                aria-pressed={type === value}
                onClick={() => setType(value)}
              >
                {value === "all" ? "הכל" : value === "sweet" ? "מתוק" : "מלוח"}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <h3 id="filter-time-label">זמן הכנה</h3>
          <div className="chips" role="group" aria-labelledby="filter-time-label">
            {([
              ["all", "הכל"],
              ["15", "עד 15 דק׳"],
              ["30", "עד 30 דק׳"],
              ["60", "עד שעה"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`chip${time === value ? " active" : ""}`}
                aria-pressed={time === value}
                onClick={() => setTime(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <h3 id="filter-bake-label">אופן הכנה</h3>
          <div className="chips" role="group" aria-labelledby="filter-bake-label">
            {([
              ["all", "הכל"],
              ["no-oven", "ללא תנור"],
              ["oven", "דורש תנור"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`chip${bake === value ? " active" : ""}`}
                aria-pressed={bake === value}
                onClick={() => setBake(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <h3 id="filter-difficulty-label">רמת קושי</h3>
          {/* aria-labelledby rather than a wrapping <label>: the heading is
              already the visible label, and this select had no accessible
              name at all (axe select-name, critical — WCAG 4.1.2/3.3.2). */}
          <select aria-labelledby="filter-difficulty-label" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
            <option value="all">הכל</option>
            <option value="easy">קל</option>
            <option value="medium">בינוני</option>
          </select>
        </div>

        <div className="filter-group">
          <h3 id="filter-category-label">קטגוריה</h3>
          <select aria-labelledby="filter-category-label" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">כל הקטגוריות</option>
            {RECIPE_CATEGORIES.map((option) => (
              <option key={option.slug} value={option.slug}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group series-filter">
          <h3 id="filter-series-label">סדרות</h3>
          <div className="chips" role="group" aria-labelledby="filter-series-label">
            <button
              type="button"
              className={`chip${series === "biscuit-cakes" ? " active" : ""}`}
              aria-pressed={series === "biscuit-cakes"}
              onClick={() => setSeries(series === "biscuit-cakes" ? "all" : "biscuit-cakes")}
            >
              סדרת עוגות ביסקוויטים
            </button>
          </div>
        </div>

        {tagOptions.length > 0 && (
          <div className="filter-group tag-filter">
            <h3 id="filter-tag-label">תגיות</h3>
            <div className="chips" role="group" aria-labelledby="filter-tag-label">
              <button type="button" className={`chip${tag === "all" ? " active" : ""}`} aria-pressed={tag === "all"} onClick={() => setTag("all")}>
                הכל
              </button>
              {tagOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`chip${tag === option ? " active" : ""}`}
                  aria-pressed={tag === option}
                  onClick={() => setTag(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="results-panel">
        <div className="results-toolbar">
          <div>
            <span className="section-kicker">מתכונים</span>
            <h2>
              <span id="recipeCount">{filtered.length}</span> תוצאות
            </h2>
          </div>
          <select className="sort-select" aria-label="מיון מתכונים" value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
            <option value="default">החדשים ביותר</option>
            <option value="time-asc">זמן הכנה: מהיר לארוך</option>
            <option value="name">לפי א׳-ב׳</option>
          </select>
        </div>

        <div className="recipe-grid recipes-page-grid" id="recipeResults">
          {shown.map((card) => (
            <RecipeCard key={card.key} href={card.href} title={card.title} image={card.image} favoriteId={card.favoriteId} favoriteAliases={card.favoriteAliases} metaLeft={card.metaLeft} metaRight={card.metaRight} />
          ))}
        </div>

        {filtered.length > shown.length && (
          <div className="load-more-row">
            <button type="button" className="btn btn-secondary" onClick={() => setVisible((n) => n + PAGE_SIZE)}>
              להציג עוד מתכונים
            </button>
            {/* No aria-live here any more: the permanently mounted status
                region above already announces the count, and two regions
                firing on the same change read the number twice. */}
            <span className="load-more-count">
              מוצגים {shown.length} מתוך {filtered.length}
            </span>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="empty-state" id="recipeEmpty">
            <span aria-hidden="true">♡</span>
            <h3>לא מצאתי בדיוק את זה</h3>
            {hasQuery ? (
              <p>
                אין מתכון שמתאים ל“{search.trim()}” עם הסינון הנוכחי. אפשר לחפש לפי מצרך — למשל שוקולד, טחינה או
                שמנת מתוקה.
              </p>
            ) : (
              <p>נסו לשנות אחד מהפילטרים או לחפש משהו אחר.</p>
            )}
            <div className="empty-actions">
              {hasQuery && (
                <button type="button" className="btn btn-primary compact" onClick={() => updateSearch("")}>
                  ניקוי החיפוש
                </button>
              )}
              <button type="button" className="btn btn-secondary compact" onClick={resetFilters}>
                איפוס כל הסינון
              </button>
            </div>
          </div>
        )}
      </div>
      </section>
    </>
  );
}
