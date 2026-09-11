import "server-only";

import { getSanityClient } from "@/sanity/lib/client";

/**
 * The games data layer, backed by Sanity.
 *
 * Scope is deliberately narrow. Sanity owns the PRODUCT METADATA — what a game
 * is called, how it is described, what it costs, what its card looks like and
 * what its page's <title> says. It does not own the game pages themselves:
 * their markup, CSS, animations and gameplay JavaScript stay in code, under
 * app/games/<slug>/ and content/games/<slug>.html, exactly as they are.
 *
 * That split is the point. A redesign of any single game page is a change to
 * that page's own code and touches nothing here; changing a price or a
 * description is a change here and touches no code.
 *
 * Nothing about purchases, entitlements, Grow, access state or sessions lives
 * in this layer or in the schema behind it.
 */

export interface SanityGameImage {
  path: string;
  role: string | null;
}

export interface SanityGame {
  contentId: string;
  title: string;
  slug: string;
  legacyIds: string[];
  legacyRouteIds: string[];
  tagline: string | null;
  description: string | null;
  kicker: string | null;
  kind: string | null;
  /** Display price for the card. Not an authorization to charge anything. */
  price: number | null;
  ctaLabel: string | null;
  icon: string | null;
  themeClass: string | null;
  images: SanityGameImage[];
  seoTitle: string | null;
  seoDescription: string | null;
  displayOrder: number | null;
  listed: boolean;
  /** Which products a bundle contains. Recorded, not yet rendered. */
  includedGameSlugs: string[];
}

const GAME_FIELDS = /* groq */ `{
  contentId,
  title,
  "slug": slug.current,
  "legacyIds": coalesce(legacyIds, []),
  "legacyRouteIds": coalesce(legacyRouteIds, []),
  tagline,
  description,
  kicker,
  kind,
  price,
  ctaLabel,
  icon,
  themeClass,
  "images": coalesce(legacyImages[]{path, role}, []),
  seoTitle,
  seoDescription,
  displayOrder,
  "listed": coalesce(listed, true),
  "includedGameSlugs": coalesce(includedGames[]->slug.current, [])
}`;

async function fetchGames(filter: string, params: Record<string, unknown> = {}): Promise<SanityGame[]> {
  return getSanityClient().fetch<SanityGame[]>(`*[_type == "game" && ${filter}] ${GAME_FIELDS}`, params);
}

/** The catalog's deliberate order, falling back to title so a product with no
 * displayOrder still lands somewhere stable rather than moving between builds. */
function byDisplayOrder(games: SanityGame[]): SanityGame[] {
  return [...games].sort(
    (a, b) => (a.displayOrder ?? Number.MAX_SAFE_INTEGER) - (b.displayOrder ?? Number.MAX_SAFE_INTEGER) || a.title.localeCompare(b.title, "he"),
  );
}

/* ------------------------------------------------------------- accessors */

export async function getAllGames(): Promise<SanityGame[]> {
  return byDisplayOrder(await fetchGames("true"));
}

/** The products shown in the /games grid. */
export async function getListedGames(): Promise<SanityGame[]> {
  return byDisplayOrder(await fetchGames("listed != false"));
}

/**
 * One product's metadata, for its own page.
 *
 * A game page calls this to fill in its title/description; everything else on
 * that page — structure, styling, behaviour — remains the page's own code.
 */
export async function getGameBySlug(slug: string): Promise<SanityGame | null> {
  const [game] = await fetchGames("slug.current == $slug", { slug });
  return game ?? null;
}

/** Landing pages retain their local metadata when the CMS cannot be read. */
export async function getGameMetadataBySlug(slug: string): Promise<SanityGame | null> {
  try {
    return await getGameBySlug(slug);
  } catch {
    console.warn(`Sanity metadata unavailable for game ${slug}; using local metadata.`);
    return null;
  }
}

export async function getAllGameSlugs(): Promise<string[]> {
  return getSanityClient().fetch<string[]>(`*[_type == "game" && defined(slug.current)].slug.current`);
}

/**
 * Resolves a /games/<segment> URL.
 *
 * The game routes are unchanged by this migration — they are still the English
 * slugs, and each is still its own hand-built page under app/games/. This
 * exists so a future slug change has the same safety net recipes and dates
 * have, not because anything redirects today.
 */
export type GameRouteResolution =
  | { kind: "canonical"; game: SanityGame }
  | { kind: "redirect"; slug: string }
  | { kind: "not-found" };

export async function resolveGameRoute(segment: string): Promise<GameRouteResolution> {
  const canonical = await getGameBySlug(segment);
  if (canonical) return { kind: "canonical", game: canonical };

  const [alias] = await fetchGames("slug.current != $segment && $segment in legacyRouteIds", { segment });
  return alias ? { kind: "redirect", slug: alias.slug } : { kind: "not-found" };
}
