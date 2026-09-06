import Link from "next/link";
import FavoriteButton from "./FavoriteButton";

interface DateCardProps {
  href: string;
  title: string;
  image: string | null;
  favoriteId: string;
  tag: string;
  description: string;
  footerLabel: string;
}

/** A single date-idea card, used on the dates board and "related" strips. */
export default function DateCard({ href, title, image, favoriteId, tag, description, footerLabel }: DateCardProps) {
  return (
    <Link className="date-card" href={href}>
      <div className="date-card-image">
        {image ? <img src={image} alt={title} loading="lazy" /> : <div className="date-image-placeholder" role="img" aria-label={title} />}
        <span className="date-tag">{tag}</span>
      </div>
      <div className="date-card-body">
        <h3>{title}</h3>
        <p>{description}</p>
        <div className="date-card-footer">
          <span>{footerLabel}</span>
          <FavoriteButton id={favoriteId} className="mini-heart" />
        </div>
      </div>
    </Link>
  );
}
