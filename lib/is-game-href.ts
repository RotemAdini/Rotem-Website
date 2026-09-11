/**
 * A game landing page under /games/<slug>.
 *
 * Those pages are legacy widgets rendered from raw HTML with their own
 * <script>-driven behaviour (parallax, sticky buy bar, lead form) that expects
 * a fresh document load. Linking to one with next/link would soft-navigate and
 * skip that initialisation, so every surface that can link to a game keeps a
 * plain <a> for exactly those hrefs. See components/GameShopCard.tsx.
 */
export function isGameHref(href: string): boolean {
  return /^\/games\/[^/]+$/.test(href);
}
