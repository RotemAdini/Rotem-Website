import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 | רותם עדיני",
};

export default function NotFound() {
  return (
    <main className="not-found-page">
      <section className="container not-found-card">
        <div className="not-found-art">🍰</div>
        <span className="eyebrow">404</span>
        <h1>אופס, העמוד הזה כנראה נאכל</h1>
        <p>העמוד שחיפשתם לא נמצא, אבל יש מספיק דברים טובים אחרים באתר.</p>
        <div className="hero-buttons">
          <Link className="btn btn-primary" href="/">
            חזרה לדף הבית
          </Link>
          <Link className="btn btn-secondary" href="/recipes">
            למתכונים
          </Link>
        </div>
      </section>
    </main>
  );
}
