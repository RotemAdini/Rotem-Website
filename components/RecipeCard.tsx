import Link from "next/link";
import FavoriteButton from "./FavoriteButton";

interface RecipeCardProps {
  href: string;
  title: string;
  image: string | null;
  favoriteId: string;
  /** Other legacy tokens this recipe answers to, for merged recipes. */
  favoriteAliases?: string[];
  metaLeft: string;
  metaRight: string;
}

/**
 * A single recipe card, used on the homepage highlights, the recipes board,
 * and the "related recipes" strips. Cards without a photo yet keep the same
 * placeholder block so the grid stays aligned.
 *
 * The card used to be one big <a> with the favourite <button> inside it —
 * interactive content nested in a link, which is invalid HTML and made the
 * link's accessible name start with the heart glyph on all ~180 cards. The
 * card is now an <article>; the title holds the real link and that link's
 * ::after (`.card-link`) stretches over the whole card to keep the entire
 * surface clickable, with the heart layered above it at z-index 5. Visual
 * design and click behaviour are unchanged; the difference is that a screen
 * reader now hears one link named after the recipe and one button named after
 * the action, instead of a single link carrying both.
 */
export default function RecipeCard({ href, title, image, favoriteId, favoriteAliases, metaLeft, metaRight }: RecipeCardProps) {
  return (
    <article className="recipe-card">
      <FavoriteButton id={favoriteId} aliases={favoriteAliases} itemName={title} />
      {image ? (
        <img src={image} alt={title} loading="lazy" />
      ) : (
        <div className="recipe-image-placeholder" role="img" aria-label={title} />
      )}
      <div className="recipe-body">
        <h3>
          <Link className="card-link" href={href}>
            {title}
          </Link>
        </h3>
        <div className="recipe-meta">
          <span>{metaLeft}</span>
          <span>{metaRight}</span>
        </div>
      </div>
    </article>
  );
}
