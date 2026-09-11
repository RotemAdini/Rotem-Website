/**
 * Shown while a single recipe is fetched: a hero-sized block, a title line and
 * a few body lines, matching the detail page's reading column.
 */
export default function RecipeLoading() {
  return (
    <main className="page-main" role="status" aria-label="טוען מתכון">
      <section className="container" aria-hidden="true" style={{ paddingTop: 24 }}>
        <div className="skeleton skeleton-hero" />
        <div className="skeleton-stack">
          <span className="skeleton skeleton-heading" />
          <span className="skeleton skeleton-line" />
          <span className="skeleton skeleton-line" />
          <span className="skeleton skeleton-line short" />
        </div>
      </section>
    </main>
  );
}
