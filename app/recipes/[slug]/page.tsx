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

/**
 * A recipe page, addressed by its canonical Hebrew slug.
 *
 * Only canonical slugs are prerendered. Every pre-migration URL — the raw
 * Instagram-caption ids, the `instagram-NN` ids and the `biscuit-cake-NN`
 * series pages — is served on demand and answered with a 308 to the canonical
 * slug, so an old link keeps working without ever rendering a second copy of
 * the page at a second URL.
 */
export async function generateStaticParams() {
  return (await getAllRecipeSlugs()).map((slug) => ({ slug }));
}

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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const resolution = await resolveRecipeRoute(decodeSegment(slug));

  // A legacy URL must not advertise itself as a page of its own: it redirects,
  // and the canonical page is the only indexable copy.
  if (resolution.kind !== "canonical") {
    return { title: "מתכון | רותם עדיני", robots: { index: false, follow: true } };
  }

  const { recipe } = resolution;
  const description =
    recipe.seoDescription?.trim() ||
    recipe.notes?.trim() ||
    [recipe.siteCategory, recipe.foodType, recipe.prepTimeMinutes ? `${recipe.prepTimeMinutes} דקות הכנה` : null]
      .filter(Boolean)
      .join(" · ") ||
    undefined;

  return {
    title: recipe.seoTitle?.trim() || `${recipe.title} | רותם עדיני`,
    description,
    alternates: { canonical: canonicalPath(recipe.slug) },
  };
}

export default async function RecipeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resolution = await resolveRecipeRoute(decodeSegment(slug));

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
        <aside className="ingredients-card panel">
          <span className="section-kicker">מצרכים</span>
          <h2>מה צריך?</h2>
          <IngredientsList ingredients={recipe.ingredients} storageKey={recipe.contentId} />
        </aside>
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
            <span>›</span>
            <span>{recipe.title}</span>
          </div>
          <h1>
            {recipe.title} <span>♡</span>
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
