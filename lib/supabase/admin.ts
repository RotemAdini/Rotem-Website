import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { supabaseUrl } from "./env";
import type { Database } from "./database.types";

/**
 * A Supabase client that bypasses Row Level Security.
 *
 * This exists for exactly one job: writing purchases and entitlements from a
 * payment webhook whose authenticity has already been verified. Those tables
 * have no insert, update or delete policy for any normal role, which is
 * deliberate — the only way a row can appear is through this client, in code
 * running on the server, after a signature check.
 *
 * The rules around it are not negotiable:
 *
 *   * The key is read from SUPABASE_SECRET_KEY, with no NEXT_PUBLIC_ prefix, so
 *     it can never be inlined into the browser bundle.
 *   * `import "server-only"` at the top makes importing this from a Client
 *     Component a build error rather than a runtime surprise.
 *   * It is never used to answer "does this user own this game". That question
 *     is asked with the user's own cookie-backed client, so RLS is doing the
 *     work and a bug in a filter cannot leak another person's access. See
 *     lib/entitlements/read.ts.
 *   * Every call site must set user_id explicitly, because RLS is not there to
 *     do it for you.
 *
 * Not cached in a module-level variable for the same reason the server client
 * is not: a client holding elevated privileges should be created for the
 * request that needs it and then go away.
 */
export function createSupabaseAdminClient(): SupabaseClient<Database> {
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();

  if (!supabaseUrl || !secretKey) {
    throw new Error(
      "Supabase admin client is not configured. Set SUPABASE_SECRET_KEY in .env.local (see .env.example). " +
        "It must never be prefixed with NEXT_PUBLIC_.",
    );
  }

  return createClient<Database>(supabaseUrl, secretKey, {
    auth: {
      // There is no user session here and nothing to persist or refresh; this
      // client acts as the service, not as a person.
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/** Whether the secret key is present, so a caller can stay dormant rather than
 * throwing while payments are not live yet. */
export const isSupabaseAdminConfigured = Boolean(supabaseUrl && process.env.SUPABASE_SECRET_KEY?.trim());
