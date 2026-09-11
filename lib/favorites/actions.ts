"use server";

import { createSupabaseServerClient, getSupabaseUser } from "@/lib/supabase/server";
import { getFavoriteAliasMap } from "./aliases";
import { expandContentIds, resolveTokens } from "./resolve";

/**
 * Server Actions backing signed-in favourites.
 *
 * Everything here speaks legacy tokens on the outside and canonical contentIds
 * on the inside. The browser never has to hold the alias map, and — more
 * importantly — never gets to choose what contentId is written: the server
 * resolves it from Sanity, so a crafted request cannot invent a row.
 *
 * Row Level Security is the real boundary underneath all of this. Every query
 * runs as the signed-in user through the cookie-based client, and the policies
 * on public.favorites restrict each row to its owner. user_id is still set
 * explicitly on insert because the insert policy checks it.
 */

export interface FavoritesResult {
  signedIn: boolean;
  /** Saved items, expanded to every token that resolves to them. */
  tokens: string[];
}

export interface FavoritesMergeResult extends FavoritesResult {
  /** Distinct canonical items the local tokens resolved to. */
  resolved: number;
  /** Rows this merge actually created, i.e. items not already saved. */
  inserted: number;
  /** Tokens that map to no known item. Never dropped — reported back and left
   * in localStorage for a human to look at. */
  unresolved: string[];
}

const EMPTY: FavoritesResult = { signedIn: false, tokens: [] };

/** Reads the signed-in user's saved items, in token space. */
export async function getFavoritesSnapshot(): Promise<FavoritesResult & { userId: string | null }> {
  const user = await getSupabaseUser();
  if (!user) return { ...EMPTY, userId: null };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("favorites").select("content_id").order("created_at", { ascending: false });
  if (error) throw new Error(`Could not read favourites: ${error.message}`);

  const aliases = await getFavoriteAliasMap();
  return {
    signedIn: true,
    userId: user.id,
    tokens: expandContentIds(
      data.map((row) => row.content_id),
      aliases,
    ),
  };
}

/** Saves one item, addressed by any token that resolves to it. */
export async function addFavoriteToken(token: string): Promise<FavoritesResult> {
  const user = await getSupabaseUser();
  if (!user) return EMPTY;

  const aliases = await getFavoriteAliasMap();
  const alias = aliases.byToken.get(token);
  if (!alias) return await currentTokens();

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("favorites").upsert(
    { user_id: user.id, content_id: alias.contentId, content_type: alias.contentType },
    // Saving something already saved is not an error, it is a no-op. This is
    // what makes a double click, a retry and the localStorage merge all safe.
    { onConflict: "user_id,content_type,content_id", ignoreDuplicates: true },
  );
  if (error) throw new Error(`Could not save favourite: ${error.message}`);

  return await currentTokens();
}

/**
 * Removes the items the given tokens resolve to.
 *
 * Takes a list because one item can answer to several tokens: un-hearting a
 * merged recipe has to clear the whole group, or it comes straight back.
 */
export async function removeFavoriteTokens(tokens: string[]): Promise<FavoritesResult> {
  const user = await getSupabaseUser();
  if (!user) return EMPTY;

  const aliases = await getFavoriteAliasMap();
  const { resolved } = resolveTokens(tokens, aliases);
  if (resolved.size === 0) return await currentTokens();

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("favorites")
    .delete()
    .in("content_id", [...resolved.keys()]);
  if (error) throw new Error(`Could not remove favourite: ${error.message}`);

  return await currentTokens();
}

/**
 * Folds whatever is in localStorage into the signed-in user's saved items.
 *
 * Idempotent by construction: tokens collapse to distinct contentIds before
 * the write, and the write ignores conflicts on the table's unique
 * (user_id, content_type, content_id). Running it twice — or on a device that
 * already merged — changes nothing and inserts nothing.
 *
 * Nothing is deleted from localStorage here. The tokens stay exactly where
 * they are, which is both the safety net for the unresolved ones and what lets
 * this be re-run if anything goes wrong.
 */
export async function mergeLocalFavorites(tokens: string[]): Promise<FavoritesMergeResult> {
  const user = await getSupabaseUser();
  if (!user) return { ...EMPTY, resolved: 0, inserted: 0, unresolved: [] };

  const aliases = await getFavoriteAliasMap();
  const { resolved, unresolved } = resolveTokens(tokens, aliases);

  let inserted = 0;
  if (resolved.size > 0) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("favorites")
      .upsert(
        [...resolved.values()].map((alias) => ({
          user_id: user.id,
          content_id: alias.contentId,
          content_type: alias.contentType,
        })),
        { onConflict: "user_id,content_type,content_id", ignoreDuplicates: true },
      )
      .select("content_id");
    if (error) throw new Error(`Could not merge favourites: ${error.message}`);
    // With ignoreDuplicates, only genuinely new rows come back.
    inserted = data?.length ?? 0;
  }

  const snapshot = await currentTokens();
  return { ...snapshot, resolved: resolved.size, inserted, unresolved };
}

/** The user's saved items as tokens, after a write. */
async function currentTokens(): Promise<FavoritesResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("favorites").select("content_id").order("created_at", { ascending: false });
  if (error) throw new Error(`Could not read favourites: ${error.message}`);

  const aliases = await getFavoriteAliasMap();
  return { signedIn: true, tokens: expandContentIds(data.map((row) => row.content_id), aliases) };
}
