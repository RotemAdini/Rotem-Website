import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GiftsFilterBar from "@/components/GiftsFilterBar";
import { FEATURES } from "@/lib/features";

export const metadata: Metadata = {
  title: "מתנות מומלצות | רותם עדיני",
  description: "רותם עדיני — מתכונים, דייטים, משחקים ומתנות.",
  // While the catalogue is behind its flag the route answers 404, but the tag
  // is set regardless so the page can never be indexed if it is served.
  robots: FEATURES.gifts ? undefined : { index: false, follow: false },
};

export default function GiftsPage() {
  // The catalogue is unfinished. Everything below is preserved exactly as it
  // was — flipping FEATURES.gifts back to true restores the page unchanged —
  // but while the flag is off the route must not be reachable, not merely
  // unlinked. notFound() runs at build time, so /gifts is never prerendered
  // as a real page.
  if (!FEATURES.gifts) notFound();

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
