import Link from "next/link";
import type { Metadata } from "next";
import DateCard from "@/components/DateCard";
import ImageGalleryHero from "@/components/ImageGalleryHero";
import FavoriteButton from "@/components/FavoriteButton";
import DatePlanPanel from "@/components/DatePlanPanel";
import { dateSeriesAB, getDateSeriesItem, getRelatedDateItems } from "@/lib/date-series";

export function generateStaticParams() {
  return dateSeriesAB.map((item) => ({ id: item.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id: rawId } = await params;
  // See app/recipes/[id]/page.tsx for why this decodes unconditionally.
  const id = decodeURIComponent(rawId);
  const item = getDateSeriesItem(id);
  return { title: item ? `${item.title} | רותם עדיני` : "רעיון לדייט | רותם עדיני" };
}

export default async function DateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  // See app/recipes/[id]/page.tsx for why this decodes unconditionally.
  const id = decodeURIComponent(rawId);
  const item = getDateSeriesItem(id);
  const related = getRelatedDateItems(item?.id, 3);
  const galleryImages = item ? [item.image, ...(item.images || [])].filter((src, i, all): src is string => Boolean(src) && all.indexOf(src) === i) : [];

  return (
    <main className="page-main">
      <section className="date-detail container">
        {item?.image ? (
          <ImageGalleryHero wrapClassName="date-detail-image" images={galleryImages} title={item.title} favoriteId={`date-a-b-${item.id}`} favClassName="fav-btn large-fav" />
        ) : (
          <div className="date-detail-image">
            {/* No `src` at all (rather than src="") so it matches the same
                img:not([src]) CSS rule the original static markup relied on,
                without React's empty-string-src warning. */}
            <img alt="" />
            <FavoriteButton id={item ? `date-a-b-${item.id}` : ""} className="fav-btn large-fav" />
          </div>
        )}

        <div className="date-detail-copy">
          <div className="breadcrumbs">
            <Link href="/dates">דייטים</Link>
            <span>›</span>
            <span>{item?.title ?? "רעיון לדייט"}</span>
          </div>
          <h1>
            {item ? `${item.title} ` : "הרעיון לא נמצא "}
            <span>♡</span>
          </h1>
          {!item && <p>אולי הקישור לא מדויק. אפשר לחזור לכל הרעיונות ולמצוא משהו מתאים.</p>}
          <div className="recipe-actions">
            <Link className="btn btn-primary" href="/dates">
              לכל הרעיונות
            </Link>
          </div>
        </div>
      </section>

      {item?.plan && <DatePlanPanel plan={item.plan} />}

      <section className="container related-section">
        <div className="section-head">
          <div>
            <span className="section-kicker">אולי תאהבו גם</span>
            <h2>עוד רעיונות מהסדרה ♡</h2>
          </div>
          <Link href="/dates" className="small-pill">
            לכל הדייטים
          </Link>
        </div>
        <div className="dates-grid">
          {related.map((row) => (
            <DateCard
              key={row.id}
              href={`/dates/${row.id}`}
              title={row.title}
              image={row.image}
              favoriteId={`date-a-b-${row.id}`}
              tag="סדרה"
              description="מסדרת הדייטים א׳-ב׳"
              footerLabel={`רעיון #${row.id}`}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
