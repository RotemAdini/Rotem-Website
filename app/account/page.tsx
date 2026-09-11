import type { Metadata } from "next";
import Link from "next/link";

import GoogleSignInButton from "@/components/GoogleSignInButton";
import SignOutButton from "@/components/SignOutButton";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabaseUser } from "@/lib/supabase/server";
import { describeUser } from "@/lib/supabase/user";

/**
 * The tab title should not say "sign in" to someone who is already signed in.
 * This page is rendered per-request either way, and getSupabaseUser() is
 * request-cached, so reading the user here costs no extra round trip.
 */
export async function generateMetadata(): Promise<Metadata> {
  const user = isSupabaseConfigured ? await getSupabaseUser() : null;
  return {
    title: user ? "החשבון שלי | רותם עדיני" : "התחברות | רותם עדיני",
    description: "רותם עדיני — מתכונים, דייטים, משחקים ומתנות.",
  };
}

/**
 * Sign-in, and the signed-in confirmation.
 *
 * Google is the only provider, so there is no tabbed login/register UI and no
 * email or password field anywhere on this page. The surrounding card markup
 * is the same as before, so the page keeps its existing styling.
 */
export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string; signedOut?: string }> }) {
  const { error, signedOut } = await searchParams;
  const user = isSupabaseConfigured ? await getSupabaseUser() : null;
  const profile = user ? describeUser(user) : null;

  return (
    <main className="page-main auth-page">
      <section className="auth-shell container panel">
        <div className="auth-visual">
          <span className="eyebrow">המקום שלכם באתר</span>
          <h1>
            שמרו את כל מה שאהבתם <span>♡</span>
          </h1>
          <p>
            עם חשבון, המתכונים והדייטים שתסמנו בלב נשמרים לחשבון עצמו — כך הם מחכים לכם בכל מכשיר שתתחברו ממנו, ולא
            רק בדפדפן הזה.
          </p>
        </div>

        <div className="auth-card">
          {profile ? (
            <>
              <h2>כבר מחוברים ♡</h2>
              <div className="auth-identity">
                {profile.avatarUrl ? (
                  <img className="auth-avatar" src={profile.avatarUrl} alt="" width={56} height={56} referrerPolicy="no-referrer" />
                ) : (
                  <div className="auth-avatar auth-avatar-placeholder" aria-hidden="true">
                    ♡
                  </div>
                )}
                <div>
                  <strong>{profile.name}</strong>
                  <span>{profile.email}</span>
                </div>
              </div>
              <Link className="btn btn-primary full" href="/dashboard">
                לאזור האישי
              </Link>
              <SignOutButton className="btn btn-secondary full" />
            </>
          ) : (
            <>
              <h2>כיף שבאתם</h2>
              <p className="auth-lead">
                התחברות מהירה עם חשבון Google — בלי סיסמה חדשה לזכור. מה שכבר שמרתם בדפדפן הזה יצורף לחשבון
                אוטומטית.
              </p>

              {signedOut && (
                <p className="auth-note" role="status">
                  התנתקתם בהצלחה. להתראות ♡
                </p>
              )}
              {error && (
                <p className="auth-error" role="alert">
                  ההתחברות לא הושלמה: {error}
                </p>
              )}

              {isSupabaseConfigured ? (
                <GoogleSignInButton />
              ) : (
                <p className="auth-error" role="alert">
                  ההתחברות אינה מוגדרת בסביבה הזו.
                </p>
              )}

              <p className="micro-note">
                אפשר להמשיך לגלוש באתר בלי להתחבר — כל המתכונים, הדייטים והמשחקים פתוחים לכולם.
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
