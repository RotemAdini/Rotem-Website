export { updateSession as proxy } from "@/lib/supabase/middleware";

/**
 * Which requests get a session refresh.
 *
 * Next.js 16 renamed this convention from `middleware` to `proxy`; the helper
 * it delegates to keeps its Supabase-documented name.
 *
 * Everything except static assets and the two script-driven asset trees. The
 * exclusions matter for cost, not correctness: a signed-in visitor loading 40
 * recipe photos should not trigger 40 token refreshes. `/studio` is excluded
 * because Sanity Studio runs its own auth and has no use for a Supabase
 * session cookie.
 *
 * Note what is NOT here: any redirect or gate. This only keeps an existing
 * session alive. Recipes, dates and games stay fully readable while signed
 * out — the only page that requires a user checks for one itself.
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/|games/|studio|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|mp4|mov|woff2?)$).*)"],
};
