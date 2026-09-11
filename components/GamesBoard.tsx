"use client";

import { useMemo, useState } from "react";
import GameShopCard from "./GameShopCard";
import type { GameCatalogItem, GameFilterKind } from "@/lib/types";

const FILTER_LABELS: Record<Exclude<GameFilterKind, "all">, string> = {
  competition: "תחרות",
  deep: "שאלות עומק",
  fun: "צחוק",
  romance: "רומנטי",
};

/** A product whose `kind` is "all" is a bundle: it contains every game, so it
 * belongs under every mood rather than only under "הכל". */
const isBundle = (game: GameCatalogItem) => game.kind === "all";

export default function GamesBoard({ games }: { games: GameCatalogItem[] }) {
  const [filter, setFilter] = useState<GameFilterKind>("all");

  // Chips are derived from the catalogue instead of hardcoded. The list used
  // to include "רומנטי", which no product has ever carried, so selecting it
  // emptied the grid with no explanation. A mood only gets a chip once a game
  // actually has it — which also means tagging one in Sanity brings the chip
  // back on its own.
  const filters = useMemo(() => {
    const kinds = new Set(games.filter((game) => !isBundle(game)).map((game) => game.kind));
    return [
      { value: "all" as GameFilterKind, label: "הכל" },
      ...(Object.keys(FILTER_LABELS) as Exclude<GameFilterKind, "all">[])
        .filter((kind) => kinds.has(kind))
        .map((kind) => ({ value: kind as GameFilterKind, label: FILTER_LABELS[kind] })),
    ];
  }, [games]);

  // What the three games cost bought separately, so the bundle's saving is
  // derived from the catalogue rather than written into the copy by hand.
  const savings = useMemo(() => {
    const bundle = games.find(isBundle);
    if (!bundle || bundle.price == null) return null;
    const singles = games.filter((game) => !isBundle(game) && game.price != null);
    if (singles.length < 2) return null;
    const full = singles.reduce((sum, game) => sum + (game.price as number), 0);
    return full > bundle.price ? { full, saves: full - bundle.price } : null;
  }, [games]);

  const visible = games.filter((game) => filter === "all" || game.kind === filter || isBundle(game));

  return (
    <>
      <section className="container shop-intro">
        <div>
          <span className="section-kicker">בחרו לפי מצב הרוח</span>
          <h2>איזה ערב בא לכם?</h2>
        </div>
        <div className="chips shop-filter">
          {filters.map((item) => (
            <button key={item.value} className={`chip${filter === item.value ? " active" : ""}`} onClick={() => setFilter(item.value)}>
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="container shop-grid" id="games-list">
        {visible.map((game) => (
          <GameShopCard
            key={game.slug}
            game={game}
            compareAtPrice={isBundle(game) ? savings?.full : undefined}
            savesAmount={isBundle(game) ? savings?.saves : undefined}
          />
        ))}
      </section>

      {visible.length === 0 && (
        <div className="container empty-state" id="gamesEmpty">
          <span>♡</span>
          <h3>הקטלוג בדרך</h3>
          <p>המשחקים יופיעו כאן בקרוב.</p>
        </div>
      )}
    </>
  );
}
