/**
 * Shown while the recipes list is fetched. It repeats the page hero and a grid
 * of card-shaped placeholders so the header stays put and the grid does not
 * jump when the real cards arrive.
 */
export default function RecipesLoading() {
  return (
    <main className="page-main" role="status" aria-label="טוען מתכונים">
      <section className="page-hero compact-hero">
        <div className="container page-hero-grid">
          <div>
            <span className="eyebrow">כל מה שטעים במקום אחד</span>
            <h1>
              המתכונים שלי <span>♡</span>
            </h1>
            <p>רגע, מסדרת את המתכונים…</p>
          </div>
        </div>
      </section>

      <section className="container" aria-hidden="true">
        <div className="skeleton-toolbar">
          {Array.from({ length: 6 }).map((_, index) => (
            <span className="skeleton skeleton-chip" key={index} />
          ))}
        </div>
        <div className="recipe-grid recipes-page-grid">
          {Array.from({ length: 8 }).map((_, index) => (
            <article className="skeleton-card" key={index}>
              <div className="skeleton skeleton-thumb" />
              <div className="skeleton-card-body">
                <span className="skeleton skeleton-line" />
                <span className="skeleton skeleton-line short" />
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
