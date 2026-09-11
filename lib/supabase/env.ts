/**
 * Supabase connection settings.
 *
 * Everything comes from the environment; no URL, key or password is committed.
 * Copy .env.example to .env.local and fill it in — .gitignore already excludes
 * .env*.local.
 *
 * Two things are deliberately NOT read here:
 *
 *   - the service-role / secret key. It bypasses Row Level Security entirely,
 *     so it must never be reachable from a module the browser bundle can
 *     import. Nothing in this codebase reads it yet; when a server-only admin
 *     task eventually needs it, it should read process.env directly inside
 *     that task.
 *   - the database password. That belongs to the Supabase dashboard and the
 *     CLI, not to the application.
 */

/** The project URL, e.g. https://<ref>.supabase.co */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

/**
 * The publishable key.
 *
 * Supabase's newer key scheme calls this the publishable key (`sb_publishable_…`)
 * and it replaces the older `anon` key. Both names are accepted here so the
 * project works whichever the dashboard hands over, with the newer name taking
 * precedence. This key is safe in the browser: it grants nothing on its own,
 * and every table it can reach is gated by Row Level Security.
 */
export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

/** True once the project has been pointed at a real Supabase project. Callers
 * use this to stay dormant rather than throwing while auth is not yet live. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export function requireSupabaseEnv(): { url: string; key: string } {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local (see .env.example).",
    );
  }
  return { url: supabaseUrl, key: supabasePublishableKey };
}
