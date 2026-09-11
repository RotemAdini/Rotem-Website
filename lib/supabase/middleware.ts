import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "./env";

/** A response that hands the browser a rotated session token is unique to that
 * browser and valid once. No shared cache, CDN or bfcache may keep it. */
export const SESSION_CACHE_CONTROL = "private, no-cache, no-store, max-age=0, must-revalidate";

type PendingCookie = { name: string; value: string; options: CookieOptions };

/**
 * Copies headers from one response onto another, except the ones the new
 * response owns.
 *
 * NextResponse.next() starts from an empty header set, so each time the
 * outgoing response is rebuilt — which is how a request-side cookie override
 * reaches the page render — anything already written to it would be lost
 * without this.
 *
 * Two families of header are deliberately NOT copied:
 *
 *   - Set-Cookie, because the caller replays the full cookie list onto the new
 *     response itself, and copying the old header too would send each cookie
 *     twice.
 *   - x-middleware-*, which Next.js generates from the request that was handed
 *     to NextResponse.next(). x-middleware-request-cookie in particular is what
 *     a Server Component actually reads. The rebuilt response generates those
 *     from the UPDATED request, so copying the older values back over them
 *     would hand the render the pre-rotation cookie and make a freshly
 *     refreshed visitor render as signed out.
 *
 * Exported for the tests that pin this behaviour; production code calls it
 * only from updateSession().
 */
export function carryOverHeaders(from: NextResponse, to: NextResponse): void {
  from.headers.forEach((value, key) => {
    const name = key.toLowerCase();
    if (name === "set-cookie") return;
    if (name.startsWith("x-middleware-")) return;
    to.headers.set(key, value);
  });
}

/**
 * Refreshes the Supabase session cookie on each request.
 *
 * Active: exported as the proxy from proxy.ts at the repository root, with a
 * matcher that skips static assets, images, the games folder and /studio.
 *
 * Three properties matter here:
 *
 *   - it must return the same response object it wrote cookies onto, or the
 *     refreshed session is silently dropped;
 *   - it must not gate public content. Browsing recipes, dates and games stays
 *     anonymous; this only keeps a session alive when one exists;
 *   - when it does write cookies, the response carries a session token, so it
 *     must not be cacheable and must not lose headers or earlier cookies. See
 *     carryOverHeaders() and pendingCookies below.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  // Without configuration this is a no-op rather than an error, so a fresh
  // clone or a preview build without Supabase env still serves every page.
  if (!isSupabaseConfigured) return response;

  // Every cookie Supabase has asked for during this request, not just the most
  // recent batch: setAll can be called more than once, and each call rebuilds
  // the response from scratch.
  const pendingCookies: PendingCookie[] = [];

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        pendingCookies.push(...cookiesToSet);

        const refreshed = NextResponse.next({ request });
        carryOverHeaders(response, refreshed);
        for (const { name, value, options } of pendingCookies) refreshed.cookies.set(name, value, options);

        response = refreshed;
      },
    },
  });

  // Revalidates the token and rewrites the cookie if it was refreshed. The
  // call is required for its side effect even though the user is unused here.
  await supabase.auth.getUser();

  // Only responses that actually carry a rotated token are made uncacheable —
  // an anonymous visitor's request writes no cookies and keeps whatever
  // caching the static page it asked for already had.
  if (pendingCookies.length > 0) {
    response.headers.set("Cache-Control", SESSION_CACHE_CONTROL);
  }

  return response;
}
