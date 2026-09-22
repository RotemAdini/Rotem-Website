import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import RecipeCard from "@/components/RecipeCard";
import ImageGalleryHero from "@/components/ImageGalleryHero";
import CopyLinkButton from "@/components/CopyLinkButton";
import IngredientsList from "@/components/IngredientsList";
import StepsList from "@/components/StepsList";
import FavoriteButton from "@/components/FavoriteButton";
import {
  getAllRecipeSlugs,
  getRelatedRecipes,
  getRelatedSeriesRecipes,
  resolveRecipeRoute,
  type SanityRecipe,
} from "@/lib/sanity/recipes";
import {
  isSeriesStandIn,
  recipeCardImage,
  recipeFavoriteId,
  recipeGalleryImages,
  recipeHeroImage,
  recipeHref,
} from "@/lib/sanity/recipe-adapters";
import { SITE_NAME, SITE_URL, absoluteUrl, jsonLdScript, pageMetadata } from "@/lib/seo";
import { parseIsraeliDate } from "@/lib/recipe-text";

/**
 * A recipe page, addressed by its canonical Hebrew slug.
 *
 * Every listed recipe's canonical slug is prerendered here, and
 * `dynamicParams = false` means anything else is a genuine 404 from the
 * routing layer. Every pre-migration URL — the raw Instagram-caption ids, the
 * `instagram-NN` ids and the `biscuit-cake-NN` series pages — is answered
 * with a 308 by next.config.ts, which runs before routing, so an old link
 * keeps working without ever rendering a second copy of the page at a second
 * URL.
 */
export async function generateStaticParams() {
  return (await getAllRecipeSlugs()).map((slug) => ({ slug }));
}

/**
 * Unknown slug -> real HTTP 404.
 *
 * Without this, Next renders an unknown param on demand in a *prerender*
 * context, where `notFound()` cannot set a status: measured on the
 * production build, /recipes/not-a-recipe answered **200** with
 * `x-nextjs-prerender: 1` and `Cache-Control: s-maxage=31536000` — the 404
 * page's body under a success status, cached for a year, for every bogus URL
 * a crawler invents. That is a soft 404, and it is the same limitation
 * next.config.ts documents for redirects.
 *
 * The cost, accepted deliberately: a recipe published in Sanity does not
 * appear until the next deploy, because its slug is not in the list above
 * until `generateStaticParams` runs again. A Sanity-to-Netlify deploy hook
 * is the intended answer to that.
 */
export const dynamicParams = false;

/** Next.js hands a dynamic segment through already-decoded when the page was
 * statically generated, but percent-encoded when it renders on demand.
 * Decoding unconditionally handles both for the site's Hebrew slugs. */
function decodeSegment(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** The canonical path for a slug, percent-encoded.
 *
 * Encoding is not optional here: a Location header (and a rel="canonical"
 * href) must be ASCII, and every canonical slug on this site is Hebrew.
 * Passing the raw slug makes Node reject the response with
 * ERR_INVALID_CHAR and the redirect becomes a 500. */
function canonicalPath(slug: string): string {
  return `/recipes/${encodeURIComponent(slug)}`;
}

/**
 * The meta description for a recipe that has no hand-written seoDescription —
 * which today is all 159 of them.
 *
 * The previous fallback was `siteCategory · foodType · prepTime`, which on 27
 * recipes printed the same word twice ("עוגיות · עוגיות · 35 דקות הכנה")
 * because those two fields agree, and on the rest read as a list of tags
 * rather than a sentence. It also preferred `notes` ahead of that, but notes
 * is the "שימו לב" tip box — a substitution hint or a storage note — which is
 * not a summary of the recipe and reads oddly as a search snippet.
 *
 * Everything below is assembled from fields the recipe actually stores;
 * nothing is inferred. The closing sentence is added only for a recipe that
 * genuinely has steps, so a series stand-in does not promise a method it does
 * not have.
 */
function fallbackDescription(recipe: SanityRecipe): string {
  const facts = [
    ...new Set([recipe.siteCategory, recipe.foodType].filter((value): value is string => Boolean(value?.trim()))),
    recipe.requiresOven === false ? "ללא אפייה" : null,
    recipe.difficulty?.trim() ? `רמת קושי ${recipe.difficulty.trim()}` : null,
    recipe.prepTimeMinutes ? `${recipe.prepTimeMinutes} דקות הכנה` : null,
  ].filter((value): value is string => Boolean(value));

  const head = facts.length ? `${recipe.title} — ${facts.join(" · ")}.` : `${recipe.title}.`;
  return recipe.instructions.length ? `${head} מתכון מלא עם רשימת המצרכים וכל שלבי ההכנה.` : head;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const resolution = await resolveRecipeRoute(decodeSegment(slug));

  // A legacy URL must not advertise itself as a page of its own: it redirects,
  // and the canonical page is the only indexable copy.
  if (resolution.kind !== "canonical") {
    return { title: "מתכון | רותם עדיני", robots: { index: false, follow: true } };
  }

  const { recipe } = resolution;
  const description = recipe.seoDescription?.trim() || fallbackDescription(recipe);

  return pageMetadata({
    title: recipe.seoTitle?.trim() || `${recipe.title} | ${SITE_NAME}`,
    description,
    path: canonicalPath(recipe.slug),
    // The full-size photo, not the card thumbnail: a link preview is rendered
    // large, and the thumbnail is the same picture at a size that blurs.
    image: recipeHeroImage(recipe),
    type: "article",
  });
}

/**
 * The schema.org description of this recipe, for Google's recipe rich result.
 *
 * Only fields the recipe genuinely has are emitted — an absent prep time or a
 * stand-in with no ingredients simply omits the property rather than being
 * given an invented one. `totalTime` is written as an ISO 8601 duration,
 * which is the only form the spec accepts.
 *
 * A series stand-in never gets this block at all: it has no ingredients and
 * no instructions, so it is not a recipe in schema.org's sense, and marking
 * it as one would be exactly the structured-data-does-not-match-the-page
 * mismatch that gets rich results withdrawn site-wide.
 */
function recipeJsonLd(recipe: SanityRecipe) {
  const url = absoluteUrl(canonicalPath(recipe.slug));
  const image = recipeHeroImage(recipe);
  const published = parseIsraeliDate(recipe.publishedDate);
  const keywords = [recipe.foodType, recipe.series, ...recipe.tags, ...recipe.holidays].filter(Boolean).join(", ");

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Recipe",
        "@id": `${url}#recipe`,
        name: recipe.title,
        url,
        inLanguage: "he-IL",
        author: { "@type": "Person", name: SITE_NAME, url: `${SITE_URL}/` },
        ...(image ? { image: [absoluteUrl(image)] } : {}),
        ...(recipe.seoDescription?.trim() || recipe.notes?.trim()
          ? { description: recipe.seoDescription?.trim() || recipe.notes?.trim() }
          : {}),
        ...(published ? { datePublished: new Date(published).toISOString().slice(0, 10) } : {}),
        ...(recipe.prepTimeMinutes ? { totalTime: `PT${recipe.prepTimeMinutes}M` } : {}),
        ...(recipe.siteCategory ? { recipeCategory: recipe.siteCategory } : {}),
        ...(keywords ? { keywords } : {}),
        recipeIngredient: recipe.ingredients,
        recipeInstructions: recipe.instructions.map((text, index) => ({
          "@type": "HowToStep",
          position: index + 1,
          text,
        })),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumbs`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "דף הבית", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "מתכונים", item: absoluteUrl("/recipes") },
          { "@type": "ListItem", position: 3, name: recipe.title, item: url },
        ],
      },
    ],
  };
}

export default async function RecipeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resolution = await resolveRecipeRoute(decodeSegment(slug));

  // Both branches are now build-time only. With dynamicParams = false the
  // routing layer has already 404'd anything that is not a prerendered
  // canonical slug, so neither can be reached by a request — they still
  // matter while generateStaticParams' list is being rendered, if a recipe
  // is unlisted or retired between that query and this one.
  if (resolution.kind === "not-found") notFound();
  if (resolution.kind === "redirect") permanentRedirect(canonicalPath(resolution.slug));

  const { recipe } = resolution;
  return isSeriesStandIn(recipe) ? <SeriesStandInDetail recipe={recipe} /> : <FullRecipeDetail recipe={recipe} />;
}

/* --------------------------------------------------------- full recipe */

async function FullRecipeDetail({ recipe }: { recipe: SanityRecipe }) {
  const heroImage = recipeHeroImage(recipe);
  const galleryImages = recipeGalleryImages(recipe);
  const favoriteId = recipeFavoriteId(recipe);
  const related = await getRelatedRecipes(recipe, 3);

  return (
    <main className="page-main">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(recipeJsonLd(recipe)) }} />
      <section className={`recipe-detail-hero container reviewed-recipe-hero ${heroImage ? "has-recipe-image" : "no-recipe-image"}`}>
        <Link className="recipe-back-link" href="/recipes" aria-label="חזרה לכל המתכונים">
          <span aria-hidden="true">→</span> לכל המתכונים
        </Link>

        {/* With a hero image the save button lives on the image. Without one it
            used to sit in a 0-height slot, which left a 44px circle floating in
            the margin beside the title — and, because it is absolutely
            positioned, pushed the page 48px wider than the viewport on a
            phone. It now sits inline next to the title instead. */}
        {heroImage && (
          <ImageGalleryHero wrapClassName="recipe-main-image" images={galleryImages} title={recipe.title} favoriteId={favoriteId} favoriteAliases={recipe.legacyIds} />
        )}

        <div className="recipe-intro">
          <nav className="breadcrumbs" aria-label="מסלול ניווט">
            <Link href="/recipes">מתכונים</Link>
            <span aria-hidden="true">›</span>
            {recipe.categorySlug && recipe.siteCategory && (
              <>
                <Link href={`/recipes?category=${encodeURIComponent(recipe.categorySlug)}`}>{recipe.siteCategory}</Link>
                <span aria-hidden="true">›</span>
              </>
            )}
            <span aria-current="page">{recipe.title}</span>
          </nav>
          <div className="recipe-title-row">
            <h1>{recipe.title}</h1>
            {!heroImage && (
              <FavoriteButton id={favoriteId} aliases={recipe.legacyIds} className="fav-btn recipe-title-fav" label="שמירה למועדפים" />
            )}
          </div>
          <p>{recipe.foodType || ""}</p>
          <div className="recipe-stats">
            <div>
              <strong>{recipe.siteCategory || "—"}</strong>
              <span>קטגוריה</span>
            </div>
            <div>
              <strong>{recipe.difficulty || "—"}</strong>
              <span>רמת קושי</span>
            </div>
            <div>
              <strong>{recipe.prepTimeMinutes ? `${recipe.prepTimeMinutes} דק׳` : "—"}</strong>
              <span>זמן הכנה</span>
            </div>
            <div>
              <strong>{recipe.publishedDate || "—"}</strong>
              <span>פורסם</span>
            </div>
          </div>
          {/* A paid-partnership or credit line. Deliberately its own element
              above the tip box, and never a numbered step — disclosure buried
              as "step 20 of 20" is not disclosure. */}
          {recipe.disclosure && (
            <p className="recipe-disclosure">
              <span className="recipe-disclosure-label">גילוי נאות</span>
              {recipe.disclosure}
            </p>
          )}
          {recipe.notes && (
            <div className="tip-box">
              <strong>שימו לב</strong>
              <p>{recipe.notes}</p>
            </div>
          )}
          <div className="recipe-actions">
            {recipe.sourceUrl && (
              <a className="btn btn-primary" href={recipe.sourceUrl} target="_blank" rel="noopener">
                לצפייה בפוסט באינסטגרם
              </a>
            )}
            <Link className="btn btn-secondary" href="/recipes">
              לכל המתכונים
            </Link>
            <CopyLinkButton />
          </div>
        </div>
      </section>

      <section className="container recipe-content-grid reviewed-recipe-content">
        <section className="ingredients-card panel" aria-labelledby="recipe-ingredients-heading">
          <span className="section-kicker">מצרכים</span>
          <h2 id="recipe-ingredients-heading">מה צריך?</h2>
          <IngredientsList ingredients={recipe.ingredients} storageKey={recipe.contentId} />
        </section>
        <article className="instructions-card panel">
          <span className="section-kicker">אופן הכנה</span>
          <h2>איך מכינים?</h2>
          <StepsList instructions={recipe.instructions} />
        </article>
      </section>

      {related.length > 0 && (
        <section className="container related-section">
          <div className="section-head">
            <div>
              <span className="section-kicker">אולי תאהבו גם</span>
              <h2>עוד מתכונים מתוקים ♡</h2>
            </div>
            <Link href="/recipes" className="small-pill">
              לכל המתכונים
            </Link>
          </div>
          <div className="recipe-grid related-grid">
            {related.map((row) => (
              <RecipeCard
                key={row.contentId}
                href={recipeHref(row)}
                title={row.title}
                image={recipeCardImage(row)}
                favoriteId={recipeFavoriteId(row)}
                favoriteAliases={row.legacyIds}
                metaLeft={row.siteCategory || ""}
                metaRight={row.prepTimeMinutes ? `${row.prepTimeMinutes} דק׳` : ""}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

/* ---------------------------------------------------- series stand-in */

/**
 * A series card with no ingredients or instructions behind it yet. Rendered
 * through its own template — the same one the previous implementation used —
 * so it shows a "more from the series" strip instead of two empty panels.
 */
async function SeriesStandInDetail({ recipe }: { recipe: SanityRecipe }) {
  const heroImage = recipeHeroImage(recipe);
  const galleryImages = recipeGalleryImages(recipe);
  const favoriteId = recipeFavoriteId(recipe);
  const related = recipe.series ? await getRelatedSeriesRecipes(recipe.series, recipe.contentId, 3) : [];

  return (
    <main className="page-main">
      <section className="recipe-detail-hero container">
        <Link className="recipe-back-link" href="/recipes" aria-label="חזרה לכל המתכונים">
          <span aria-hidden="true">→</span> לכל המתכונים
        </Link>

        {heroImage ? (
          <ImageGalleryHero wrapClassName="recipe-main-image" images={galleryImages} title={recipe.title} favoriteId={favoriteId} favoriteAliases={recipe.legacyIds} />
        ) : (
          <div className="recipe-main-image">
            {/* No `src` at all (rather than src="") so it matches the same
                img:not([src]) CSS rule the original static markup relied on,
                without React's empty-string-src warning. */}
            <img alt="" />
            <FavoriteButton id={favoriteId} aliases={recipe.legacyIds} className="fav-btn large-fav" label="שמירה למועדפים" />
          </div>
        )}

        <div className="recipe-intro">
          <div className="breadcrumbs">
            <Link href="/recipes">מתכונים</Link>
            <span aria-hidden="true">›</span>
            <span>{recipe.title}</span>
          </div>
          <h1>
            {recipe.title} <span aria-hidden="true">♡</span>
          </h1>

          <div className="recipe-actions">
            <Link className="btn btn-primary" href="/recipes">
              לכל המתכונים
            </Link>
            <CopyLinkButton />
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="container related-section">
          <div className="section-head">
            <div>
              <span className="section-kicker">אולי תאהבו גם</span>
              <h2>עוד מתכונים מתוקים ♡</h2>
            </div>
            <Link href="/recipes" className="small-pill">
              לכל המתכונים
            </Link>
          </div>
          <div className="recipe-grid related-grid">
            {related.map((row) => (
              <RecipeCard
                key={row.contentId}
                href={recipeHref(row)}
                title={row.title}
                image={recipeCardImage(row)}
                favoriteId={recipeFavoriteId(row)}
                favoriteAliases={row.legacyIds}
                metaLeft={row.seriesPosition ? `פרק ${row.seriesPosition} בסדרת עוגות הביסקוויטים` : row.siteCategory || ""}
                metaRight="עוגות"
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
