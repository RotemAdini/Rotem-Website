import type { GameCatalogItem } from "@/lib/types";

// Plain <a> tags on purpose (not next/link): each game page is a
// dangerouslySetInnerHTML-rendered legacy widget with its own <script>-based
// behavior (nav reveal, sticky buy bar, forms…) that expects a fresh page
// load to initialize. A client-side SPA transition between two game pages
// would skip re-running that script. See app/games/[slug]/page.tsx.

function LockIcon({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <rect x="5" y="10" width="14" height="11" rx="2" />
      {open
        ? <path d="M8 10V7a4 4 0 0 1 7.5-2" />
        : <path d="M8 10V7a4 4 0 0 1 8 0v3" />}
    </svg>
  );
}

export default function GameShopCard({
  game,
  compareAtPrice,
  savesAmount,
  owned,
  bundleCovers,
}: {
  game: GameCatalogItem;
  /** What the contents would cost bought separately — bundles only. */
  compareAtPrice?: number;
  /** compareAtPrice minus this product's price — bundles only. */
  savesAmount?: number;
  /** Server-resolved presentation state; protected play routes still re-authorize. */
  owned: boolean;
  /** Covers of the games the bundle contains, shown as a fanned stack — bundles only. */
  bundleCovers?: string[];
}) {
  const href = `/games/${game.slug}`;
  const isBundle = game.kind === "all";
  // Read by the delegated listener in lib/analytics (listenForInteractionEvents).
  // "למשחק" needs no attribute: any link to a play route is recognised by its href.
  const detailsTracking = (element: "button" | "image" | "title") => ({
    "data-analytics": "game_details_click",
    "data-analytics-game": game.slug,
    "data-analytics-element": element,
  });

  if (isBundle) {
    const covers = (bundleCovers ?? []).slice(0, 3);
    return (
      <article className={`game-bundle ${game.themeClass}`} data-kind={game.kind}>
        <a className="game-bundle-art" href={href} aria-label={`לפרטים על ${game.title}`} {...detailsTracking("image")}>
          {covers.length > 0 ? (
            <span className="game-bundle-stack" aria-hidden="true">
              {covers.map((src) => <img key={src} src={src} alt="" />)}
            </span>
          ) : game.image ? (
            <img className="game-bundle-photo" src={game.image} alt="" />
          ) : (
            <span className="game-tile-icon" aria-hidden="true">{game.icon}</span>
          )}
        </a>
        <div className="game-bundle-body">
          <span className="game-bundle-ribbon">{game.kicker || "הכי משתלם"}</span>
          {game.tagline && <span className="game-bundle-tagline">{game.tagline}</span>}
          <h3>
            <a href={href} {...detailsTracking("title")}>{game.title}</a>
          </h3>
          <p className="game-bundle-desc">{game.description}</p>
          <div className="game-bundle-buy">
            <div className="game-bundle-price">
              {game.price != null && <strong>₪{game.price}</strong>}
              {compareAtPrice != null && (
                <s>
                  <span className="sr-only">במקום </span>₪{compareAtPrice}
                </s>
              )}
              {savesAmount != null && (
                <span className="game-bundle-save">חוסכים ₪{savesAmount}</span>
              )}
            </div>
            <a className="btn game-bundle-cta" href={href} {...detailsTracking("button")}>
              {game.ctaLabel ?? "לפרטים"}
            </a>
          </div>
        </div>
      </article>
    );
  }

  const isForestGame = game.slug === "forest-game";
  const canPlayForest = isForestGame && owned;
  const actionHref = canPlayForest ? "/games/forest-game/play" : href;
  const actionLabel = canPlayForest ? "למשחק" : "לפרטים";
  const imageLinkLabel = `לפרטים על ${game.title} — ${owned ? "נרכש" : "נעול"}`;
  const playLinkProps = canPlayForest
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <article
      className={`game-tile ${game.themeClass}${owned ? " is-owned" : ""}`}
      data-kind={game.kind}
    >
      <a className="game-tile-art" href={href} aria-label={imageLinkLabel} {...detailsTracking("image")}>
        {game.image
          ? <img src={game.image} alt="" />
          : <span className="game-tile-icon" aria-hidden="true">{game.icon}</span>}
        {game.kicker && <span className="game-tile-kicker">{game.kicker}</span>}
        <span className={`game-tile-state ${owned ? "is-owned" : "is-locked"}`}>
          <LockIcon open={owned} />
          <span className="game-tile-state-label">{owned ? "נרכש" : "נעול"}</span>
        </span>
      </a>
      <div className="game-tile-body">
        {game.tagline && <span className="game-tile-tagline">{game.tagline}</span>}
        <h3>
          <a href={href} {...detailsTracking("title")}>{game.title}</a>
        </h3>
        <p className="game-tile-desc">{game.description}</p>
        <div className="game-tile-buy">
          {owned ? (
            <span className="game-tile-owned">בספרייה שלכם</span>
          ) : (
            game.price != null && <strong className="game-tile-price">₪{game.price}</strong>
          )}
          <a
            className={`btn compact game-tile-cta${canPlayForest ? " is-play" : ""}`}
            href={actionHref}
            aria-label={canPlayForest ? "למשחק — נפתח בחלון חדש" : undefined}
            {...playLinkProps}
            {...(canPlayForest ? {} : detailsTracking("button"))}
          >
            {actionLabel}
          </a>
        </div>
      </div>
    </article>
  );
}
