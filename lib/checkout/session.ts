import "server-only";

import { getAllGames } from "@/lib/sanity/games";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseUser } from "@/lib/supabase/server";

/**
 * Creating the snapshot a payment will be granted from.
 *
 * NOT WIRED TO ANYTHING YET. There is no checkout page and no Grow
 * integration; this is the step that will run just before a customer is sent to
 * the payment provider.
 *
 * This is the ONLY place the catalog is consulted in the whole purchase flow.
 * The price and the bundle contents are read here, once, and written into a
 * checkout_sessions row. From that point the payment is a contract about a
 * fixed set of games at a fixed price: the webhook grants from the row and
 * never looks at Sanity, so a bundle edited between "customer paid" and
 * "callback processed" — or a callback replayed months later — delivers exactly
 * what was bought rather than whatever the catalog says today.
 *
 * Everything here is computed server-side. Nothing about the product, the price
 * or the games granted may come from the browser: a client that could choose
 * those could buy the bundle for nothing.
 */

export interface CheckoutSnapshot {
  /** The row id, and the reference handed to the payment provider. */
  checkoutSessionId: string;
  productContentId: string;
  productTitle: string;
  amountMinor: number;
  currency: string;
  /** The frozen list of playable games this payment will grant. */
  grantedGameContentIds: string[];
}

/**
 * Freezes what the signed-in user is about to buy.
 *
 * Takes a contentId rather than a slug: a slug is editable and a game's URL is
 * expected to change, so a purchase must not be keyed on one. A caller holding
 * a slug should resolve it through the games data layer first.
 *
 * Throws rather than guessing if the product is unknown, unpriced, or resolves
 * to no playable game — a checkout that would grant nothing is worse than one
 * that refuses to start.
 */
export async function createCheckoutSession(productContentId: string): Promise<CheckoutSnapshot> {
  const user = await getSupabaseUser();
  if (!user) throw new Error("Checkout requires a signed-in user.");

  const games = await getAllGames();
  const product = games.find((game) => game.contentId === productContentId);
  if (!product) throw new Error(`Unknown product ${productContentId}.`);

  if (typeof product.price !== "number" || product.price <= 0) {
    throw new Error(`Product ${productContentId} has no usable price; refusing to start checkout.`);
  }

  const grantedGameContentIds = expandProduct(product.contentId, games);
  if (grantedGameContentIds.length === 0) {
    throw new Error(`Product ${productContentId} resolves to no playable game; refusing to start checkout.`);
  }

  // Shekels in the catalog, agorot in the database. Rounded rather than
  // truncated so 48.9 cannot quietly become 4890 when it meant 4890.
  const amountMinor = Math.round(product.price * 100);

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("checkout_sessions")
    .insert({
      user_id: user.id,
      product_content_id: product.contentId,
      product_title: product.title,
      granted_game_content_ids: grantedGameContentIds,
      amount_minor: amountMinor,
      currency: "ILS",
    })
    .select("id")
    .single();

  if (error) throw new Error(`Could not create checkout session: ${error.message}`);

  return {
    checkoutSessionId: data.id,
    productContentId: product.contentId,
    productTitle: product.title,
    amountMinor,
    currency: "ILS",
    grantedGameContentIds,
  };
}

/**
 * The playable games a product covers.
 *
 * A bundle expands to the games it contains; a single game is itself. Used only
 * at snapshot time — after this, the answer is stored and the catalog is not
 * asked again for this payment.
 */
export function expandProduct(
  productContentId: string,
  games: { contentId: string; slug: string; includedGameSlugs: string[] }[],
): string[] {
  const product = games.find((game) => game.contentId === productContentId);
  if (!product) return [];
  if (product.includedGameSlugs.length === 0) return [product.contentId];

  const bySlug = new Map(games.map((game) => [game.slug, game.contentId]));
  const included = product.includedGameSlugs
    .map((slug) => bySlug.get(slug))
    .filter((contentId): contentId is string => Boolean(contentId));

  // Deduplicated: a bundle listing the same game twice is a content mistake,
  // not a reason to write a duplicate into the snapshot.
  return included.length > 0 ? [...new Set(included)] : [product.contentId];
}
