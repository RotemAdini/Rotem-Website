"use client";

import { useFavorites } from "@/lib/favorites-context";
import { trackEvent } from "@/lib/analytics";
import type { ContentKind } from "@/lib/analytics/events";

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
  /** What the button offers to do while the item is *not* saved. */
  label?: string;
  /** What it offers to do once it is. */
  activeLabel?: string;
  /**
   * The item's name, folded into the accessible name when the button sits on
   * a card. A board is a list of near-identical hearts, so "הוספה למועדפים"
   * on its own leaves a screen-reader user with no way to tell which recipe
   * a given heart belongs to.
   */
  itemName?: string;
  /** What kind of thing is being saved, for measurement only. Optional, and
   * omitted at most call sites — the event is still useful without it, and
   * the alternative is threading a prop through every card component for the
   * sake of a metric. */
  contentKind?: ContentKind;
}

/**
 * Best guess at what a favourite token refers to, from the token itself.
 *
 * Tokens are structured: a date idea's is `date-…`, a biscuit-series card's
 * is `biscuit-cake-NN`, everything else is a recipe. This exists so the
 * event can say what kind of thing was saved without a prop being threaded
 * through every card on the site. It is used for measurement only, so a
 * wrong guess costs a mislabelled row in a report and nothing else.
 */
function inferContentKind(token: string): ContentKind {
  if (token.startsWith("date-")) return "date";
  return "recipe";
}

/** Heart toggle used on recipe/date cards and detail pages. Ports the
 * original [data-fav] button behavior 1:1 (♡/♥ + "active" class), now
 * backed by the FavoritesProvider/localStorage instead of a raw DOM listener. */
export default function FavoriteButton({
  id,
  aliases,
  className = "fav-btn",
  label = "הוספה למועדפים",
  activeLabel = "הסרה מהמועדפים",
  itemName,
  contentKind,
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite, removeFavorites } = useFavorites();
  const tokens = aliases?.length ? aliases : [id];
  const savedTokens = tokens.filter((token) => isFavorite(token));
  const active = savedTokens.length > 0;

  // The label tracks the state for two separate reasons, and both matter:
  // the button's *action* reverses when the item is saved (it now removes),
  // and aria-pressed alone would leave the name lying about what pressing it
  // does. The visible ♡/♥ swap carried all of this before, which made the
  // state colour- and glyph-only — invisible to a screen reader (WCAG 4.1.2)
  // and to anyone who cannot distinguish the two glyphs (WCAG 1.4.1).
  const action = active ? activeLabel : label;
  const accessibleName = itemName ? `${action}: ${itemName}` : action;

  return (
    <button
      type="button"
      className={`${className}${active ? " active" : ""}`}
      aria-label={accessibleName}
      aria-pressed={active}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        // Un-hearting clears every token this recipe answers to; otherwise a
        // second saved alias would keep it in the favourites list.
        if (active) removeFavorites(savedTokens);
        else toggleFavorite(id);

        // Measurement only, and a no-op until a provider is configured.
        // Deliberately carries no user id and no item title — the id below
        // is a public content token, the same one that appears in a URL.
        trackEvent(active ? "favorite_remove" : "favorite_add", {
          content_kind: contentKind ?? inferContentKind(id),
          slug: id,
        });
      }}
    >
      <span aria-hidden="true">{active ? "♥" : "♡"}</span>
    </button>
  );
}
