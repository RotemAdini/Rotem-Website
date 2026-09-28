# Purchase, account, entitlement, and My Games flow

This is the agreed implementation spec. It describes intended behavior; it does not imply that Grow, Supabase, or My Games has been implemented.

## Sign-in and checkout

- Buying requires a signed-in account using Google through Supabase. The Supabase user ID is the permanent owner key; account merges are handled manually.
- Explain before checkout that purchased games are opened from the signed-in account. If a signed-out visitor selects Buy, preserve the selected product through sign-in and resume checkout afterward.
- Use Grow’s server-side Create Payment Link/API flow. Before redirecting to Grow’s hosted payment page, persist the `user_id`, `product_id`, expected amount, and unique `attempt_id`.
- While an attempt is pending, block another checkout for the same product and provide status refresh and a support path. Pending, failed, and canceled payments grant no access.

## Catalog and offers

- The server-side catalog is authoritative for current products, prices, and offer contents. Never hardcode a bundle’s price or number of games in entitlement logic.
- Display the current catalog price before checkout, including the bundle/offer price and its savings where applicable. Send the same expected amount to Grow and require the verified transaction amount to match.
- Offers are data-driven and may change. A purchase grants the games included in that offer at the time of purchase. Do not duplicate existing entitlements; future offers may have different prices or upgrade/discount rules.

## Grow payment and webhooks

- The customer pays on Grow’s hosted page and returns to the site. The return/success page never grants access; show “Payment received, confirming access” until the entitlement is verified, then link to My Games.
- Accept payment state only from verified Grow server notifications or Grow’s authoritative transaction status. Process webhook events idempotently and retain event history.
- Use a Grow timestamp or sequence for ordering only when Grow identifies it as authoritative. Otherwise consult Grow’s authoritative transaction status; never infer the latest state from webhook arrival order. Hold unresolved ambiguity for support review.
- Match each verified transaction to its stored checkout attempt, product, and expected amount. Product/amount mismatches do not grant access automatically and are held for authorized support review with the mismatch and resolution logged.

## Entitlement rules

- Grant access only after a successful payment is verified, its product and amount match the stored checkout, and the entitlement has been saved. A bundle/offer grants each included game; existing entitlements are not duplicated.
- Retry entitlement writes safely if a verified payment arrives but saving fails. Keep the buyer in the confirming-access state until access is actually granted.
- A verified refund or chargeback revokes the affected access. A later verified successful purchase restores access unless the account has a separate fraud/support restriction.
- Do not interrupt a game session already in progress when access is revoked. Check entitlement on every protected game URL, including direct links, and again on the next launch or session renewal.

## My Games

- Show only owned games with active access. Each entry has an image, title, and “Play now” action. Show the games included in an offer individually, not as a separate bundle item.
- Show loading while retrieving entitlements, then a retryable error if the lookup fails. Do not trust stale access data alone.
- After verified refund/chargeback, remove the affected game from My Games.
- After access is granted, send an access-confirmation email. Email failure never affects access; retry delivery separately. Grow sends the payment receipt.

## Restricted accounts

- An account-level fraud/support restriction blocks access to all games and prevents new checkout. My Games shows a clear restricted-access notice and support path.
- Only authorized support can add or remove a restriction. Record the staff identity, reason, and change history for each action.

## Account deletion

- Logging out does not affect ownership. Explicit account deletion ends access to games linked to that account.
- State this clearly in the Terms and in the account-deletion confirmation. Retain only the minimum purchase/payment records needed for reconciliation and legal/accounting needs.
- If payment is confirmed after account deletion, do not recreate the account or transfer access automatically; hold the transaction for authorized support review.

## Support and manual review

- Hold for authorized support review when product/amount does not match, Grow’s authoritative transaction state remains ambiguous, or payment is confirmed after account deletion. Log the issue and its resolution.
- Record who made each manual account restriction change and why. Manual review does not itself grant an entitlement; access still requires a verified, matching payment and a saved entitlement.
