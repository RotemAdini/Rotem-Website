"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { isGameHref } from "@/lib/is-game-href";
import { FEATURES } from "@/lib/features";
import { useFavorites } from "@/lib/favorites-context";
import type { FavoriteEntry, FavoriteKind } from "@/lib/types";

const TABS: { value: FavoriteKind | "all"; label: string }[] = [
  { value: "all", label: "הכל" },
  { value: "recipe", label: "מתכונים" },
  { value: "date", label: "דייטים" },
  { value: "game", label: "משחקים" },
  // Behind a flag: nothing can be favourited from the gifts catalogue while
  // it is off, so this tab could only ever show an empty list.
  ...(FEATURES.gifts ? [{ value: "gift" as const, label: "מתנות" }] : []),
];

interface FavoritesGridProps {
  /** Precomputed server-side id -> entry lookup covering every favouritable
   * item — recipes and date ideas — rather than shipping either catalog to
   * the browser. Built in app/favorites/page.tsx. */
  catalog: Record<string, FavoriteEntry>;
}

export default function FavoritesGrid({ catalog }: FavoritesGridProps) {
  const { favorites } = useFavorites();
  const [activeTab, setActiveTab] = useState<FavoriteKind | "all">("all");

  /**
   * One card per canonical item, not per saved token.
   *
   * A recipe can answer to several legacy tokens — merging two records leaves
   * a reader who favourited both with `recipe-instagram-171` and
   * `biscuit-cake-07` in storage, and both resolve to the same recipe. They
   * are one saved thing and must render once.
   *
   * Deduplication happens only here, at resolution time. Nothing is removed
   * from localStorage: the stored tokens are left exactly as they are, so the
   * format is unchanged and the eventual Supabase migration still sees every
   * token the reader ever saved. Items with no canonical id yet (date ideas)
   * fall back to their token, so they behave exactly as before.
   */
  const rows = useMemo(() => {
    const byCanonicalId = new Map<string, { id: string; tokens: string[] } & FavoriteEntry>();
    for (const id of favorites) {
      const entry = catalog[id];
      if (!entry?.title) continue;
      const key = entry.contentId ?? id;
      const existing = byCanonicalId.get(key);
      if (existing) {
        existing.tokens.push(id);
        continue;
      }
      byCanonicalId.set(key, { ...entry, id, tokens: [id] });
    }
    return [...byCanonicalId.values()];
  }, [favorites, catalog]).filter((row) => activeTab === "all" || row.type === activeTab);

  return (
    <section className="container favorites-shell">
      <div className="favorites-tabs" role="group" aria-label="סינון המועדפים לפי סוג">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={`chip${activeTab === tab.value ? " active" : ""}`}
            aria-pressed={activeTab === tab.value}
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Switching tabs re-renders the grid with nothing to say so. */}
      <p className="sr-only" role="status" aria-live="polite">
        {rows.length === 0 ? "אין פריטים שמורים בקטגוריה הזו" : `${rows.length} פריטים שמורים`}
      </p>

      <div className="favorites-grid">
        {rows.map((item) => (
          <FavoriteCard key={item.id} tokens={item.tokens} entry={item} />
        ))}
      </div>

      {rows.length === 0 && (
        <div className="empty-state">
          <span aria-hidden="true">♡</span>
          {/* h2, not h3: this page's only other heading is its <h1>, so an h3
              here skipped a level (axe heading-order). Rendered size is
              unchanged. */}
          <h2>עוד לא שמרתם כלום</h2>
          <p>לחצו על הלב ליד מתכון, דייט, משחק או מתנה — והם יחכו לכם כאן.</p>
          <Link className="btn btn-primary" href="/recipes">
            למצוא משהו טעים
          </Link>
        </div>
      )}
    </section>
  );
}

function FavoriteCard({ tokens, entry }: { tokens: string[]; entry: FavoriteEntry }) {
  const { removeFavorites } = useFavorites();
  const body = (
    <>
      {/* The <h3> in the same link already names the item. */}
      {entry.image ? <img src={entry.image} alt="" /> : <div className="favorite-placeholder" aria-hidden="true">♡</div>}
      <div className="favorite-card-body">
        <h3>{entry.title}</h3>
        <small>{entry.meta}</small>
      </div>
    </>
  );
  return (
    <article className="favorite-card">
      {/* A saved game points at a legacy landing page whose own scripts expect a
          fresh document load, so those keep a plain <a>. Recipes and dates
          navigate client-side. */}
      {isGameHref(entry.href) ? <a href={entry.href}>{body}</a> : <Link href={entry.href}>{body}</Link>}
      {/* Removes every token that resolved to this one item, so a merged
          recipe does not come straight back from a second saved alias. */}
      {/* Named after what it does and what it acts on. Its accessible name
          used to be the bare "♥" glyph, which on a grid of saved items told a
          screen-reader user neither the action nor which card it belonged to
          (WCAG 4.1.2). aria-pressed reports the saved state, matching the
          hearts on the boards. */}
      <button
        className="mini-heart active"
        type="button"
        aria-pressed="true"
        aria-label={`הסרה מהמועדפים: ${entry.title}`}
        onClick={() => removeFavorites(tokens)}
      >
        <span aria-hidden="true">♥</span>
      </button>
    </article>
  );
}
