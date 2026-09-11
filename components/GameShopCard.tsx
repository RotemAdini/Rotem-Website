import type { GameCatalogItem } from "@/lib/types";

// Plain <a> tags on purpose (not next/link): each game page is a
// dangerouslySetInnerHTML-rendered legacy widget with its own <script>-based
// behavior (nav reveal, sticky buy bar, forms…) that expects a fresh page
// load to initialize. A client-side SPA transition between two game pages
// would skip re-running that script. See app/games/[slug]/page.tsx.
export default function GameShopCard({
  game,
  compareAtPrice,
  savesAmount,
}: {
  game: GameCatalogItem;
  /** What the contents would cost bought separately — bundles only. */
  compareAtPrice?: number;
  /** compareAtPrice minus this product's price — bundles only. */
  savesAmount?: number;
}) {
  const href = `/games/${game.slug}`;
  return (
    <article className={`shop-card real-game-card ${game.themeClass}`} data-kind={game.kind}>
      <a className="shop-card-image game-catalog-art" href={href} aria-label={`לפרטים על ${game.title}`}>
        {game.image ? <img src={game.image} alt={game.title} /> : <span className="game-art-icon" aria-hidden="true">{game.icon}</span>}
        <span className="shop-badge">{game.kicker}</span>
      </a>
      <div className="shop-card-body">
        <span className="section-kicker">{game.tagline}</span>
        <h3>
          <a href={href}>{game.title}</a>
        </h3>
        <p>{game.description}</p>
        {savesAmount != null && compareAtPrice != null && (
          <p className="shop-card-saving">
            במקום <s>₪{compareAtPrice}</s> — חיסכון של ₪{savesAmount}
          </p>
        )}
        <div className="shop-card-footer">
          {game.price != null && <strong>₪{game.price}</strong>}
          <a className="btn btn-primary compact" href={href}>
            {game.ctaLabel ?? "לפרטים"}
          </a>
        </div>
      </div>
    </article>
  );
}
