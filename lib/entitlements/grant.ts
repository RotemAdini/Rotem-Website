import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Recording payments and granting access.
 *
 * NOT WIRED TO ANYTHING YET. There is no checkout page, no webhook endpoint and
 * no Grow integration; this is the layer those will call once they exist. It is
 * written now so the security shape is settled before any money moves.
 *
 * Note what this module does NOT import: the Sanity catalog. Nothing in the
 * grant path reads product data. What a payment buys was decided and stored
 * when the checkout session was created (see lib/checkout/session.ts), and the
 * database grants from that snapshot. A bundle edited after a customer paid, or
 * a callback replayed months later, therefore delivers what was bought rather
 * than whatever the catalog says at the time the callback runs.
 *
 * The contract for the future webhook, in order:
 *
 *   1. Verify the request really came from the provider — signature or shared
 *      secret, checked against the RAW body. A request that fails this must
 *      never reach any function here.
 *   2. claimPaymentEvent(). If it does not return `claimed`, stop.
 *   3. grantPurchaseFromCheckout() with the checkout session id and payment id
 *      taken from the VERIFIED payload — never from a query string, a redirect,
 *      or anything the browser reported.
 *   4. completePaymentEvent() on success, failPaymentEvent() on error.
 *
 * Step 4 is not optional. A claimed delivery that is never completed stays in
 * 'processing' until its lock goes stale, and one wrongly marked complete can
 * never be retried — which is how a paying customer ends up with no access.
 */

const PROVIDER = "grow";

export type ClaimResult =
  /** This delivery is now ours to process. */
  | { status: "claimed"; eventUuid: string; attempt: number }
  /** Already finished. Acknowledge the callback and do nothing. */
  | { status: "already-processed"; eventUuid: string }
  /** Another handler holds it and its lock is still fresh. */
  | { status: "in-progress"; eventUuid: string };

/**
 * Asks the database whether this webhook delivery may be processed.
 *
 * The important half of the answer is what it does NOT refuse. Recording a
 * delivery is not grounds to reject its retry: if the previous attempt crashed
 * between recording the event and granting access, refusing the retry would
 * strand somebody who has paid. Only a delivery that ran to completion is
 * turned away; a failed one, and one whose handler died holding the lock, are
 * both re-claimable.
 *
 * The claim is a single atomic statement in Postgres, so two callbacks landing
 * at the same instant cannot both win it.
 */
export async function claimPaymentEvent(eventId: string, payload: unknown): Promise<ClaimResult> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase.rpc("claim_payment_event", {
    p_provider: PROVIDER,
    p_event_id: eventId,
    p_payload: payload as never,
  });

  if (error) throw new Error(`Could not claim payment event: ${error.message}`);

  const row = data?.[0];
  if (!row) throw new Error("claim_payment_event returned nothing");

  if (row.claimed) return { status: "claimed", eventUuid: row.event_uuid, attempt: row.attempt };
  if (row.current_status === "processed") return { status: "already-processed", eventUuid: row.event_uuid };
  return { status: "in-progress", eventUuid: row.event_uuid };
}

/** Marks a claimed delivery finished. Only after this is a retry refused. */
export async function completePaymentEvent(eventUuid: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.rpc("complete_payment_event", { p_event_uuid: eventUuid });
  if (error) throw new Error(`Could not complete payment event: ${error.message}`);
}

/** Releases a claimed delivery so the provider's next retry can pick it up. */
export async function failPaymentEvent(eventUuid: string, reason: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.rpc("fail_payment_event", { p_event_uuid: eventUuid, p_error: reason });
  if (error) throw new Error(`Could not mark payment event failed: ${error.message}`);
}

export interface GrantFromCheckoutInput {
  /** The checkout session the payment was created against, echoed back by the
   * provider. This is what decides everything the payment grants. */
  checkoutSessionId: string;
  /** The provider's id for the payment itself, not for the delivery. */
  providerPaymentId: string;
  /** The payment_events row this came from, from claimPaymentEvent(). Required:
   * the webhook has just claimed one, and recording which delivery granted a
   * purchase is how a disputed grant gets traced back. */
  eventUuid: string;
  /** What the provider says it charged, in minor units. Compared against the
   * snapshot, never trusted in place of it. */
  reportedAmountMinor: number;
  reportedCurrency: string;
}

/**
 * Records the payment and grants everything the checkout session froze — in one
 * transaction.
 *
 * Notice what is not a parameter: the product, the price, the games. Those are
 * read from the checkout session inside the database. A webhook field claiming
 * a different product or a longer list of games has nothing to act on.
 *
 * The reported amount and currency ARE passed, but only to be compared against
 * the snapshot. A mismatch means the charge was not the charge we created —
 * tampering, or a provider misconfiguration — and the function raises rather
 * than granting. The caller should let that fail the delivery so it surfaces
 * and can be retried after investigation.
 *
 * Atomic on purpose. Writing the purchase and then the entitlements as two
 * client calls leaves a window where a crash produces a paid customer with no
 * access, and the retry would find the purchase already recorded.
 *
 * Idempotent at both levels — the purchase upserts on
 * (provider, provider_payment_id), and each entitlement on
 * (purchase_id, game_content_id). Note the second key: per PURCHASE, not per
 * user. Replaying this payment changes nothing, while a different payment for
 * the same game creates a second, separate grant, which is what makes refunds
 * unambiguous.
 */
export async function grantPurchaseFromCheckout({
  checkoutSessionId,
  providerPaymentId,
  eventUuid,
  reportedAmountMinor,
  reportedCurrency,
}: GrantFromCheckoutInput): Promise<{ purchaseId: string }> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase.rpc("grant_purchase_from_checkout", {
    p_checkout_session_id: checkoutSessionId,
    p_provider: PROVIDER,
    p_provider_payment_id: providerPaymentId,
    p_event_uuid: eventUuid,
    p_reported_amount_minor: reportedAmountMinor,
    p_reported_currency: reportedCurrency,
  });

  if (error) throw new Error(`Could not grant purchase: ${error.message}`);
  if (!data) throw new Error("grant_purchase_from_checkout returned no purchase id");

  return { purchaseId: data };
}

/**
 * Revokes a refunded payment's grants — and only those.
 *
 * Returns how many entitlements it actually revoked. If the buyer owns one of
 * those games through another live purchase, that grant is a separate row, it
 * is not touched, and the game stays playable. Refunding a bundle must not take
 * away a game somebody also bought on its own.
 */
export async function revokePurchase(
  providerPaymentId: string,
  status: "refunded" | "chargeback" = "refunded",
  reason?: string,
): Promise<number> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("revoke_purchase", {
    p_provider: PROVIDER,
    p_provider_payment_id: providerPaymentId,
    p_status: status,
    p_reason: reason,
  });

  if (error) throw new Error(`Could not revoke purchase: ${error.message}`);
  return data ?? 0;
}

/**
 * Drops raw webhook payloads older than the retention window, keeping the
 * idempotency record itself.
 *
 * Nothing schedules this yet. It is written so the retention decision is made
 * alongside the schema rather than after a year of payloads have piled up.
 */
export async function purgePaymentEventPayloads(olderThan = "180 days"): Promise<number> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("purge_payment_event_payloads", { p_older_than: olderThan });
  if (error) throw new Error(`Could not purge payment payloads: ${error.message}`);
  return data ?? 0;
}
