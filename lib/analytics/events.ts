/**
 * Every analytics event this site may ever send, and the shape of its
 * parameters.
 *
 * This file is the contract. It is deliberately a closed union rather than
 * `trackEvent(name: string, params: object)`: a typo in an event name is a
 * category of bug that analytics is uniquely bad at revealing, because the
 * event simply never appears in a report and nobody notices for a quarter.
 * With a union, a wrong name or a wrong parameter is a build error.
 *
 * It is also the enforcement point for the one rule that matters more than
 * any measurement: **no personal data leaves this site through analytics.**
 * Nothing here has a field for a name, an email address, a message body, a
 * search query typed by a reader, a Supabase user id, a session token or
 * anything a couple writes while playing a game. That is not an oversight to
 * be corrected later by adding a field — it is the design. Adding one would
 * turn an event stream into a personal-data export, which is a different
 * legal object entirely and would change what the privacy policy has to say.
 *
 * No provider appears anywhere in this file. Google Analytics 4 is the likely
 * destination, but the events are described in the site's own terms, so
 * swapping the destination is a change to lib/analytics/index.ts alone.
 */

/* --------------------------------------------------------- shared values */

/**
 * The canonical analytics id for each game.
 *
 * **This is not the same identifier space as the URL.** Two exist, on
 * purpose, and conflating them is the mistake this comment is here to stop:
 *
 *   analytics id      site slug / URL segment   Sanity slug
 *   ----------------  ------------------------  -----------
 *   enchanted-forest  forest-game               forest-game
 *   love-race         race-game                 race-game
 *   memory-game       memory-game               memory-game
 *
 * The slugs are live, indexed URLs — /games/forest-game and
 * /games/race-game — and they carry legacyRouteIds and redirects. They
 * cannot be renamed without breaking links, so they stay.
 *
 * The analytics id is the *product's* name, which is what the three separate
 * game projects call themselves and what a report has to be readable as a
 * year from now. `enchanted-forest` says what it is; `forest-game` reads
 * like a category.
 *
 * Wherever both are needed, SITE_SLUG_BY_GAME_ID translates.
 */
export type GameId = "enchanted-forest" | "love-race" | "memory-game";

/** The URL segment each game is published at. The bundle has no analytics id
 * of its own because it is a purchase, not a game — it appears only in the
 * commerce events, which accept the literal "bundle". */
export const SITE_SLUG_BY_GAME_ID: Record<GameId, string> = {
  "enchanted-forest": "forest-game",
  "love-race": "race-game",
  "memory-game": "memory-game",
};

/**
 * Every spelling accepted on the way in, mapped to the canonical id.
 *
 * Both the product name and the URL slug are accepted, so a game project and
 * a site component cannot split one game across two rows in a report by
 * disagreeing about what to call it. Anything not listed here is rejected
 * rather than passed through — see normaliseGameId().
 */
export const GAME_ID_ALIASES: Record<string, GameId> = {
  "enchanted-forest": "enchanted-forest",
  "forest-game": "enchanted-forest",
  "love-race": "love-race",
  "race-game": "love-race",
  "memory-game": "memory-game",
};

export function normaliseGameId(value: string): GameId | null {
  return GAME_ID_ALIASES[value] ?? null;
}

/** The canonical analytics id for a site slug, or null for a slug that is
 * not a game — "bundle" being the one that matters. */
export function gameIdFromSlug(slug: string): GameId | null {
  const id = GAME_ID_ALIASES[slug];
  return id && SITE_SLUG_BY_GAME_ID[id] === slug ? id : null;
}

/** What kind of thing an event is about, where several content types share
 * one event. */
export type ContentKind = "recipe" | "date" | "game";

/* ---------------------------------------------------------- the contract */

export type AnalyticsEvent =
  /* ------------------------------------------------------------- content */
  /** A recipe detail page was viewed. Fires once per page view.
   *  `slug` is a public URL segment, not a person. */
  | { name: "recipe_view"; params: { slug: string; category?: string } }
  /** A date-idea detail page was viewed. Fires once per page view. */
  | { name: "date_view"; params: { slug: string } }
  /** A game's sales page was viewed. Fires once per page view. */
  | { name: "game_landing_view"; params: { game_id: GameId } }
  /** A reader pressed the control that opens a game. Fires on the click, not
   *  on arrival, so the drop-off between intent and load is visible. */
  | { name: "game_play_click"; params: { game_id: GameId; source: "landing" | "catalog" | "dashboard" } }

  /* -------------------------------------------------------------- search */
  /**
   * A search was performed.
   *
   * NOTE the absence of a `query` parameter. People type their own names,
   * addresses and worse into site search, and a stored query log is personal
   * data that would have to be disclosed and retained accordingly. What is
   * recorded is the shape of the search — how long it was, whether it found
   * anything, which filter was active — which answers "is search working"
   * without keeping what anyone wrote. See docs/analytics-plan.md for the
   * sanitisation that would be required before a query could ever be added.
   */
  | { name: "search"; params: { term_length: number; result_count: number; filter: string; found: boolean } }

  /* ----------------------------------------------------------- favourites */
  | { name: "favorite_add"; params: { content_kind: ContentKind; slug?: string } }
  | { name: "favorite_remove"; params: { content_kind: ContentKind; slug?: string } }

  /* ----------------------------------------------------------------- auth */
  /** Sign-in completed. `method` is the provider, never the account. */
  | { name: "login"; params: { method: "google" } }
  | { name: "logout"; params: Record<string, never> }

  /* -------------------------------------------------------------- contact */
  /** The contact form was accepted and handed to the email provider.
   *  Carries nothing the visitor typed — not the subject, not one character
   *  of the message. */
  | { name: "contact_submit_success"; params: Record<string, never> }
  /**
   * A contact submission did not result in a sent message.
   *
   * `reason` is the site's own status, which is what makes this worth
   * measuring: a spike in `unconfigured` means a deployment lost its API
   * key, and a spike in `invalid` means the form is confusing people.
   */
  | { name: "contact_submit_failure"; params: { reason: "invalid" | "unconfigured" | "error" | "expired" } }

  /* ----------------------------------------------------------------- game */
  /** A game was opened and begun. */
  | { name: "game_start"; params: { game_id: GameId } }
  /** A game was continued from saved progress rather than started fresh. */
  | { name: "game_resume"; params: { game_id: GameId; step_number?: number } }
  /** One station / question / stage was completed. The number is a position
   *  in the game, never the content of an answer. */
  | { name: "game_step_complete"; params: { game_id: GameId; step_number: number; elapsed_seconds?: number } }
  /** A game was played to the end. */
  | { name: "game_complete"; params: { game_id: GameId; step_count?: number; elapsed_seconds?: number } }
  | { name: "game_restart"; params: { game_id: GameId } }
  /**
   * End-of-game feedback was submitted.
   *
   * `rating` only. The written comment goes to its own Supabase project and
   * must never reach analytics: it is free text a couple wrote about their
   * evening.
   */
  | { name: "game_feedback_submit"; params: { game_id: GameId; rating?: number } }

  /* ------------------------------------------------- commerce (not wired) */
  /**
   * The three commerce events are declared so the vocabulary is fixed before
   * anyone implements them, and are deliberately not called anywhere yet.
   *
   * `purchase_complete` carries a warning that belongs in the type itself:
   * the authoritative version of this event must originate from verified
   * server-side payment state — the Grow webhook, after the entitlement row
   * is written — and not from a browser arriving at a success page. A success
   * page can be opened directly, reloaded, shared and forged, so a
   * browser-fired purchase event inflates revenue reporting and cannot be
   * reconciled against what was actually charged.
   */
  | { name: "checkout_start"; params: { game_id: GameId | "bundle"; value_minor: number; currency: "ILS" } }
  | {
      name: "purchase_complete";
      params: {
        /** Grow's transaction id, so the event reconciles against payments. */
        transaction_id: string;
        game_ids: (GameId | "bundle")[];
        value_minor: number;
        currency: "ILS";
        /** Must be "server" in production. The type permits nothing else. */
        origin: "server";
      };
    }
  | { name: "refund"; params: { transaction_id: string; value_minor: number; currency: "ILS"; origin: "server" } };

export type AnalyticsEventName = AnalyticsEvent["name"];

/**
 * Parameter keys that must never appear in an event, whatever the event.
 *
 * The union above already makes these impossible to pass in TypeScript. This
 * list is the runtime backstop for the one caller that is not type-checked:
 * a game shipped as plain JavaScript and injected into the page, which
 * reaches the tracker through the `window` bridge. See lib/analytics/index.ts.
 */
export const FORBIDDEN_PARAM_KEYS: readonly string[] = [
  "name",
  "first_name",
  "last_name",
  "full_name",
  "email",
  "email_address",
  "phone",
  "message",
  "subject",
  "body",
  "text",
  "comment",
  "comments",
  "feedback",
  "answer",
  "answers",
  "response",
  "memory",
  "story",
  "query",
  "q",
  "search_term",
  "user_id",
  "uid",
  "supabase_user_id",
  "token",
  "access_token",
  "refresh_token",
  "session",
  "password",
  "card",
  "card_number",
  "cvv",
  "iban",
];
