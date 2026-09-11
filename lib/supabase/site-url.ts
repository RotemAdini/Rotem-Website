import "server-only";

import { headers } from "next/headers";

/**
 * The site's own public origin, from NEXT_PUBLIC_SITE_URL, or null when it is
 * not configured or not usable.
 *
 * Validated rather than trusted: the value must parse as an absolute URL and
 * must be http or https, and only its origin is kept. Taking `.origin` throws
 * away any path, query or fragment, so a misconfigured
 * "https://example.com/he/?x=1" cannot smuggle anything into a redirect target
 * built from it.
 *
 * This is the only origin that does not come from the incoming request, which
 * is why redirects that hand a browser a session prefer it — see
 * resolvePublicOrigin().
 */
export function getConfiguredSiteOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return null;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  return parsed.origin;
}

/**
 * The origin to build absolute URLs on for a request that ends in a redirect
 * carrying a session.
 *
 * Prefers the configured origin. A request's own origin is derived from the
 * Host / X-Forwarded-Host header, which a client controls, so using it to
 * build the post-sign-in redirect would let a forged Host header choose where
 * a freshly authenticated browser lands. The request origin is kept only as a
 * development fallback, for a local checkout with no NEXT_PUBLIC_SITE_URL set.
 *
 * Set NEXT_PUBLIC_SITE_URL in every deployed environment.
 */
export function resolvePublicOrigin(requestUrl: string): string {
  return getConfiguredSiteOrigin() ?? new URL(requestUrl).origin;
}

/**
 * The origin this request arrived on, e.g. "http://localhost:3000".
 *
 * OAuth needs an absolute callback URL, and hardcoding one would break the
 * moment the site runs anywhere other than where it was hardcoded for. The
 * order below prefers the explicit configured value, then what the request
 * itself says, then a local default:
 *
 *   1. NEXT_PUBLIC_SITE_URL — set this in production, where a proxy may
 *      rewrite the Host header and the request can no longer be trusted to
 *      describe the public address.
 *   2. the request's own forwarded proto/host, which is correct in dev and
 *      behind a well-behaved proxy.
 *   3. http://localhost:3000.
 */
export async function getRequestOrigin(): Promise<string> {
  const configured = getConfiguredSiteOrigin();
  if (configured) return configured;

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (host) {
    const proto = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }

  return "http://localhost:3000";
}
