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
  owned,
}: {
  game: GameCatalogItem;
  /** What the contents would cost bought separately — bundles only. */
  compareAtPrice?: number;
  /** compareAtPrice minus this product's price — bundles only. */
  savesAmount?: number;
  /** Server-resolved presentation state; protected play routes still re-authorize. */
  owned: boolean;
}) {
  const href = `/games/${game.slug}`;
  const isBundle = game.kind === "all";
  const isForestGame = game.slug === "forest-game";
  const canPlayForest = isForestGame && owned;
  const actionHref = canPlayForest ? "/games/forest-game/play" : href;
  const actionLabel = isBundle
    ? game.ctaLabel ?? "לפרטים"
    : canPlayForest ? "למשחק" : "לפרטים";
  const imageLinkLabel = isBundle
    ? `לפרטים על ${game.title}`
    : `לפרטים על ${game.title} — ${owned ? "נרכש" : "נעול"}`;
  const playLinkProps = canPlayForest
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <article className={`shop-card real-game-card ${game.themeClass}`} data-kind={game.kind}>
      <a className="shop-card-image game-catalog-art" href={href} aria-label={imageLinkLabel}>
        {game.image ? <img src={game.image} alt={game.title} /> : <span className="game-art-icon" aria-hidden="true">{game.icon}</span>}
        <span className="shop-badge">{game.kicker}</span>
        {!isBundle && (
          <span className={`game-ownership-badge ${owned ? "is-owned" : "is-locked"}`}>
            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
              <rect x="5" y="10" width="14" height="11" rx="2" />
              {owned
                ? <path d="M8 10V7a4 4 0 0 1 7.5-2" />
                : <path d="M8 10V7a4 4 0 0 1 8 0v3" />}
            </svg>
            {owned ? "נרכש" : "נעול"}
          </span>
        )}
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
          <a
            className="btn btn-primary compact"
            href={actionHref}
            aria-label={canPlayForest ? "למשחק — נפתח בחלון חדש" : undefined}
            {...playLinkProps}
          >
            {actionLabel}
          </a>
        </div>
      </div>
    </article>
  );
}
