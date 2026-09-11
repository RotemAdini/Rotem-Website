"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "./server";
import { getRequestOrigin } from "./site-url";

/**
 * Server Actions for signing in and out.
 *
 * Google is the only provider, by product decision — there is no email,
 * password, magic link or OTP path anywhere in this codebase, and no password
 * to store, reset or validate.
 *
 * Both actions run on the server so the auth cookies are written by the same
 * client that reads them during rendering. That is also why the sign-in button
 * is a plain <form>: it works before React hydrates, and on a page that is
 * otherwise static.
 */

/**
 * Starts the Google flow.
 *
 * signInWithOAuth does not itself redirect — it returns the URL to send the
 * visitor to, having stored the PKCE verifier in a cookie. The redirect() call
 * must sit outside any try/catch: it works by throwing, and swallowing that
 * would turn a successful sign-in into a silent no-op.
 */
export async function signInWithGoogle(formData?: FormData): Promise<void> {
  const nextRaw = formData?.get("next");
  const next = typeof nextRaw === "string" && nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/dashboard";

  const supabase = await createSupabaseServerClient();
  const origin = await getRequestOrigin();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data?.url) {
    redirect(`/account?error=${encodeURIComponent(error?.message ?? "oauth_start_failed")}`);
  }

  redirect(data.url);
}

/** Clears the session cookies and returns the visitor to the account page. */
export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/account?signedOut=1");
}
