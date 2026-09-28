import "server-only";

import { getOwnedGameContentIds } from "./read";

interface CatalogOwnershipCandidate {
  contentId: string;
  kind: string | null;
  slug: string;
}

/**
 * Ownership state used to decorate the public games catalog.
 * Any authentication, RLS, or database failure renders every game as locked.
 * Play-route authorization remains a separate server-side requirement.
 */
export async function getCatalogOwnedGameContentIds(): Promise<string[]> {
  try {
    return await getOwnedGameContentIds();
  } catch {
    return [];
  }
}

/** Map canonical entitlement matches to the slugs the catalog UI renders. */
export function getOwnedIndividualGameSlugs(
  games: CatalogOwnershipCandidate[],
  ownedGameContentIds: string[],
): string[] {
  const ownedContentIds = new Set(ownedGameContentIds);
  return games
    .filter((game) => game.kind !== "all" && ownedContentIds.has(game.contentId))
    .map((game) => game.slug);
}
