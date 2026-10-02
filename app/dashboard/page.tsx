import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { redirect } from "next/navigation";

import SignOutButton from "@/components/SignOutButton";
import { getOwnedGameLibrary } from "@/lib/entitlements/owned-library";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabaseUser } from "@/lib/supabase/server";
import { describeUser } from "@/lib/supabase/user";

/** Already disallowed in robots.txt; the meta tag is the belt to that
 * braces, for a crawler that reached the URL without reading robots.txt. */
export const metadata: Metadata = pageMetadata({
  title: "האזור האישי | רותם עדיני",
  description: "האזור האישי של המשתמשים הרשומים באתר.",
  path: "/dashboard",
  noIndex: true,
});

/**
 * The signed-in area.
 *
 * The only page on the site that requires a user: a signed-out visitor is sent
 * to /account rather than shown an empty shell. Everything else — recipes,
 * dates, games — stays readable without an account.
 *
 * Favourites are Supabase-backed for a signed-in reader (see
 * lib/favorites-context.tsx): saves go to the account, are readable from any
 * device, and anything saved as a guest in this browser is merged in on first
 * sign-in. This panel links to /favorites rather than repeating the grid.
 *
 * "המשחקים שלי" lists the games this account holds an active entitlement for,
 * read on the server through RLS. A play button appears only for a game whose
 * play route is integrated; that route re-authorizes on every request. The
 * order-history panel is still a placeholder — no payment provider is
 * connected yet, so there is nothing to list.
 */
export default async function DashboardPage() {
  if (!isSupabaseConfigured) redirect("/account");

  const user = await getSupabaseUser();
  if (!user) redirect("/account?next=%2Fdashboard");

  const profile = describeUser(user);
  const library = await getOwnedGameLibrary();

  return (
    <main className="page-main dashboard-page">
      <section className="container dashboard-header">
        <div className="dashboard-identity">
          {profile.avatarUrl ? (
            <img className="dashboard-avatar" src={profile.avatarUrl} alt="" width={64} height={64} referrerPolicy="no-referrer" />
          ) : (
            <div className="dashboard-avatar dashboard-avatar-placeholder" aria-hidden="true">
              ♡
            </div>
          )}
          <div>
            <span className="eyebrow">האזור האישי</span>
            <h1>
              שלום, {profile.firstName} <span aria-hidden="true">♡</span>
            </h1>
            <p>{profile.email}</p>
          </div>
        </div>
        <SignOutButton />
      </section>

      <section className="container dashboard-grid">
        <aside className="panel dashboard-nav">
          <a className="active" href="#saved">
            ♡ המועדפים שלי
          </a>
          <a href="#purchases">🎲 המשחקים שרכשתי</a>
          <a href="#orders">🧾 היסטוריית רכישות</a>
          <a href="#profile">♙ פרטים אישיים</a>
        </aside>

        <div className="dashboard-content">
          <section className="panel dashboard-section" id="saved">
            <div className="section-head">
              <div>
                <span className="section-kicker">שמורים</span>
                <h2>המועדפים שלי</h2>
              </div>
              <Link href="/favorites" className="small-pill">
                לכל המועדפים
              </Link>
            </div>
            <div className="empty-state">
              <span aria-hidden="true">♡</span>
              <h3>המועדפים שלך שמורים בחשבון</h3>
              <p>
                כל מה שסימנתם בלב נשמר לחשבון הזה ומופיע בכל מכשיר שתתחברו ממנו. גם מה ששמרתם לפני ההתחברות צורף
                לחשבון אוטומטית.
              </p>
              <Link className="btn btn-primary compact" href="/favorites">
                לעמוד המועדפים
              </Link>
            </div>
          </section>

          <section className="panel dashboard-section" id="purchases">
            <div className="section-head">
              <div>
                <span className="section-kicker">המשחקים שלי</span>
                <h2>גישה למשחקים שרכשת</h2>
              </div>
            </div>
            {library.status === "unavailable" ? (
              <div className="empty-state" role="status">
                <span aria-hidden="true">🎲</span>
                <h3>לא הצלחנו לטעון את המשחקים כרגע</h3>
                <p>נסו לרענן את העמוד בעוד כמה רגעים.</p>
              </div>
            ) : library.games.length === 0 ? (
              <div className="empty-state">
                <span aria-hidden="true">🎲</span>
                <h3>עוד לא רכשת משחק</h3>
                <p>אחרי רכישה דרך אחד מעמודי המשחקים, הגישה שלך תופיע כאן.</p>
                <Link className="btn btn-primary compact" href="/games">
                  לקטלוג המשחקים
                </Link>
              </div>
            ) : (
              <ul className="owned-games-list">
                {library.games.map((game) => (
                  <li key={game.contentId} className="owned-game">
                    {game.image ? (
                      <img className="owned-game-cover" src={game.image} alt="" width={120} height={150} />
                    ) : (
                      <div className="owned-game-cover" aria-hidden="true">
                        🎲
                      </div>
                    )}
                    <div>
                      <h3>{game.title}</h3>
                      {game.tagline && <p>{game.tagline}</p>}
                      {/* Plain <a>: game pages expect a full page load (see GameShopCard). */}
                      <div className="owned-game-actions">
                        {game.playHref && (
                          <a
                            className="btn btn-primary compact"
                            href={game.playHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`לשחק ב${game.title} — נפתח בחלון חדש`}
                          >
                            לשחק עכשיו
                          </a>
                        )}
                        <a className="btn btn-secondary compact" href={game.detailsHref}>
                          לעמוד המשחק
                        </a>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel dashboard-section" id="orders">
            <span className="section-kicker">רכישות</span>
            <h2>היסטוריית רכישות</h2>
            <div className="orders-table">
              <div className="order-row order-head">
                <span>תאריך</span>
                <span>מוצר</span>
                <span>סכום</span>
                <span>סטטוס</span>
              </div>
            </div>
            <div className="empty-state">
              <span>🧾</span>
              <h3>אין עדיין רכישות</h3>
              <p>ההזמנות שלך יופיעו כאן אחרי הרכישה הראשונה.</p>
            </div>
          </section>

          <section className="panel dashboard-section" id="profile">
            <span className="section-kicker">פרטים אישיים</span>
            <h2>החשבון שלי</h2>
            <div className="profile-rows">
              <div className="profile-row">
                <span>שם</span>
                <strong>{profile.name}</strong>
              </div>
              <div className="profile-row">
                <span>אימייל</span>
                <strong>{profile.email}</strong>
              </div>
              <div className="profile-row">
                <span>אופן ההתחברות</span>
                <strong>Google</strong>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
