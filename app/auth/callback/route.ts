import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolvePublicOrigin } from "@/lib/supabase/site-url";

/**
 * The OAuth landing point: Supabase sends the browser here after Google.
 *
 * The URL registered with Google is Supabase's own
 * (https://<ref>.supabase.co/auth/v1/callback); Supabase handles Google, then
 * forwards to this route with a one-time `code`. Exchanging that code is what
 * writes the session cookie, and because the exchange happens on the server
 * the cookie is set for both server and browser in one step.
 *
 * Only pages the visitor already asked for are used as the destination, and
 * only same-origin relative ones — see safeNext().
 *
 * Two properties this route has to hold on to:
 *
 *   - every response here is one-off and may carry a Set-Cookie with a session
 *     token, so none of them may be stored by a shared cache, a CDN or the
 *     browser's back/forward cache. See NO_STORE and redirectTo().
 *   - the absolute URL a response redirects to is built from the configured
 *     public origin, never from this request's own Host header, which the
 *     caller controls. See resolvePublicOrigin().
 */

/** Nothing on this route is ever reusable: it carries a one-time code on the
 * way in and a session cookie on the way out. */
const NO_STORE = "private, no-cache, no-store, max-age=0, must-revalidate";

/** Guards against an open redirect: an attacker-supplied `next` must be a
 * plain path on this site, never an absolute URL or a protocol-relative one. */
function safeNext(raw: string | null): string {
  if (!raw) return "/dashboard";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

/** A redirect that no cache is allowed to keep. */
function redirectTo(url: string): NextResponse {
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", NO_STORE);
  response.headers.set("Pragma", "no-cache");
  return response;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = resolvePublicOrigin(request.url);
  const next = safeNext(searchParams.get("next"));

  // Google or Supabase can report a failure instead of a code — a declined
  // consent screen, or an account that is not on the test-user list while the
  // Google app is still unpublished.
  const error = searchParams.get("error") ?? searchParams.get("error_code");
  if (error) {
    const description = searchParams.get("error_description") ?? error;
    return redirectTo(`${origin}/account?error=${encodeURIComponent(description)}`);
  }

  const code = searchParams.get("code");
  if (!code) {
    return redirectTo(`${origin}/account?error=${encodeURIComponent("missing_code")}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return redirectTo(`${origin}/account?error=${encodeURIComponent(exchangeError.message)}`);
  }

  return redirectTo(`${origin}${next}`);
}
