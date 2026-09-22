import "server-only";

import { cache } from "react";

import { getListedDateIdeas } from "@/lib/sanity/dates";
import { getListedRecipes } from "@/lib/sanity/recipes";
import { dateFavoriteId } from "@/lib/sanity/date-adapters";
import { recipeFavoriteId } from "@/lib/sanity/recipe-adapters";
import type { FavoriteContentType } from "@/lib/supabase/database.types";
import type { FavoriteAliasMap } from "./resolve";

/**
 * The alias map, read from Sanity — the only place that knows the current set
 * of tokens each item answers to.
 *
 * cache() keeps it to one read per request even when several actions run
 * within the same request.
 *
 * Listed items only, on both sides, so an unlisted recipe or idea cannot be
 * hearted, cannot be counted, and cannot be confirmed to exist by probing a
 * token. This destroys nothing: an unresolved token is returned to the caller
 * rather than dropped (see ./resolve), removeFavoriteTokens only ever deletes
 * what resolved, and the Supabase row is never touched — so a favourite saved
 * while an item was public comes back intact if it is listed again.
 */
export const getFavoriteAliasMap = cache(async (): Promise<FavoriteAliasMap> => {
  const [recipes, dateIdeas] = await Promise.all([getListedRecipes(), getListedDateIdeas()]);

  const byToken = new Map<string, { contentId: string; contentType: FavoriteContentType }>();
  const tokensByContentId = new Map<string, string[]>();

  const record = (token: string, contentId: string, contentType: FavoriteContentType) => {
    if (byToken.has(token)) return;
    byToken.set(token, { contentId, contentType });
    const existing = tokensByContentId.get(contentId);
    if (existing) existing.push(token);
    else tokensByContentId.set(contentId, [token]);
  };

  for (const recipe of recipes) {
    for (const token of new Set([recipeFavoriteId(recipe), ...recipe.legacyIds])) {
      record(token, recipe.contentId, "recipe");
    }
  }

  for (const dateIdea of dateIdeas) {
    for (const token of new Set([dateFavoriteId(dateIdea), ...dateIdea.legacyIds])) {
      record(token, dateIdea.contentId, "dateIdea");
    }
  }

  return { byToken, tokensByContentId };
});
