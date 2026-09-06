"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useFavorites } from "@/lib/favorites-context";
import { getStaticFavoriteCatalog } from "@/lib/favorites-catalog";
import type { FavoriteEntry, FavoriteKind } from "@/lib/types";

const TABS: { value: FavoriteKind | "all"; label: string }[] = [
  { value: "all", label: "הכל" },
  { value: "recipe", label: "מתכונים" },
  { value: "date", label: "דייטים" },
  { value: "game", label: "משחקים" },
  { value: "gift", label: "מתנות" },
];

interface FavoritesGridProps {
  /** Precomputed server-side lookup for reviewed-catalog recipes (see
   * lib/favorites-catalog.ts) — merged with the small static catalog below. */
  recipeCatalog: Record<string, FavoriteEntry>;
}

export default function FavoritesGrid({ recipeCatalog }: FavoritesGridProps) {
  const { favorites } = useFavorites();
  const [activeTab, setActiveTab] = useState<FavoriteKind | "all">("all");
  const catalog = useMemo(() => ({ ...getStaticFavoriteCatalog(), ...recipeCatalog }), [recipeCatalog]);

  const rows = favorites
    .map((id) => ({ id, ...catalog[id] }))
    .filter((row): row is { id: string } & FavoriteEntry => Boolean(row.title))
    .filter((row) => activeTab === "all" || row.type === activeTab);

  return (
    <section className="container favorites-shell">
      <div className="favorites-tabs">
        {TABS.map((tab) => (
          <button key={tab.value} className={`chip${activeTab === tab.value ? " active" : ""}`} onClick={() => setActiveTab(tab.value)}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="favorites-grid">
        {rows.map((item) => (
          <FavoriteCard key={item.id} id={item.id} entry={item} />
        ))}
      </div>

      {rows.length === 0 && (
        <div className="empty-state">
          <span>♡</span>
          <h3>עוד לא שמרתם כלום</h3>
          <p>לחצו על הלב ליד מתכון, דייט, משחק או מתנה — והם יחכו לכם כאן.</p>
          <Link className="btn btn-primary" href="/recipes">
            למצוא משהו טעים
          </Link>
        </div>
      )}
    </section>
  );
}

function FavoriteCard({ id, entry }: { id: string; entry: FavoriteEntry }) {
  const { toggleFavorite } = useFavorites();
  return (
    <article className="favorite-card">
      <a href={entry.href}>
        {entry.image ? (
          <img src={entry.image} alt={entry.title} />
        ) : (
          <div className="favorite-placeholder">♡</div>
        )}
        <div className="favorite-card-body">
          <h3>{entry.title}</h3>
          <small>{entry.meta}</small>
        </div>
      </a>
      <button className="mini-heart active" type="button" onClick={() => toggleFavorite(id)}>
        ♥
      </button>
    </article>
  );
}
