import Link from "next/link";
import FavoriteButton from "./FavoriteButton";

interface DateCardProps {
  href: string;
  title: string;
  image: string | null;
  favoriteId: string;
  /** Other legacy tokens this item answers to, for merged items. */
  favoriteAliases?: string[];
  tag: string;
  description: string;
  footerLabel: string;
}

/** A single date-idea card, used on the dates board and "related" strips.
 * Same structure as RecipeCard — see the note there for why the favourite
 * button is a sibling of the link rather than a child of it. */
export default function DateCard({ href, title, image, favoriteId, favoriteAliases, tag, description, footerLabel }: DateCardProps) {
  return (
    <article className="date-card">
      <div className="date-card-image">
        {image ? <img src={image} alt={title} loading="lazy" /> : <div className="date-image-placeholder" role="img" aria-label={title} />}
        <span className="date-tag">{tag}</span>
      </div>
      <div className="date-card-body">
        <h3>
          <Link className="card-link" href={href}>
            {title}
          </Link>
        </h3>
        {/* A standalone idea with no description of its own renders no blurb
            at all, rather than an empty paragraph holding open a gap where a
            series line used to be. */}
        {description && <p>{description}</p>}
        <div className="date-card-footer">
          <span>{footerLabel}</span>
          <FavoriteButton id={favoriteId} aliases={favoriteAliases} className="mini-heart" itemName={title} />
        </div>
      </div>
    </article>
  );
}
