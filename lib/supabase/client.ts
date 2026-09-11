"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseEnv } from "./env";
import type { Database } from "./database.types";

/**
 * Supabase client for Client Components.
 *
 * Reads the session from cookies written by the server client, so the browser
 * and the server agree on who is signed in without a separate token store.
 *
 * Used only where a component genuinely cannot be a Server Component — today
 * that is the header pill, which has to stay client-side so that reading the
 * session does not turn every statically generated page on the site into a
 * per-request render. Sign-in and sign-out themselves run on the server; see
 * lib/supabase/auth-actions.ts.
 */
let browserClient: SupabaseClient<Database> | null = null;

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (!browserClient) {
    const { url, key } = requireSupabaseEnv();
    browserClient = createBrowserClient<Database>(url, key);
  }
  return browserClient;
}
