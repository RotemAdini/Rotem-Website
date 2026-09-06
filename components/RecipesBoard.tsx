"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import RecipeCard from "./RecipeCard";
import type { RecipeBoardCard } from "@/lib/types";
import { RECIPE_CATEGORIES } from "@/lib/categories";

interface RecipesBoardProps {
  cards: RecipeBoardCard[];
  tagOptions: string[];
}

type SortMode = "default" | "time-asc" | "name";

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
  const initialBake = quick === "no-bake" ? "no-bake" : "all";
  const initialDifficulty = quick === "easy" ? "easy" : "all";

  const [search, setSearch] = useState("");
  const [type, setType] = useState<"all" | "sweet" | "savory">("all");
  const [time, setTime] = useState(initialTime);
  const [bake, setBake] = useState<"all" | "no-bake" | "regular">(initialBake as "all" | "no-bake");
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [category, setCategory] = useState(initialCategory);
  const [series, setSeries] = useState<string>("all");
  const [tag, setTag] = useState("all");
  const [sort, setSort] = useState<SortMode>("default");

  const filtered = useMemo(() => {
    const result = cards.filter((card) => {
      const matchesSearch = !search || card.search.includes(search);
      const matchesType = type === "all" || card.type === type;
      const matchesBake = bake === "all" || card.bake === bake;
      const matchesDifficulty = difficulty === "all" || card.difficulty === difficulty;
      const matchesCategory = category === "all" || card.category === category;
      const matchesTime = time === "all" || card.time <= Number(time);
      const matchesSeries = series === "all" || card.series === series;
      const matchesTag = tag === "all" || card.tags.includes(tag);
      return matchesSearch && matchesType && matchesBake && matchesDifficulty && matchesCategory && matchesTime && matchesSeries && matchesTag;
    });

    if (sort === "time-asc") return [...result].sort((a, b) => a.time - b.time);
    if (sort === "name") return [...result].sort((a, b) => a.search.localeCompare(b.search, "he"));
    return [...result].sort((a, b) => b.sortWeight - a.sortWeight);
  }, [cards, search, type, bake, difficulty, category, time, series, tag, sort]);

  const resetFilters = () => {
    setSearch("");
    setType("all");
    setTime("all");
    setBake("all");
    setDifficulty("all");
    setCategory("all");
    setSeries("all");
    setTag("all");
  };

  return (
    <section className="container filter-layout">
      <aside className="filters-panel panel" id="recipeFilters">
        <div className="filter-title-row">
          <div>
            <span className="section-kicker">סינון וחיפוש</span>
            <h2>מה בא לכם?</h2>
          </div>
          <button className="text-button" onClick={resetFilters}>
            נקה הכל
          </button>
        </div>

        <label className="search-box">
          <span>⌕</span>
          <input
            id="recipeSearch"
            type="search"
            placeholder="חפשו מתכון או מילת מפתח..."
            value={search}
            onChange={(event) => setSearch(event.target.value.trim())}
          />
        </label>

        <div className="filter-group">
          <h3>סוג</h3>
          <div className="chips">
            {(["all", "sweet", "savory"] as const).map((value) => (
              <button key={value} className={`chip${type === value ? " active" : ""}`} onClick={() => setType(value)}>
                {value === "all" ? "הכל" : value === "sweet" ? "מתוק" : "מלוח"}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <h3>זמן הכנה</h3>
          <div className="chips">
            {([
              ["all", "הכל"],
              ["15", "עד 15 דק׳"],
              ["30", "עד 30 דק׳"],
              ["60", "עד שעה"],
            ] as const).map(([value, label]) => (
              <button key={value} className={`chip${time === value ? " active" : ""}`} onClick={() => setTime(value)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <h3>אופן הכנה</h3>
          <div className="chips">
            {([
              ["all", "הכל"],
              ["no-bake", "ללא אפייה"],
              ["regular", "אפייה / בישול"],
            ] as const).map(([value, label]) => (
              <button key={value} className={`chip${bake === value ? " active" : ""}`} onClick={() => setBake(value)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <h3>רמת קושי</h3>
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
            <option value="all">הכל</option>
            <option value="easy">קל</option>
            <option value="medium">בינוני</option>
          </select>
        </div>

        <div className="filter-group">
          <h3>קטגוריה</h3>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">כל הקטגוריות</option>
            {RECIPE_CATEGORIES.map((option) => (
              <option key={option.slug} value={option.slug}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group series-filter">
          <h3>סדרות</h3>
          <div className="chips">
            <button
              className={`chip${series === "biscuit-cakes" ? " active" : ""}`}
              onClick={() => setSeries(series === "biscuit-cakes" ? "all" : "biscuit-cakes")}
            >
              סדרת עוגות ביסקוויטים
            </button>
          </div>
        </div>

        {tagOptions.length > 0 && (
          <div className="filter-group tag-filter">
            <h3>תגיות</h3>
            <div className="chips">
              <button className={`chip${tag === "all" ? " active" : ""}`} onClick={() => setTag("all")}>
                הכל
              </button>
              {tagOptions.map((option) => (
                <button key={option} className={`chip${tag === option ? " active" : ""}`} onClick={() => setTag(option)}>
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>

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
          {filtered.map((card) => (
            <RecipeCard key={card.key} href={card.href} title={card.title} image={card.image} favoriteId={card.favoriteId} metaLeft={card.metaLeft} metaRight={card.metaRight} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="empty-state" id="recipeEmpty">
            <span>♡</span>
            <h3>לא מצאתי בדיוק את זה</h3>
            <p>נסו לשנות אחד מהפילטרים או לחפש משהו אחר.</p>
          </div>
        )}
      </div>
    </section>
  );
}
