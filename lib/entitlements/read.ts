import "server-only";

import { cache } from "react";

import { getAllGames } from "@/lib/sanity/games";
import type { SanityGame } from "@/lib/sanity/games";
import { createSupabaseServerClient, getSupabaseUser } from "@/lib/supabase/server";

/**
 * Reading who owns what.
 *
 * Two rules hold this together:
 *
 *   1. Ownership is a database row, never a claim. Not a query parameter, not a
 *      success page the browser says it reached, not a redirect it followed,
 *      not a cookie the client can write. If there is no active entitlement
 *      row, the person does not own the game — whatever the URL says.
 *   2. These reads go through the user's own cookie-backed client, so Row Level
 *      Security is what restricts the rows, not a WHERE clause we remembered to
 *      write. The service-role client is deliberately NOT used here: it bypasses
 *      RLS, so a mistake in a filter would leak somebody else's access. It is
 *      only for writes from a verified webhook.
 *
 * "Owned" means: AT LEAST ONE un-revoked row exists for (user, game). Not "a
 * row exists" — the same game can be granted by more than one purchase, e.g.
 * bought on its own and then again inside a bundle. Each grant is its own row,
 * so refunding one purchase revokes only its rows and any other live grant
 * keeps the game playable. A refund sets revoked_at rather than deleting, so
 * the history survives while access stops.
 *
 * Nothing here is wired into a page yet. /my-games and the /play guards are a
 * later task; this is the layer they will call.
 */

/**
 * The contentIds of every game the signed-in user currently owns.
 *
 * Returns an empty array when nobody is signed in, so callers can treat "signed
 * out" and "owns nothing" the same way — which for an access check is exactly
 * right.
 *
 * cache() keeps it to one query per request even when a page asks several
 * times, e.g. once for a listing and once per card.
 */
export const getOwnedGameContentIds = cache(async (): Promise<string[]> => {
  const user = await getSupabaseUser();
  if (!user) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("entitlements")
    .select("game_content_id")
    .is("revoked_at", null)
    .order("granted_at", { ascending: false });

  if (error) throw new Error(`Could not read entitlements: ${error.message}`);

  // Deduplicated: two live grants for one game — a single purchase and a bundle
  // that also contained it — are two rows but one owned game.
  return [...new Set(data.map((row) => row.game_content_id))];
});

/**
 * Whether the signed-in user owns one particular game.
 *
 * Takes a contentId rather than a slug on purpose: a slug can be edited and a
 * game's URL is expected to change, and access must not depend on that. A
 * caller holding only a slug should resolve it through the games data layer
 * first — a lookup that fails closed.
 */
export async function ownsGame(gameContentId: string): Promise<boolean> {
  if (!gameContentId) return false;
  const owned = await getOwnedGameContentIds();
  return owned.includes(gameContentId);
}

/**
 * The signed-in user's owned games as full catalog entries, in the catalog's
 * own order — what /my-games will render.
 *
 * The entitlement rows carry contentIds and nothing else; every title, price
 * and image still comes from Sanity. An entitlement whose game no longer exists
 * in the catalog is skipped rather than rendered as a broken card, and is
 * deliberately not deleted: the row is the record that someone paid.
 */
export async function getOwnedGames(): Promise<SanityGame[]> {
  const owned = new Set(await getOwnedGameContentIds());
  if (owned.size === 0) return [];

  const games = await getAllGames();
  return games.filter((game) => owned.has(game.contentId));
}
