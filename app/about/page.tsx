import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "קצת עליי | רותם עדיני",
  description: "רותם עדיני — מתכונים, דייטים, משחקים ומתנות.",
};

export default function AboutPage() {
  return (
    <main className="page-main">
      <section className="about-hero container">
        <div className="about-copy">
          <span className="eyebrow">נעים להכיר</span>
          <h1>
            היי, אני רותם <span>♡</span>
          </h1>
          <p className="lead">אני אוהבת להפוך דברים יומיומיים — ארוחה, ערב בבית או מתנה קטנה — למשהו שמרגיש קצת יותר מיוחד.</p>
          <p>האתר הזה נולד כדי לרכז במקום אחד את הדברים שאני הכי אוהבת ליצור: מתכונים שאפשר באמת להכין, רעיונות לדייטים שלא דורשים הפקה, משחקים זוגיים ורעיונות למתנות.</p>
          <div className="hero-buttons">
            <Link className="btn btn-primary" href="/recipes">
              למתכונים
            </Link>
            <Link className="btn btn-secondary" href="/contact">
              דברו איתי
            </Link>
          </div>
        </div>
        <div className="about-photo-stack">
          <img className="about-photo-main" alt="" />
          <div className="about-note">אוכל טוב + אנשים שאוהבים = רוב הדברים שאני צריכה ♡</div>
        </div>
      </section>

      <section className="container values-grid">
        <article className="panel">
          <span>01</span>
          <h2>פשוט ונגיש</h2>
          <p>דברים שנראים טוב אבל עדיין מרגישים אפשריים בבית ובחיים האמיתיים.</p>
        </article>
        <article className="panel">
          <span>02</span>
          <h2>זוגיות בלי קלישאות</h2>
          <p>רעיונות שיכולים להיות מצחיקים, תחרותיים, עמוקים או סתם כיפיים — תלוי ביום.</p>
        </article>
        <article className="panel">
          <span>03</span>
          <h2>השראה שאפשר להשתמש בה</h2>
          <p>לא רק תמונה יפה, אלא משהו שמישהו יכול לקחת ולעשות כבר היום.</p>
        </article>
      </section>
    </main>
  );
}
