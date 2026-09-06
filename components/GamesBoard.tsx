"use client";

import { useState } from "react";
import GameShopCard from "./GameShopCard";
import type { GameCatalogItem, GameFilterKind } from "@/lib/types";

const FILTERS: { value: GameFilterKind; label: string }[] = [
  { value: "all", label: "הכל" },
  { value: "competition", label: "תחרות" },
  { value: "deep", label: "שאלות עומק" },
  { value: "fun", label: "צחוק" },
  { value: "romance", label: "רומנטי" },
];

export default function GamesBoard({ games }: { games: GameCatalogItem[] }) {
  const [filter, setFilter] = useState<GameFilterKind>("all");
  const visible = games.filter((game) => filter === "all" || game.kind === filter);

  return (
    <>
      <section className="container shop-intro">
        <div>
          <span className="section-kicker">בחרו לפי מצב הרוח</span>
          <h2>איזה ערב בא לכם?</h2>
        </div>
        <div className="chips shop-filter">
          {FILTERS.map((item) => (
            <button key={item.value} className={`chip${filter === item.value ? " active" : ""}`} onClick={() => setFilter(item.value)}>
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="container shop-grid" id="games-list">
        {visible.map((game) => (
          <GameShopCard key={game.slug} game={game} />
        ))}
      </section>

      {visible.length === 0 && (
        <div className="container empty-state" id="gamesEmpty">
          <span>♡</span>
          <h3>אין עדיין משחק במצב רוח הזה</h3>
          <p>נסו מצב רוח אחר, או עברו על כל המשחקים.</p>
        </div>
      )}
    </>
  );
}
