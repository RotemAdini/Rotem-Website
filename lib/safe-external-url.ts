/**
 * Scheme guard for stored URLs that become `href` values.
 *
 * `recipe.sourceUrl` is authored in Sanity and rendered as an external link on
 * a recipe page. Sanity's url validator is an editing aid, not a rendering
 * guarantee: a document imported before the rule existed, pasted from a
 * clipboard, or written by a script can hold anything. A stored
 * `javascript:...` string in an `href` runs as script the moment a reader
 * clicks it, so the scheme is checked where the data is normalized rather than
 * in each component that happens to render it.
 *
 * Only `http:` and `https:` survive. Everything else — `javascript:`,
 * `data:`, `vbscript:`, `file:`, `mailto:`, a protocol-relative `//host/path`,
 * or plain unparseable text — becomes `null`, and a `null` sourceUrl is
 * already the case every renderer handles (most recipes have no source link).
 *
 * A valid URL is returned exactly as stored, not as `new URL(...).href`:
 * re-serializing would silently rewrite existing Instagram links (adding a
 * trailing slash, re-encoding a query) and the point here is to reject the
 * dangerous ones, not to reformat the good ones.
 */
export function safeExternalUrl(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    // No base URL on purpose. A relative or protocol-relative string has no
    // scheme of its own, and guessing one for it is how `//evil.example`
    // becomes a live link.
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  return trimmed;
}
