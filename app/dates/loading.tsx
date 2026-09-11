/**
 * Shown while the date ideas list is fetched. Same hero and card geometry as
 * the real board, so only the card contents fade in.
 */
export default function DatesLoading() {
  return (
    <main className="page-main" role="status" aria-label="טוען רעיונות לדייט">
      <section className="page-hero date-hero">
        <div className="container page-hero-grid">
          <div>
            <span className="eyebrow">זמן ביחד בלי לחשוב שעה מה עושים</span>
            <h1>
              רעיונות לדייטים <span>♡</span>
            </h1>
            <p>רגע, מסדרת את הרעיונות…</p>
          </div>
        </div>
      </section>

      <section className="container" aria-hidden="true">
        <div className="skeleton-toolbar">
          {Array.from({ length: 5 }).map((_, index) => (
            <span className="skeleton skeleton-chip" key={index} />
          ))}
        </div>
        <div className="dates-grid">
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
