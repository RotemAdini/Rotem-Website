import "server-only";

import { gameCardImage, gameHrefFor } from "@/lib/sanity/game-adapters";
import type { SanityGame } from "@/lib/sanity/games";
import { getOwnedGames } from "./read";
import { FOREST_GAME_CONTENT_ID, FOREST_GAME_PLAY_PATH } from "./require-game-access";

/**
 * The signed-in user's game library, as the dashboard renders it.
 *
 * Ownership comes from getOwnedGames(): active entitlement rows read through
 * the user's own RLS-scoped client, joined to the Sanity catalog. Nothing the
 * browser sends takes part.
 *
 * A play link is offered only for a game that has an integrated, guarded play
 * route. Owning a game whose player is not on the site yet still lists it, with
 * a link to its own page and no invented route. Every play route re-checks
 * ownership on the server, so this is presentation, not authorization.
 */

/** contentId → play route, for games whose player is integrated and guarded. */
const PLAY_ROUTES: Readonly<Record<string, string>> = {
  [FOREST_GAME_CONTENT_ID]: FOREST_GAME_PLAY_PATH,
};

export interface OwnedLibraryGame {
  contentId: string;
  slug: string;
  title: string;
  tagline: string | null;
  image: string | null;
  detailsHref: string;
  playHref: string | null;
}

export type OwnedLibrary =
  | { status: "ready"; games: OwnedLibraryGame[] }
  /** Auth, RLS, database or catalog failure. Rendered with no play links. */
  | { status: "unavailable" };

export function toOwnedLibraryGames(games: readonly SanityGame[]): OwnedLibraryGame[] {
  return games
    // Entitlements are per playable game; a bundle is never itself something to play.
    .filter((game) => game.kind !== "all")
    .map((game) => ({
      contentId: game.contentId,
      slug: game.slug,
      title: game.title,
      tagline: game.tagline,
      image: gameCardImage(game) ?? null,
      detailsHref: gameHrefFor(game),
      playHref: PLAY_ROUTES[game.contentId] ?? null,
    }));
}

export async function getOwnedGameLibrary(): Promise<OwnedLibrary> {
  try {
    return { status: "ready", games: toOwnedLibraryGames(await getOwnedGames()) };
  } catch {
    return { status: "unavailable" };
  }
}
