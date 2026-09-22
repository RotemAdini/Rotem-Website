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
  dateRelatedHeading,
  dateTag,
} from "@/lib/sanity/date-adapters";
import { SITE_NAME, SITE_URL, absoluteUrl, jsonLdScript, pageMetadata } from "@/lib/seo";

/**
 * A date idea, addressed by its canonical Hebrew slug.
 *
 * Only canonical slugs are prerendered, and only listed ones — an unlisted
 * idea gets no route built for it, and `resolveDateRoute` answers "not-found"
 * for its slug as well, so a direct request is indistinguishable from one for
 * a slug that never existed.
 *
 * The pre-migration numeric URLs (/dates/01 … /dates/13) are answered with a
 * real 308 by the routing-layer redirects in next.config.ts, before this page
 * renders.
 */
export async function generateStaticParams() {
  return (await getAllDateSlugs()).map((slug) => ({ slug }));
}

/**
 * Unknown slug -> real HTTP 404. See app/recipes/[slug]/page.tsx for the
 * measurement behind this: an unknown param rendered on demand lands in a
 * prerender context where `notFound()` cannot set a status, so the 404 page
 * was being served with a 200 and cached for a year.
 *
 * The same trade applies: a date idea newly published or newly listed in
 * Sanity does not appear until the next deploy.
 */
export const dynamicParams = false;

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
  return pageMetadata({
    title: dateIdea.seoTitle?.trim() || `${dateIdea.title} | ${SITE_NAME}`,
    description: dateIdea.seoDescription?.trim() || dateIdea.plan?.whatYouDo?.trim() || dateDescription(dateIdea),
    path: canonicalPath(dateIdea.slug),
    image: dateCardImage(dateIdea),
    type: "article",
  });
}

/**
 * Breadcrumbs only.
 *
 * There is no schema.org type that honestly describes "an idea for an
 * evening": it is not a Recipe, not an Event (it has no date and no venue)
 * and not a Product. Claiming one of those to win a rich result is the kind
 * of mismatch that costs the whole site its eligibility, so this page
 * declares the one thing that is true — where it sits in the site.
 */
function dateJsonLd(title: string, path: string) {
  const url = absoluteUrl(path);
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${url}#breadcrumbs`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "דף הבית", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "רעיונות לדייטים", item: absoluteUrl("/dates") },
      { "@type": "ListItem", position: 3, name: title, item: url },
    ],
  };
}

export default async function DateDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resolution = await resolveDateRoute(decodeSegment(slug));

  // Build-time only now — with dynamicParams = false the routing layer has
  // already 404'd anything that is not a prerendered canonical slug.
  if (resolution.kind === "not-found") notFound();
  if (resolution.kind === "redirect") permanentRedirect(canonicalPath(resolution.slug));

  const { dateIdea } = resolution;
  const galleryImages = dateGalleryImages(dateIdea);
  const favoriteId = dateFavoriteId(dateIdea);
  const plan = datePlan(dateIdea);
  const related = await getRelatedDateIdeas(dateIdea.contentId, 3);

  return (
    <main className="page-main">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(dateJsonLd(dateIdea.title, canonicalPath(dateIdea.slug))) }}
      />
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
            <span aria-hidden="true">›</span>
            <span>{dateIdea.title}</span>
          </div>
          <h1>
            {dateIdea.title} <span aria-hidden="true">♡</span>
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
            <h2>{dateRelatedHeading(dateIdea)}</h2>
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
              tag={dateTag(row)}
              description={dateDescription(row)}
              footerLabel={dateFooterLabel(row)}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
