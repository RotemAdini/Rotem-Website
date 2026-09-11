import type { FavoriteContentType } from "@/lib/supabase/database.types";

export interface FavoriteAlias {
  contentId: string;
  contentType: FavoriteContentType;
}

export interface FavoriteAliasMap {
  /** Every legacy favourite token -> the canonical item it resolves to. */
  byToken: Map<string, FavoriteAlias>;
  /** Canonical contentId -> every token that resolves to it. */
  tokensByContentId: Map<string, string[]>;
}

/**
 * Pure resolution between the two id spaces favourites live in.
 *
 * localStorage holds legacy tokens — "recipe-instagram-171", "biscuit-cake-07",
 * "date-a-b-03" — because that is what the original static site wrote and those
 * saves still have to work. The favorites table holds canonical contentIds,
 * because a token is tied to a record that may since have been merged into
 * another, while a contentId is permanent.
 *
 * Kept free of any server dependency so it can be unit tested directly; the
 * Sanity-backed map that feeds it lives in ./aliases.
 */

/**
 * Resolves saved tokens to canonical items, collapsing tokens that point at the
 * same item and reporting the ones that point at nothing.
 *
 * The collapsing is the point: a recipe that absorbed a legacy series card
 * answers to both its own token and the absorbed one, and a reader who saved
 * both saved one thing. Without this they would become two inserts that the
 * table's unique constraint rejects.
 *
 * Unresolved tokens are returned rather than dropped. A token with no alias is
 * either content that no longer exists or something written by a much older
 * version of the site; either way, silently discarding a reader's save is the
 * one outcome that is not acceptable, so the caller decides what to do with
 * them and localStorage keeps its copy regardless.
 */
export function resolveTokens(
  tokens: readonly string[],
  aliases: FavoriteAliasMap,
): { resolved: Map<string, FavoriteAlias>; unresolved: string[] } {
  const resolved = new Map<string, FavoriteAlias>();
  const unresolved: string[] = [];

  for (const token of tokens) {
    const alias = aliases.byToken.get(token);
    if (!alias) {
      if (!unresolved.includes(token)) unresolved.push(token);
      continue;
    }
    resolved.set(alias.contentId, alias);
  }

  return { resolved, unresolved };
}

/**
 * Expands saved contentIds back into every token that resolves to them.
 *
 * The whole client API — isFavorite(token), the heart on a card, the
 * favourites grid — speaks tokens, and did before any of this existed. Handing
 * the browser the expanded token list means none of that code has to know
 * whether the source is localStorage or Postgres.
 */
export function expandContentIds(contentIds: readonly string[], aliases: FavoriteAliasMap): string[] {
  const tokens: string[] = [];
  for (const contentId of contentIds) {
    for (const token of aliases.tokensByContentId.get(contentId) ?? []) tokens.push(token);
  }
  return tokens;
}
