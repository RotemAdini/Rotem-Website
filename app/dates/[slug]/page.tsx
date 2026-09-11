import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import DateCard from "@/components/DateCard";
import ImageGalleryHero from "@/components/ImageGalleryHero";
import FavoriteButton from "@/components/FavoriteButton";
import DatePlanPanel from "@/components/DatePlanPanel";
import { getAllDateSlugs, getRelatedDateIdeas, resolveDateRoute } from "@/lib/sanity/dates";
import {
  dateCardImage,
  dateDescription,
  dateFavoriteId,
  dateFooterLabel,
  dateGalleryImages,
  dateHref,
  datePlan,
} from "@/lib/sanity/date-adapters";

/**
 * A date idea, addressed by its canonical Hebrew slug.
 *
 * Only canonical slugs are prerendered. The pre-migration numeric URLs
 * (/dates/01 … /dates/13) are served on demand and answered with a 308 to the
 * canonical slug, so an old link keeps working without rendering a second
 * copy of the page at a second URL.
 */
export async function generateStaticParams() {
  return (await getAllDateSlugs()).map((slug) => ({ slug }));
}

/** Next.js hands a dynamic segment through already-decoded when the page was
 * statically generated, but percent-encoded when it renders on demand. */
function decodeSegment(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** A Location header and a rel="canonical" href must be ASCII, and every
 * canonical slug here is Hebrew. */
function canonicalPath(slug: string): string {
  return `/dates/${encodeURIComponent(slug)}`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const resolution = await resolveDateRoute(decodeSegment(slug));

  // A legacy URL must not advertise itself as a page of its own.
  if (resolution.kind !== "canonical") {
    return { title: "רעיון לדייט | רותם עדיני", robots: { index: false, follow: true } };
  }

  const { dateIdea } = resolution;
  return {
    title: dateIdea.seoTitle?.trim() || `${dateIdea.title} | רותם עדיני`,
    description: dateIdea.seoDescription?.trim() || dateIdea.plan?.whatYouDo?.trim() || dateDescription(dateIdea),
    alternates: { canonical: canonicalPath(dateIdea.slug) },
  };
}

export default async function DateDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resolution = await resolveDateRoute(decodeSegment(slug));

  if (resolution.kind === "not-found") notFound();
  if (resolution.kind === "redirect") permanentRedirect(canonicalPath(resolution.slug));

  const { dateIdea } = resolution;
  const galleryImages = dateGalleryImages(dateIdea);
  const favoriteId = dateFavoriteId(dateIdea);
  const plan = datePlan(dateIdea);
  const related = await getRelatedDateIdeas(dateIdea.contentId, 3);

  return (
    <main className="page-main">
      <section className="date-detail container">
        {galleryImages.length ? (
          <ImageGalleryHero
            wrapClassName="date-detail-image"
            images={galleryImages}
            title={dateIdea.title}
            favoriteId={favoriteId}
            favoriteAliases={dateIdea.legacyIds}
            favClassName="fav-btn large-fav"
          />
        ) : (
          <div className="date-detail-image">
            {/* No `src` at all (rather than src="") so it matches the same
                img:not([src]) CSS rule the original static markup relied on,
                without React's empty-string-src warning. */}
            <img alt="" />
            <FavoriteButton id={favoriteId} aliases={dateIdea.legacyIds} className="fav-btn large-fav" />
          </div>
        )}

        <div className="date-detail-copy">
          <div className="breadcrumbs">
            <Link href="/dates">דייטים</Link>
            <span>›</span>
            <span>{dateIdea.title}</span>
          </div>
          <h1>
            {dateIdea.title} <span>♡</span>
          </h1>
          <div className="recipe-actions">
            <Link className="btn btn-primary" href="/dates">
              לכל הרעיונות
            </Link>
          </div>
        </div>
      </section>

      {plan && <DatePlanPanel plan={plan} />}

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
              key={row.contentId}
              href={dateHref(row)}
              title={row.title}
              image={dateCardImage(row)}
              favoriteId={dateFavoriteId(row)}
              favoriteAliases={row.legacyIds}
              tag="סדרה"
              description={dateDescription(row)}
              footerLabel={dateFooterLabel(row)}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
