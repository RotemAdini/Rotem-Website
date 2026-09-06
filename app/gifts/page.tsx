import type { Metadata } from "next";
import GiftsFilterBar from "@/components/GiftsFilterBar";

export const metadata: Metadata = {
  title: "מתנות מומלצות | רותם עדיני",
  description: "רותם עדיני — מתכונים, דייטים, משחקים ומתנות.",
};

export default function GiftsPage() {
  return (
    <main className="page-main">
      <section className="page-hero gifts-hero">
        <div className="container page-hero-grid">
          <div>
            <span className="eyebrow">כשלא יודעים מה לקנות</span>
            <h1>
              מתנות מומלצות <span>♡</span>
            </h1>
            <p>ריכזתי רעיונות למתנות קטנות, זוגיות וחווייתיות שאפשר לסנן לפי תקציב ולפי למי קונים.</p>
          </div>
          <div className="page-hero-art gift-art">
            <img alt="" />
          </div>
        </div>
      </section>

      <GiftsFilterBar />

      <section className="container gifts-shop-grid" id="giftResults" />
      <div className="empty-state container" id="giftEmpty">
        <span>♡</span>
        <h3>אין התאמה לפילטר הזה</h3>
        <p>נסו תקציב או סוג מתנה אחר.</p>
      </div>

      <section className="container disclosure-box">
        <strong>שקיפות קטנה ♡</strong>
        <p>אם בעתיד חלק מהקישורים יהיו קישורי שותפים, אפשר לציין כאן בצורה ברורה שרכישה דרכם עשויה להעניק עמלה ללא תוספת מחיר ללקוח.</p>
      </section>
    </main>
  );
}
