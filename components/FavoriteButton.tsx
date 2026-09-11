"use client";

import { useFavorites } from "@/lib/favorites-context";

interface FavoriteButtonProps {
  id: string;
  /**
   * Every token this item answers to, when it has more than one.
   *
   * Merging two records leaves a reader who favourited the absorbed one with
   * a token that is no longer the surviving recipe's primary id. Without
   * checking the aliases, that recipe's heart would read as un-favourited on
   * the board while the recipe still sat in their favourites list. Defaults
   * to just `id`, so every other caller is unchanged.
   */
  aliases?: string[];
  className?: string;
  label?: string;
}

/** Heart toggle used on recipe/date cards and detail pages. Ports the
 * original [data-fav] button behavior 1:1 (♡/♥ + "active" class), now
 * backed by the FavoritesProvider/localStorage instead of a raw DOM listener. */
export default function FavoriteButton({ id, aliases, className = "fav-btn", label = "הוספה למועדפים" }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite, removeFavorites } = useFavorites();
  const tokens = aliases?.length ? aliases : [id];
  const savedTokens = tokens.filter((token) => isFavorite(token));
  const active = savedTokens.length > 0;

  return (
    <button
      type="button"
      className={`${className}${active ? " active" : ""}`}
      aria-label={label}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        // Un-hearting clears every token this recipe answers to; otherwise a
        // second saved alias would keep it in the favourites list.
        if (active) removeFavorites(savedTokens);
        else toggleFavorite(id);
      }}
    >
      {active ? "♥" : "♡"}
    </button>
  );
}
