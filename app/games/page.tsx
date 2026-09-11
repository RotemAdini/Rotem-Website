import type { Metadata } from "next";
import Link from "next/link";
import GamesBoard from "@/components/GamesBoard";
import { getListedGames } from "@/lib/sanity/games";
import { toGameCatalogItem } from "@/lib/sanity/game-adapters";

export const metadata: Metadata = {
  title: "משחקים לזוג | רותם עדיני",
  description: "רותם עדיני — מתכונים, דייטים, משחקים ומתנות.",
};

export default async function GamesPage() {
  // Product metadata comes from Sanity. The hero, the "how it works" section
  // and the board itself stay in this page's own code.
  const games = (await getListedGames()).map(toGameCatalogItem);
  return (
    <main className="page-main">
      <section className="page-hero games-hero">
        <div className="container page-hero-grid">
          <div>
            <span className="eyebrow">לא עוד &quot;אז מה עושים הערב?&quot;</span>
            <h1>
              משחקים לזוג <span>♡</span>
            </h1>
            <p>משחקים דיגיטליים שנועדו להצחיק, להתחרות, לפתוח שיחה או פשוט להעביר ערב אחר ביחד.</p>
            <div className="hero-buttons">
              <a className="btn btn-primary" href="#games-list">
                לכל המשחקים
              </a>
              <Link className="btn btn-secondary" href="/dates">
                רעיונות לדייטים
              </Link>
            </div>
          </div>
          <div className="games-hero-art">
            <div className="floating-card card-one">
              <small>קלף 01</small>
              <strong>מה הדבר הכי מצחיק שעשינו יחד?</strong>
              <span>♡</span>
            </div>
            <div className="floating-card card-two">
              <small>משימה</small>
              <strong>בחרו מי מתחיל — בלי לדבר</strong>
              <span>→</span>
            </div>
            <div className="floating-card card-three">
              <small>בונוס</small>
              <strong>המפסיד מכין קינוח</strong>
              <span>🍰</span>
            </div>
          </div>
        </div>
      </section>

      <GamesBoard games={games} />

      <section className="container how-it-works" id="how-it-works">
        <div className="section-head">
          <div>
            <span className="section-kicker">פשוט להתחיל לשחק</span>
            <h2>איך זה עובד?</h2>
          </div>
        </div>
        <div className="how-grid">
          <div>
            <span>01</span>
            <h3>בוחרים משחק</h3>
            <p>לפי האווירה שמתאימה לכם הערב.</p>
          </div>
          <div>
            <span>02</span>
            <h3>משאירים פרטים</h3>
            <p>ממשיכים דרך טופס ההרשמה של המשחק שבחרתם.</p>
          </div>
          <div>
            <span>03</span>
            <h3>מקבלים עדכון</h3>
            <p>הרכישה המקוונת עדיין בהקמה — נשלח לכם מייל ברגע שהמשחק ייפתח.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
