import Link from "next/link";
import CategoryCarousel from "@/components/CategoryCarousel";
import RecipeCard from "@/components/RecipeCard";
import NewsletterForm from "@/components/NewsletterForm";
import { HOME_CATEGORIES } from "@/lib/categories";
import { getHomeHighlightRecipes, getLatestRecipeImageForCategory, reviewedRecipeCardImage } from "@/lib/recipes";
import { dateSeriesAB } from "@/lib/date-series";

export default function HomePage() {
  const categories = HOME_CATEGORIES.map((category) => ({
    ...category,
    image: getLatestRecipeImageForCategory(category.slug)?.image ?? null,
  }));
  const highlightRecipes = getHomeHighlightRecipes(5);
  const homeDates = dateSeriesAB.filter((item) => item.image).slice(0, 3);

  return (
    <main>
      <section className="hero hero-home">
        <div className="hero-copy">
          <span className="eyebrow">מתכונים, רגעים וזוגיות</span>
          <h1>
            ברוכים הבאים <span>לעולם של רותם עדיני</span>
          </h1>
          <p>מתכונים באהבה, רעיונות לדייטים, משחקים ומתנות — במקום אחד שכולו השראה לחיים קצת יותר טעימים וכיפיים.</p>

          <div className="hero-buttons">
            <Link className="btn btn-primary" href="/recipes">
              לכל המתכונים ♡
            </Link>
            <Link className="btn btn-secondary" href="/about">
              נעים להכיר
            </Link>
          </div>

          <div className="quick-links">
            <Link href="/recipes?quick=30" className="quick-link">
              <span className="quick-icon">◷</span>
              <span>עד 30 דקות</span>
            </Link>
            <Link href="/recipes?quick=no-bake" className="quick-link">
              <span className="quick-icon">🧁</span>
              <span>ללא אפייה</span>
            </Link>
            <Link href="/recipes?quick=easy" className="quick-link">
              <span className="quick-icon">◇</span>
              <span>קל ומהיר</span>
            </Link>
            <Link href="/dates" className="quick-link">
              <span className="quick-icon">♡</span>
              <span>רעיונות לדייט</span>
            </Link>
            <Link href="/games" className="quick-link">
              <span className="quick-icon">🎲</span>
              <span>משחקים לזוג</span>
            </Link>
          </div>
        </div>

        <div className="hero-image hero-image-soft" role="img" aria-label="עוגת תותים חגיגית" />
        <span className="decor decor-heart">♡</span>
      </section>

      <CategoryCarousel categories={categories} />

      <section className="home-feature-grid container">
        <div className="recipes-panel panel">
          <div className="section-head">
            <div>
              <span className="section-kicker">מה חדש במטבח</span>
              <h2>
                המתכונים האחרונים <span>♡</span>
              </h2>
            </div>
            <Link className="small-pill" href="/recipes">
              לכל המתכונים
            </Link>
          </div>

          <div className="recipe-grid home-recipes">
            {highlightRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                href={`/recipes/${recipe.id}`}
                title={recipe.title}
                image={reviewedRecipeCardImage(recipe)}
                favoriteId={`recipe-${recipe.id}`}
                metaLeft={recipe.prepTimeMinutes ? `◷ ${recipe.prepTimeMinutes} דק׳` : ""}
                metaRight={recipe.siteCategory || recipe.foodType || ""}
              />
            ))}
          </div>
        </div>

        <aside className="dates-panel panel">
          <span className="section-kicker">רגעים לשניים</span>
          <div className="section-head no-margin">
            <h2>
              רעיונות לדייטים <span>♡</span>
            </h2>
            <Link className="small-pill" href="/dates">
              לכל הדייטים
            </Link>
          </div>
          <p className="muted">כמה רעיונות פשוטים לערב שזוכרים.</p>

          <div className="date-list">
            {homeDates.map((item) => (
              <Link key={item.id} className="date-item" href={`/dates/${item.id}`}>
                <img src={item.image!} alt={item.title} loading="lazy" />
                <div>
                  <h3>{item.title}</h3>
                  <p>מסדרת הדייטים א׳-ב׳</p>
                  <span>♡</span>
                </div>
              </Link>
            ))}
          </div>
        </aside>
      </section>

      <section className="soft-promos container" aria-label="עוד דברים באתר">
        <Link className="soft-promo" href="/about">
          <div className="soft-promo-copy">
            <span className="section-kicker">נעים להכיר</span>
            <h2>הכירו אותי ♡</h2>
            <p>מי אני, למה התחלתי ליצור ואיך אוכל, זוגיות ורעיונות נפגשים אצלי במקום אחד.</p>
            <span className="text-cta">קראו עוד ←</span>
          </div>
          <img alt="" />
        </Link>

        <Link className="soft-promo" href="/games">
          <div className="soft-promo-copy">
            <span className="section-kicker">לערב קצת אחר</span>
            <h2>משחקים זוגיים ♡</h2>
            <p>משחקים דיגיטליים מצחיקים, מקרבים ותחרותיים — לפי מצב הרוח שלכם.</p>
            <span className="text-cta">למשחקים ←</span>
          </div>
          <div className="mini-game-art">
            <span>♡</span>
            <strong>
              דיבורים
              <br />
              מהלב
            </strong>
          </div>
        </Link>

        <Link className="soft-promo" href="/gifts">
          <div className="soft-promo-copy">
            <span className="section-kicker">מחפשים משהו קטן ומדויק?</span>
            <h2>מתנות מומלצות ♡</h2>
            <p>רעיונות למתנות לפי תקציב, אירוע וסוג האדם שאתם רוצים לשמח.</p>
            <span className="text-cta">למתנות ←</span>
          </div>
          <img alt="" />
        </Link>
      </section>

      <section className="newsletter container">
        <div className="newsletter-copy">
          <span className="script-line">הצטרפו לעדכונים מתוקים</span>
          <p>מתכון חדש, משחק חדש או רעיון לדייט — ישר למייל ♡</p>
        </div>
        <NewsletterForm />
      </section>
    </main>
  );
}
