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

/** A single recipe card, used on the homepage highlights, the recipes
 * board, and the "related recipes" strips. Cards without a photo yet keep
 * the same placeholder block so the grid stays aligned. */
export default function RecipeCard({ href, title, image, favoriteId, favoriteAliases, metaLeft, metaRight }: RecipeCardProps) {
  return (
    <Link className="recipe-card" href={href}>
      <FavoriteButton id={favoriteId} aliases={favoriteAliases} />
      {image ? (
        <img src={image} alt={title} loading="lazy" />
      ) : (
        <div className="recipe-image-placeholder" role="img" aria-label={title} />
      )}
      <div className="recipe-body">
        <h3>{title}</h3>
        <div className="recipe-meta">
          <span>{metaLeft}</span>
          <span>{metaRight}</span>
        </div>
      </div>
    </Link>
  );
}
