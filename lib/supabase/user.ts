import type { User } from "@supabase/supabase-js";

/**
 * The bits of a Google identity the site actually displays.
 *
 * Google's claims land in user_metadata under several possible keys depending
 * on the provider and the account, so this normalises them once instead of
 * every page guessing. Email is the only field guaranteed to be present, so it
 * is the final fallback for a display name.
 */
export interface DisplayUser {
  id: string;
  email: string;
  name: string;
  /** First name only, for greetings. */
  firstName: string;
  avatarUrl: string | null;
}

export function describeUser(user: User): DisplayUser {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const str = (key: string): string | null => {
    const value = meta[key];
    return typeof value === "string" && value.trim() ? value.trim() : null;
  };

  const email = user.email ?? "";
  const composed = [str("given_name"), str("family_name")].filter(Boolean).join(" ");
  const name = str("full_name") ?? str("name") ?? (composed || email.split("@")[0] || "משתמש");

  return {
    id: user.id,
    email,
    name,
    firstName: str("given_name") ?? name.split(" ")[0],
    avatarUrl: str("avatar_url") ?? str("picture"),
  };
}
