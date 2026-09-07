import Link from "next/link";
import type { Metadata } from "next";
import RecipeCard from "@/components/RecipeCard";
import ImageGalleryHero from "@/components/ImageGalleryHero";
import CopyLinkButton from "@/components/CopyLinkButton";
import IngredientsList from "@/components/IngredientsList";
import StepsList from "@/components/StepsList";
import FavoriteButton from "@/components/FavoriteButton";
import { biscuitCakeSeries, getBiscuitCakeItem, getRelatedBiscuitItems } from "@/lib/biscuit-cake-series";
import { getAllRecipeIds, getRecipeById, reviewedRecipeGalleryImages, reviewedRecipeHeroImage } from "@/lib/recipes";

export function generateStaticParams() {
  const reviewedIds = getAllRecipeIds().map((id) => ({ id }));
  const biscuitIds = biscuitCakeSeries.map((item) => ({ id: `biscuit-cake-${item.id}` }));
  return [...reviewedIds, ...biscuitIds];
}

function biscuitIdFromParam(id: string): string | null {
  const match = /^biscuit-cake-(\d+)$/.exec(id);
  return match ? match[1] : null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id: rawId } = await params;
  // Next.js hands dynamic segments through already-decoded when a page is
  // served from a statically generated build, but as the raw
  // percent-encoded URL segment when rendering on demand (dev mode, or a
  // route not covered by generateStaticParams) — decoding unconditionally
  // handles both cases for the site's Hebrew recipe/date ids.
  const id = decodeURIComponent(rawId);
  const recipe = getRecipeById(id);
  if (recipe) return { title: `${recipe.title} | רותם עדיני` };
  const biscuitId = biscuitIdFromParam(id);
  const item = biscuitId ? getBiscuitCakeItem(biscuitId) : undefined;
  if (item) return { title: `${item.title} | רותם עדיני` };
  return { title: "מתכון | רותם עדיני" };
}

export default async function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  // Next.js hands dynamic segments through already-decoded when a page is
  // served from a statically generated build, but as the raw
  // percent-encoded URL segment when rendering on demand (dev mode, or a
  // route not covered by generateStaticParams) — decoding unconditionally
  // handles both cases for the site's Hebrew recipe/date ids.
  const id = decodeURIComponent(rawId);
  const recipe = getRecipeById(id);
  if (recipe) return <ReviewedRecipeDetail recipe={recipe} />;

  const biscuitId = biscuitIdFromParam(id);
  const item = biscuitId ? getBiscuitCakeItem(biscuitId) : undefined;
  return <LegacySeriesRecipeDetail item={item} />;
}

function ReviewedRecipeDetail({ recipe }: { recipe: NonNullable<ReturnType<typeof getRecipeById>> }) {
  const heroImage = reviewedRecipeHeroImage(recipe);
  const galleryImages = reviewedRecipeGalleryImages(recipe);

  return (
    <main className="page-main">
      <section className={`recipe-detail-hero container reviewed-recipe-hero ${heroImage ? "has-recipe-image" : "no-recipe-image"}`}>
        <Link className="recipe-back-link" href="/recipes" aria-label="חזרה לכל המתכונים">
          <span aria-hidden="true">→</span> לכל המתכונים
        </Link>

        {heroImage ? (
          <ImageGalleryHero wrapClassName="recipe-main-image" images={galleryImages} title={recipe.title} favoriteId={`recipe-${recipe.id}`} />
        ) : (
          <div className="recipe-main-image no-image-fav-slot">
            <FavoriteButton id={`recipe-${recipe.id}`} className="fav-btn large-fav" label="שמירה למועדפים" />
          </div>
        )}

        <div className="recipe-intro">
          <div className="breadcrumbs">
            <Link href="/recipes">מתכונים</Link>
            <span>›</span>
            <span>{recipe.siteCategory || recipe.foodType || "מתכון"}</span>
          </div>
          <h1>{recipe.title}</h1>
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
          {recipe.notes && (
            <div className="tip-box">
              <strong>שימו לב</strong>
              <p>{recipe.notes}</p>
            </div>
          )}
          <div className="recipe-actions">
            <a className="btn btn-primary" href={recipe.sourceUrl} target="_blank" rel="noopener">
              לצפייה בפוסט באינסטגרם
            </a>
            <Link className="btn btn-secondary" href="/recipes">
              לכל המתכונים
            </Link>
          </div>
        </div>
      </section>

      <section className="container recipe-content-grid reviewed-recipe-content">
        <aside className="ingredients-card panel">
          <span className="section-kicker">מצרכים</span>
          <h2>מה צריך?</h2>
          <IngredientsList ingredients={recipe.ingredients} />
        </aside>
        <article className="instructions-card panel">
          <span className="section-kicker">אופן הכנה</span>
          <h2>איך מכינים?</h2>
          <StepsList instructions={recipe.instructions} />
        </article>
      </section>
    </main>
  );
}

function LegacySeriesRecipeDetail({ item }: { item: ReturnType<typeof getBiscuitCakeItem> }) {
  const related = getRelatedBiscuitItems(item?.id, 3);
  const galleryImages = item ? [item.image, ...(item.images || [])].filter((src, i, all): src is string => Boolean(src) && all.indexOf(src) === i) : [];

  return (
    <main className="page-main">
      <section className="recipe-detail-hero container">
        <Link className="recipe-back-link" href="/recipes" aria-label="חזרה לכל המתכונים">
          <span aria-hidden="true">→</span> לכל המתכונים
        </Link>

        {item?.image ? (
          <ImageGalleryHero wrapClassName="recipe-main-image" images={galleryImages} title={item.title} favoriteId={`biscuit-cake-${item.id}`} />
        ) : (
          <div className="recipe-main-image">
            {/* No `src` at all (rather than src="") so it matches the same
                img:not([src]) CSS rule the original static markup relied on,
                without React's empty-string-src warning. */}
            <img alt="" />
            <FavoriteButton id={item ? `biscuit-cake-${item.id}` : ""} className="fav-btn large-fav" label="שמירה למועדפים" />
          </div>
        )}

        <div className="recipe-intro">
          <div className="breadcrumbs">
            <Link href="/recipes">מתכונים</Link>
            <span>›</span>
            <span>{item?.title ?? "מתכון"}</span>
          </div>
          <h1>
            {item ? `${item.title} ` : "המתכון לא נמצא "}
            <span>♡</span>
          </h1>
          {!item && <p>אולי הקישור לא מדויק. אפשר לחזור לכל המתכונים ולמצוא משהו טעים.</p>}

          <div className="recipe-actions">
            <Link className="btn btn-primary" href="/recipes">
              לכל המתכונים
            </Link>
            <CopyLinkButton />
          </div>
        </div>
      </section>

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
              key={row.id}
              href={`/recipes/biscuit-cake-${row.id}`}
              title={row.title}
              image={row.image}
              favoriteId={`biscuit-cake-${row.id}`}
              metaLeft={`פרק ${parseInt(row.id, 10)} בסדרת עוגות הביסקוויטים`}
              metaRight="עוגות"
            />
          ))}
        </div>
      </section>
    </main>
  );
}
