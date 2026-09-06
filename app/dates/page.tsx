import type { Metadata } from "next";
import DatesBoard from "@/components/DatesBoard";
import { getDateBoardCards } from "@/lib/date-board";

export const metadata: Metadata = {
  title: "רעיונות לדייטים | רותם עדיני",
  description: "רותם עדיני — מתכונים, דייטים, משחקים ומתנות.",
};

export default function DatesPage() {
  const cards = getDateBoardCards();

  return (
    <main className="page-main">
      <section className="page-hero date-hero">
        <div className="container page-hero-grid">
          <div>
            <span className="eyebrow">זמן ביחד בלי לחשוב שעה מה עושים</span>
            <h1>
              רעיונות לדייטים <span>♡</span>
            </h1>
            <p>דייט בבית, בחוץ, בתקציב קטן או ערב מושקע — בחרו לפי מצב הרוח ותנו לי לחשוב בשבילכם.</p>
          </div>
          <div className="date-hero-collage">
            <img className="collage-a" alt="" />
            <img className="collage-b" alt="" />
            <span className="collage-heart">♡</span>
          </div>
        </div>
      </section>

      <DatesBoard cards={cards} />
    </main>
  );
}
