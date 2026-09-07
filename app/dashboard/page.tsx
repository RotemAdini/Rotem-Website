import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "החשבון שלי | רותם עדיני",
};

export default function DashboardPage() {
  return (
    <main className="page-main dashboard-page">
      <section className="container dashboard-header">
        <div>
          <span className="eyebrow">החשבון שלי</span>
          <h1>
            שלום, אורחת <span>♡</span>
          </h1>
          <p>כל מה שתשמרי ותרכשי יופיע כאן.</p>
        </div>
        <Link className="btn btn-secondary" href="/account">
          יציאה מהחשבון
        </Link>
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
              <span>♡</span>
              <h3>עוד לא שמרת כלום</h3>
              <p>לחצי על הלב ליד מתכון, דייט או משחק — והם יחכו לך כאן.</p>
            </div>
          </section>

          <section className="panel dashboard-section" id="purchases">
            <div className="section-head">
              <div>
                <span className="section-kicker">המשחקים שלי</span>
                <h2>גישה למשחקים שרכשת</h2>
              </div>
            </div>
            <div className="empty-state">
              <span>🎲</span>
              <h3>עוד לא רכשת משחק</h3>
              <p>אחרי רכישה דרך אחד מעמודי המשחקים, הגישה שלך תופיע כאן.</p>
              <Link className="btn btn-primary compact" href="/games">
                לקטלוג המשחקים
              </Link>
            </div>
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
        </div>
      </section>
    </main>
  );
}
