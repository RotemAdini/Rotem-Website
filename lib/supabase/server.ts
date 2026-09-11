import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseEnv } from "./env";
import type { Database } from "./database.types";

/**
 * Supabase client for Server Components, Route Handlers and Server Actions.
 *
 * Cookie-based: the session travels in cookies rather than in a token held by
 * client-side JavaScript, so a Server Component can tell who is signed in
 * while rendering.
 *
 * A fresh client is created per request — never cached in a module-level
 * variable. Caching one would leak one visitor's session into another
 * visitor's request, which is the single most dangerous mistake available in
 * this file.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient<Database>> {
  const { url, key } = requireSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Session refresh happens in the proxy instead — see
          // lib/supabase/middleware.ts, wired up in proxy.ts.
        }
      },
    },
  });
}

/**
 * The signed-in user, or null.
 *
 * Uses getUser() rather than getSession(): getUser() revalidates the token
 * with the Supabase auth server, while a session read from a cookie is only as
 * trustworthy as the cookie. Anything that gates access must use this.
 *
 * Wrapped in React's cache() so that a page which needs the user in both
 * generateMetadata() and the component body makes one round trip to the auth
 * server, not two. cache() is per-request, so this does not share a user
 * between visitors the way a module-level variable would.
 */
export const getSupabaseUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
