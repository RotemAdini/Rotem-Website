import type { Metadata } from "next";

/**
 * One place that decides what a page tells a crawler and a link preview.
 *
 * Before this existed, every page hand-wrote a `title` and a `description`
 * and nothing else. Three consequences, all of them invisible in the browser
 * and all of them real:
 *
 *   - `metadataBase` was unset, so the two pages that *did* declare a
 *     `rel="canonical"` (a recipe and a date idea) resolved it against Next's
 *     fallback origin and pointed every canonical at http://localhost:3000.
 *   - No page emitted Open Graph or Twitter tags at all, so a link shared to
 *     WhatsApp, Facebook or Instagram rendered as a bare URL.
 *   - Six pages shared one identical description string.
 *
 * `pageMetadata()` fixes all three by construction: pass a title, a
 * description and the page's own path, and the canonical, the Open Graph
 * block and the Twitter card are derived from them.
 */

export const SITE_NAME = "רותם עדיני";
export const SITE_LOCALE = "he_IL";

/**
 * The site's public origin.
 *
 * Read from NEXT_PUBLIC_SITE_URL, which is already the single source of truth
 * for the OAuth callback (see lib/supabase/site-url.ts) and is documented in
 * .env.example as required in every deployed environment. There is no
 * hardcoded production domain here on purpose — the domain has not been
 * chosen yet, and a guessed one would quietly publish wrong canonicals and a
 * wrong sitemap.
 *
 * The localhost fallback exists so a checkout with no env file still builds.
 * A deployment that hits it is misconfigured, and the warning says so.
 */
function resolveSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    try {
      const parsed = new URL(raw);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        // Origin only: a stray path or query in the env value must not end up
        // prefixed onto every canonical URL on the site.
        return parsed.origin;
      }
    } catch {
      /* fall through to the warning below */
    }
    console.warn(`[seo] NEXT_PUBLIC_SITE_URL is not a usable http(s) URL (${raw}) — falling back to localhost.`);
  }
  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();

/**
 * The link-preview image for pages that have no picture of their own.
 *
 * A recipe or a date idea supplies its own photo, and a game page supplies
 * its product shot from Sanity. Everything else — the homepage, the four hub
 * pages, /about, /faq, /contact and the three legal pages — currently shares
 * a link to nothing, so a share to WhatsApp or Facebook renders as a bare
 * URL with no image.
 *
 * It is `null` rather than a path on purpose: naming a file that does not
 * exist would publish a broken og:image to every one of those pages, which
 * is worse than none. Rotem is preparing the artwork separately.
 *
 * To switch it on, put the file at public/og-default.jpg and change this to
 *
 *   const DEFAULT_OG_IMAGE: string | null = "/og-default.jpg";
 *
 * Nothing else has to change: every page builds its metadata through
 * pageMetadata(), so all of them pick it up at once. Recommended artwork is
 * 1200×630 (the size Facebook, WhatsApp, LinkedIn and X all crop from), JPEG
 * or PNG, under 1 MB, with any text kept well inside the middle two-thirds —
 * the edges are cropped on some clients.
 */
const DEFAULT_OG_IMAGE: string | null = null;

/**
 * A site-relative path, percent-encoded per segment and made absolute.
 *
 * Every canonical slug on this site is Hebrew and some image folders may be
 * too, and a URL in a canonical tag, an og:image or a sitemap has to be
 * ASCII. Encoding per segment rather than whole keeps the slashes as
 * separators, and a path that is already encoded is left alone rather than
 * double-encoded.
 */
export function absoluteUrl(path: string): string {
  const [pathname, ...rest] = path.split("#");
  const encoded = pathname
    .split("/")
    .map((segment) => (segment === "" ? "" : encodeURIComponent(decodeURIComponent(segment))))
    .join("/");
  return new URL(encoded + (rest.length ? `#${rest.join("#")}` : ""), SITE_URL).toString();
}

export interface PageMetadataInput {
  /** The full <title>, including the " | רותם עדיני" suffix the site uses. */
  title: string;
  description?: string;
  /** This page's own canonical path, site-relative and starting with "/". */
  path: string;
  /** A site-relative image path for the link preview, e.g. "/images/…". */
  image?: string | null;
  type?: "website" | "article";
  /** Keep the page out of the index. `follow` stays on: the links are still
   * worth crawling even when the page itself should not be listed. */
  noIndex?: boolean;
}

export function pageMetadata(input: PageMetadataInput): Metadata {
  const { title, description, path, type = "website", noIndex = false } = input;
  const url = absoluteUrl(path);
  // A page's own picture wins; the site-wide fallback covers the rest. Both
  // may be absent, in which case no image tag is emitted at all rather than
  // one pointing at nothing.
  const image = input.image ?? DEFAULT_OG_IMAGE;

  return {
    title,
    description,
    alternates: { canonical: url },
    ...(noIndex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type,
      url,
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      title,
      description,
      ...(image ? { images: [{ url: absoluteUrl(image) }] } : {}),
    },
    twitter: {
      // summary_large_image degrades to a plain summary card when there is no
      // image, so it is safe as the site-wide default.
      card: "summary_large_image",
      title,
      description,
      ...(image ? { images: [absoluteUrl(image)] } : {}),
    },
  };
}

/**
 * Renders a JSON-LD block.
 *
 * The payload is built on the server from this site's own Sanity content and
 * serialised with JSON.stringify, and `<` is escaped so a stray "</script>"
 * inside a recipe title cannot close the tag early.
 */
export function jsonLdScript(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\u003c");
}
