import type { SanityGame } from "./games";
import type { GameCatalogItem, GameFilterKind, SearchResult } from "@/lib/types";
import { toPublicPath } from "@/lib/recipe-text";

/**
 * Pure mappings from a Sanity game to the shapes the existing catalog and
 * search already render. The reference is lib/games.ts, still on disk
 * unchanged.
 */

/** The card photo, where a product has one. Products without a photo show
 * their decorative icon instead, exactly as before. */
export function gameCardImage(game: SanityGame): string | undefined {
  const main = game.images.find((image) => image.role === "main") ?? game.images[0];
  return toPublicPath(main?.path ?? null) ?? undefined;
}

/** The route for a product page. Unchanged by this migration: still the
 * English slug, still a hand-built page under app/games/<slug>/. */
export function gameHrefFor(game: SanityGame): string {
  return `/games/${game.slug}`;
}

export function toGameCatalogItem(game: SanityGame): GameCatalogItem {
  return {
    slug: game.slug,
    title: game.title,
    tagline: game.tagline ?? "",
    description: game.description ?? "",
    kind: (game.kind as GameFilterKind) || "all",
    price: game.price,
    kicker: game.kicker ?? "",
    image: gameCardImage(game),
    icon: game.icon ?? undefined,
    themeClass: game.themeClass ?? "",
    // Falls back to the label the card has always shown.
    ctaLabel: game.ctaLabel?.trim() || "לפרטים",
  };
}

export function toGameSearchResult(game: SanityGame): SearchResult {
  const meta = [game.kicker, game.tagline].filter(Boolean).join(" · ");
  // A product is findable by what it is, not only by its name: nobody guesses
  // "היער הקסום" — they type "משחק זוגי".
  const keywords = `משחק זוגי לזוגות דיגיטלי ערב ${game.tagline ?? ""} ${game.description ?? ""}`
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  return {
    type: "game",
    typeLabel: "משחק",
    title: game.title,
    meta,
    href: gameHrefFor(game),
    image: gameCardImage(game) ?? null,
    search: `${game.title} ${meta} ${keywords}`.toLowerCase(),
    keywords,
  };
}
