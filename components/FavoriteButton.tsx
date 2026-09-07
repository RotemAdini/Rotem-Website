"use client";

import { useFavorites } from "@/lib/favorites-context";

interface FavoriteButtonProps {
  id: string;
  className?: string;
  label?: string;
}

/** Heart toggle used on recipe/date cards and detail pages. Ports the
 * original [data-fav] button behavior 1:1 (♡/♥ + "active" class), now
 * backed by the FavoritesProvider/localStorage instead of a raw DOM listener. */
export default function FavoriteButton({ id, className = "fav-btn", label = "הוספה למועדפים" }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const active = isFavorite(id);

  return (
    <button
      type="button"
      className={`${className}${active ? " active" : ""}`}
      aria-label={label}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleFavorite(id);
      }}
    >
      {active ? "♥" : "♡"}
    </button>
  );
}
