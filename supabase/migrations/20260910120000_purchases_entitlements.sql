-- Purchases and entitlements: the foundation for paid games.
--
-- NOT APPLIED YET — awaiting approval. Apply with `supabase db push`.
--
-- The shape of this is driven by two rules.
--
-- One: ownership is decided on the server, from a row that only a verified
-- payment could have created. Nothing a browser says — a success page, a query
-- parameter, a redirect it followed — is evidence of anything.
--
-- Two: what a payment buys is fixed when checkout is created, not when the
-- webhook arrives. The catalog is editable content: a bundle's contents and a
-- game's price can change at any time, and they should be able to. But a
-- payment is a contract about a specific set of games at a specific price on a
-- specific day. Resolving the bundle at grant time would mean an edit made
-- between "customer paid" and "webhook processed" silently changes what they
-- receive — and a replayed callback months later would grant today's bundle
-- rather than the one that was bought. So checkout snapshots the exact product,
-- amount, currency and expanded list of game contentIds, and the webhook grants
-- from that snapshot without consulting Sanity at all.
--
-- Four tables:
--
--   * checkout_sessions — the snapshot. Created server-side before the customer
--                         is sent to the payment provider; carries the frozen
--                         list of games the payment will grant.
--   * payment_events    — every webhook delivery, with the processing state that
--                         makes a retry finish the job instead of being turned
--                         away. The idempotency ledger.
--   * purchases         — one row per successful payment, carrying its own copy
--                         of the snapshot so the record stands alone.
--   * entitlements      — one row per grant of a game to a user. Ownership is
--                         "at least one un-revoked row exists", NOT "a row
--                         exists", because the same game can be owned through
--                         more than one purchase.
--
-- Design notes that matter more than the DDL:
--
--   * Every reference to a game is its immutable Sanity contentId
--     (game_<ULID>). Never a slug, never a title. A slug is editable and a
--     game's URL is expected to change; ownership must survive that.
--   * There is no foreign key to the game, because games live in Sanity rather
--     than in this database. contentId is stable by contract.
--   * Money is stored in minor units (agorot) as an integer. Never a float.
--   * The write paths are Postgres functions rather than sequences of client
--     calls, so a purchase and the entitlements it grants land in one
--     transaction — a crash between them cannot leave a paid customer with no
--     access.

-- ---------------------------------------------------------------------------
-- checkout_sessions — the snapshot of what is being bought
-- ---------------------------------------------------------------------------
-- Created server-side, from the catalog, before the customer leaves for the
-- payment provider. Its id is the reference handed to the provider, and it is
-- what the webhook looks the purchase up by.
--
-- There is deliberately no insert policy for users. If a signed-in visitor
-- could create one of these, they could create it with amount_minor = 0 and
-- every game in granted_game_content_ids. The row must be written by the
-- server, from values the server computed.

create table if not exists public.checkout_sessions (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users (id) on delete cascade,

  -- What the customer chose: a single game or a bundle.
  product_content_id       text not null,
  -- Display copy, frozen for the receipt. Never used for access decisions.
  product_title            text,

  -- THE SNAPSHOT. The expanded set of playable games this payment will grant,
  -- resolved from the catalog at creation time. A bundle edited afterwards does
  -- not change what this payment delivers.
  granted_game_content_ids text[] not null,

  amount_minor             integer not null,
  currency                 text not null default 'ILS',

  provider                 text not null default 'grow',
  status                   text not null default 'open',

  -- Governs whether a new payment may be started against this session. NOT
  -- checked at grant time: if the money moved, the customer gets what they
  -- paid for, however late the callback is.
  expires_at               timestamptz not null default now() + interval '2 hours',
  created_at               timestamptz not null default now(),
  completed_at             timestamptz,

  constraint checkout_sessions_provider_check check (provider in ('grow')),
  constraint checkout_sessions_status_check
    check (status in ('open', 'completed', 'cancelled')),

  constraint checkout_sessions_product_shape_check
    check (product_content_id ~ '^game_[0-9A-HJKMNP-TV-Z]{26}$'),

  -- Granting nothing is never correct, and every element must be a contentId.
  -- A CHECK cannot contain a subquery, so the array is flattened and matched as
  -- one string — which enforces the shape of every element at once.
  constraint checkout_sessions_granted_not_empty
    check (array_length(granted_game_content_ids, 1) >= 1),
  constraint checkout_sessions_granted_shape_check
    check (array_to_string(granted_game_content_ids, ',')
           ~ '^game_[0-9A-HJKMNP-TV-Z]{26}(,game_[0-9A-HJKMNP-TV-Z]{26})*$'),

  constraint checkout_sessions_amount_check check (amount_minor >= 0),
  constraint checkout_sessions_currency_check check (currency ~ '^[A-Z]{3}$')
);

create index if not exists checkout_sessions_user_created_idx
  on public.checkout_sessions (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- payment_events — the idempotency ledger, with retry state
-- ---------------------------------------------------------------------------
-- A provider may deliver the same event more than once: retries after a
-- timeout, at-least-once delivery, an operator replaying a callback. Recording
-- the delivery is what makes a repeat recognisable.
--
-- But "we have seen this id" is NOT sufficient grounds to refuse it. If the
-- handler crashed after recording and before granting, refusing every retry
-- would strand a customer who has paid. So the ledger carries processing state,
-- and only a delivery that ran to completion is refused.

create table if not exists public.payment_events (
  id            uuid primary key default gen_random_uuid(),
  provider      text not null default 'grow',
  -- The provider's own id for this delivery.
  event_id      text not null,

  -- Nullable so the payload can be purged on a retention schedule without
  -- losing the idempotency record itself. See purge_payment_event_payloads().
  payload       jsonb,
  payload_purged_at timestamptz,

  -- pending    — recorded, not yet started
  -- processing — claimed by a handler; locked_at says when
  -- processed  — finished successfully. The ONLY state that refuses a retry.
  -- failed     — the handler errored. Retries are welcome.
  status        text not null default 'pending',
  attempts      integer not null default 0,
  locked_at     timestamptz,
  processed_at  timestamptz,
  error         text,

  received_at   timestamptz not null default now(),

  constraint payment_events_provider_check check (provider in ('grow')),
  constraint payment_events_status_check
    check (status in ('pending', 'processing', 'processed', 'failed')),
  constraint payment_events_provider_event_unique unique (provider, event_id)
);

create index if not exists payment_events_status_idx
  on public.payment_events (status, received_at desc);

create index if not exists payment_events_payload_retention_idx
  on public.payment_events (received_at) where payload is not null;

-- ---------------------------------------------------------------------------
-- purchases — one row per successful payment
-- ---------------------------------------------------------------------------

create table if not exists public.purchases (
  id                  uuid primary key default gen_random_uuid(),

  -- Nullable, and set null when the account is deleted: a payment record
  -- outlives the account it belonged to, because it is a financial record and
  -- because a refund may still have to be reconciled after the person has
  -- gone. An orphaned row is invisible to every user — the RLS policy compares
  -- against auth.uid(), and null never matches.
  user_id             uuid references auth.users (id) on delete set null,

  -- The snapshot this was granted from. Set null rather than cascading, so
  -- pruning old sessions never deletes a payment record.
  checkout_session_id uuid references public.checkout_sessions (id) on delete set null,

  provider            text not null default 'grow',
  -- The provider's id for the PAYMENT (not the delivery). One payment can
  -- produce several events — paid, then refunded — but only ever one row here.
  provider_payment_id text not null,
  -- The delivery that created this row, for tracing.
  event_id            uuid references public.payment_events (id) on delete set null,

  -- Copied from the snapshot, so this row answers "what was bought" on its own
  -- even after the session is pruned and however the catalog changes later.
  product_content_id  text not null,
  granted_game_content_ids text[] not null,

  amount_minor        integer not null,
  currency            text not null default 'ILS',
  status              text not null default 'paid',

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint purchases_provider_check check (provider in ('grow')),

  constraint purchases_product_shape_check
    check (product_content_id ~ '^game_[0-9A-HJKMNP-TV-Z]{26}$'),
  constraint purchases_granted_not_empty
    check (array_length(granted_game_content_ids, 1) >= 1),
  constraint purchases_granted_shape_check
    check (array_to_string(granted_game_content_ids, ',')
           ~ '^game_[0-9A-HJKMNP-TV-Z]{26}(,game_[0-9A-HJKMNP-TV-Z]{26})*$'),

  constraint purchases_amount_check check (amount_minor >= 0),
  constraint purchases_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint purchases_status_check check (status in ('paid', 'refunded', 'chargeback')),

  -- One payment, one row — whatever happens upstream.
  constraint purchases_provider_payment_unique unique (provider, provider_payment_id)
);

create index if not exists purchases_user_created_idx
  on public.purchases (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- entitlements — grants of access
-- ---------------------------------------------------------------------------
-- Deliberately NOT one row per (user, game).
--
-- Someone can buy "היער הקסום" on its own and later buy the bundle that also
-- contains it. Those are two separate grants from two separate payments, and
-- collapsing them into one row would make a refund ambiguous: revoking the
-- single-game purchase would have to decide whether the bundle's claim on that
-- game still stands, with nothing recorded to decide it from.
--
-- So each grant gets its own row, and ownership is a question about the set:
--   owns(user, game)  <=>  exists a row where revoked_at is null

create table if not exists public.entitlements (
  id               uuid primary key default gen_random_uuid(),

  -- Access dies with the account: unlike a payment record there is nothing to
  -- reconcile afterwards, and keeping it would be keeping personal data for no
  -- reason.
  user_id          uuid not null references auth.users (id) on delete cascade,

  -- Always a single playable game, never a bundle.
  game_content_id  text not null,

  -- 'bundle' and 'purchase' both follow a payment; 'manual' is a deliberate
  -- support grant with no payment behind it.
  source           text not null default 'purchase',
  purchase_id      uuid references public.purchases (id) on delete set null,

  granted_at       timestamptz not null default now(),
  -- A refund revokes rather than deletes, so history stays readable.
  revoked_at       timestamptz,
  revoked_reason   text,

  constraint entitlements_game_shape_check
    check (game_content_id ~ '^game_[0-9A-HJKMNP-TV-Z]{26}$'),
  constraint entitlements_source_check
    check (source in ('purchase', 'bundle', 'manual')),
  constraint entitlements_purchase_link_check
    check ((source = 'manual') = (purchase_id is null))
);

-- One purchase grants a given game at most once. This is what makes a replayed
-- webhook idempotent, while still allowing a DIFFERENT purchase to grant the
-- same game to the same person.
create unique index if not exists entitlements_purchase_game_unique
  on public.entitlements (purchase_id, game_content_id)
  where purchase_id is not null;

-- Manual grants have no purchase to key on, so they are deduplicated per user.
create unique index if not exists entitlements_manual_user_game_unique
  on public.entitlements (user_id, game_content_id)
  where purchase_id is null;

create index if not exists entitlements_user_active_idx
  on public.entitlements (user_id, game_content_id) where revoked_at is null;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- A signed-in person may READ their own rows and may write NOTHING. There is no
-- insert, update or delete policy for `authenticated` anywhere below, and no
-- policy at all for `anon`.
--
-- With RLS enabled and no matching policy, the operation is denied. So the only
-- way a checkout session, purchase or entitlement can be created is with the
-- service-role key, which bypasses RLS, is read only inside a server-only
-- module, and is never part of the browser bundle.

alter table public.checkout_sessions enable row level security;
alter table public.checkout_sessions force row level security;

alter table public.payment_events enable row level security;
alter table public.payment_events force row level security;

alter table public.purchases enable row level security;
alter table public.purchases force row level security;

alter table public.entitlements enable row level security;
alter table public.entitlements force row level security;

-- payment_events: no policies whatsoever. Raw provider payloads are nobody's
-- business but the server's, and they are not per-user data.

drop policy if exists "checkout_sessions_select_own" on public.checkout_sessions;
create policy "checkout_sessions_select_own"
  on public.checkout_sessions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "purchases_select_own" on public.purchases;
create policy "purchases_select_own"
  on public.purchases
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "entitlements_select_own" on public.entitlements;
create policy "entitlements_select_own"
  on public.entitlements
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Table privileges
-- ---------------------------------------------------------------------------
-- RLS above is the real control: with it enabled and forced, and no
-- insert/update/delete policy anywhere, those operations are denied whatever
-- the table grant says. This section is the second lock on the same door.
--
-- It matters because this project's default privileges hand anon and
-- authenticated full CRUD on every new table in public. Relying on RLS alone
-- would mean one forgotten `create policy` — or one policy written slightly too
-- wide — is the only thing between a signed-in visitor and writing their own
-- entitlements. Revoking the privilege as well means such a mistake fails on
-- privilege before RLS is even consulted.
--
-- SELECT is kept for authenticated on the three tables a person legitimately
-- reads about themselves, and the RLS policies above still decide WHICH rows.
-- anon keeps nothing at all: every policy here is `to authenticated`, so a
-- signed-out visitor would see zero rows regardless, and there is no reason for
-- the grant to exist.

revoke all on table public.checkout_sessions from anon, authenticated;
revoke all on table public.payment_events    from anon, authenticated;
revoke all on table public.purchases         from anon, authenticated;
revoke all on table public.entitlements      from anon, authenticated;

-- The only user-facing access: read your own rows, filtered by RLS.
-- A future /my-games and a receipts list are the intended readers.
grant select on table public.checkout_sessions to authenticated;
grant select on table public.purchases         to authenticated;
grant select on table public.entitlements      to authenticated;

-- payment_events is deliberately absent. Raw provider payloads are not
-- per-user data and nobody but the server has any business reading them.

-- The server side. service_role has rolbypassrls = true, so `force row level
-- security` does not stand in its way, but it still needs the table privilege:
-- the RPC functions are SECURITY INVOKER, so they act with the caller's rights
-- rather than the owner's.
grant select, insert, update, delete on table public.checkout_sessions to service_role;
grant select, insert, update, delete on table public.payment_events    to service_role;
grant select, insert, update, delete on table public.purchases         to service_role;
grant select, insert, update, delete on table public.entitlements      to service_role;

-- ---------------------------------------------------------------------------
-- claim_payment_event — atomic "may I process this delivery?"
-- ---------------------------------------------------------------------------
-- Returns claimed = true when the caller now owns this delivery and must
-- process it; false when it is already done or another handler holds it.
--
-- Atomic by construction: the INSERT ... ON CONFLICT DO UPDATE ... WHERE is a
-- single statement, so two callbacks arriving at the same instant cannot both
-- win. The WHERE on the DO UPDATE is the whole trick — it only re-claims a
-- delivery that is pending, that previously failed, or whose 'processing' lock
-- has gone stale. A delivery in 'processed' matches nothing, the statement
-- returns no rows, and the retry is refused.

create or replace function public.claim_payment_event(
  p_provider text,
  p_event_id text,
  p_payload jsonb,
  p_stale_after interval default interval '15 minutes'
)
returns table (event_uuid uuid, claimed boolean, current_status text, attempt integer)
language plpgsql
as $$
declare
  v_id uuid;
  v_status text;
  v_attempts integer;
begin
  insert into public.payment_events (provider, event_id, payload, status, attempts, locked_at)
  values (p_provider, p_event_id, p_payload, 'processing', 1, now())
  on conflict (provider, event_id) do update
    set status    = 'processing',
        attempts  = public.payment_events.attempts + 1,
        locked_at = now(),
        error     = null,
        -- Keep the first payload we stored; do not resurrect a purged one.
        payload   = case
                      when public.payment_events.payload_purged_at is not null then null
                      else coalesce(public.payment_events.payload, excluded.payload)
                    end
    where public.payment_events.status in ('pending', 'failed')
       or (public.payment_events.status = 'processing'
           and public.payment_events.locked_at < now() - p_stale_after)
  returning id, status, attempts into v_id, v_status, v_attempts;

  if v_id is not null then
    return query select v_id, true, v_status, v_attempts;
    return;
  end if;

  -- Not claimed. Report why, so the handler can log "already done" separately
  -- from "another worker has it".
  select id, status, attempts into v_id, v_status, v_attempts
  from public.payment_events
  where provider = p_provider and event_id = p_event_id;

  return query select v_id, false, v_status, v_attempts;
end;
$$;

-- Marks a claimed delivery finished. Only after this can a retry be refused.
create or replace function public.complete_payment_event(p_event_uuid uuid)
returns void
language sql
as $$
  update public.payment_events
     set status = 'processed', processed_at = now(), locked_at = null, error = null
   where id = p_event_uuid;
$$;

-- Releases a claimed delivery so the provider's next retry can pick it up.
create or replace function public.fail_payment_event(p_event_uuid uuid, p_error text)
returns void
language sql
as $$
  update public.payment_events
     set status = 'failed', locked_at = null, error = left(p_error, 2000)
   where id = p_event_uuid;
$$;

-- ---------------------------------------------------------------------------
-- grant_purchase_from_checkout — grant exactly what was snapshotted
-- ---------------------------------------------------------------------------
-- Takes no product or price from the caller. It reads the checkout session and
-- grants what that session froze, so neither a later catalog edit nor a forged
-- webhook field can change what is delivered.
--
-- The amount the provider reports IS passed in, but only to be compared. A
-- mismatch means the charge was not the charge we created, which is either
-- tampering or a provider misconfiguration; either way it must not be granted
-- silently.
--
-- One transaction: session lock, purchase, entitlements, session completion.

create or replace function public.grant_purchase_from_checkout(
  p_checkout_session_id uuid,
  p_provider text,
  p_provider_payment_id text,
  p_event_uuid uuid,
  p_reported_amount_minor integer,
  p_reported_currency text
)
returns uuid
language plpgsql
as $$
declare
  v_session public.checkout_sessions%rowtype;
  v_purchase_id uuid;
  v_source text;
begin
  -- FOR UPDATE so two simultaneous deliveries for the same session serialise
  -- rather than racing.
  select * into v_session
    from public.checkout_sessions
   where id = p_checkout_session_id
     for update;

  if v_session.id is null then
    raise exception 'checkout session % not found', p_checkout_session_id;
  end if;

  if v_session.status = 'cancelled' then
    raise exception 'checkout session % was cancelled', p_checkout_session_id;
  end if;

  -- Deliberately no expiry check: if the money moved, the customer gets what
  -- they paid for, however late the callback arrives.

  if p_reported_amount_minor is distinct from v_session.amount_minor
     or upper(p_reported_currency) is distinct from upper(v_session.currency) then
    raise exception
      'payment % does not match checkout session %: reported % %, expected % %',
      p_provider_payment_id, p_checkout_session_id,
      p_reported_amount_minor, p_reported_currency,
      v_session.amount_minor, v_session.currency;
  end if;

  insert into public.purchases (
    user_id, checkout_session_id, provider, provider_payment_id, event_id,
    product_content_id, granted_game_content_ids, amount_minor, currency, status
  )
  values (
    v_session.user_id, v_session.id, p_provider, p_provider_payment_id, p_event_uuid,
    v_session.product_content_id, v_session.granted_game_content_ids,
    v_session.amount_minor, v_session.currency, 'paid'
  )
  on conflict (provider, provider_payment_id) do update
    -- A retry lands on the existing row rather than failing. Status is NOT
    -- re-asserted, so a stale delivery cannot un-refund a refunded payment.
    set updated_at = now(),
        event_id   = coalesce(public.purchases.event_id, excluded.event_id)
  returning id into v_purchase_id;

  v_source := case
                when array_length(v_session.granted_game_content_ids, 1) > 1 then 'bundle'
                else 'purchase'
              end;

  -- One row per game granted BY THIS PURCHASE, straight from the snapshot. The
  -- partial unique index on (purchase_id, game_content_id) makes a replay a
  -- no-op, while leaving a different purchase free to grant the same game.
  insert into public.entitlements (user_id, game_content_id, source, purchase_id)
  select v_session.user_id, game_id, v_source, v_purchase_id
    from unnest(v_session.granted_game_content_ids) as game_id
  on conflict (purchase_id, game_content_id) where purchase_id is not null
  do nothing;

  update public.checkout_sessions
     set status = 'completed', completed_at = coalesce(completed_at, now())
   where id = v_session.id;

  return v_purchase_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- revoke_purchase — a refund, without over-revoking
-- ---------------------------------------------------------------------------
-- Revokes ONLY the entitlements this purchase granted. If the person also owns
-- one of those games through another active grant, that grant is untouched and
-- the game stays playable. Also one transaction.

create or replace function public.revoke_purchase(
  p_provider text,
  p_provider_payment_id text,
  p_status text default 'refunded',
  p_reason text default null
)
returns integer
language plpgsql
as $$
declare
  v_purchase_id uuid;
  v_revoked integer;
begin
  if p_status not in ('refunded', 'chargeback') then
    raise exception 'revoke_purchase expects refunded or chargeback, got %', p_status;
  end if;

  update public.purchases
     set status = p_status, updated_at = now()
   where provider = p_provider and provider_payment_id = p_provider_payment_id
  returning id into v_purchase_id;

  if v_purchase_id is null then
    return 0;
  end if;

  with revoked as (
    update public.entitlements
       set revoked_at = now(), revoked_reason = coalesce(p_reason, p_status)
     where purchase_id = v_purchase_id
       and revoked_at is null
    returning 1
  )
  select count(*) into v_revoked from revoked;

  return v_revoked;
end;
$$;

-- ---------------------------------------------------------------------------
-- purge_payment_event_payloads — raw payload retention
-- ---------------------------------------------------------------------------
-- Raw provider payloads are kept only as long as they are useful for resolving
-- a dispute, then dropped. The idempotency record — provider, event_id, status,
-- timestamps — is kept forever, because it is small, carries nothing personal,
-- and is what stops a replayed callback years from now.
--
-- Default window is 180 days, covering the outer edge of card chargeback
-- windows. Nothing schedules this yet.

create or replace function public.purge_payment_event_payloads(
  p_older_than interval default interval '180 days'
)
returns integer
language plpgsql
as $$
declare
  v_purged integer;
begin
  with purged as (
    update public.payment_events
       set payload = null, payload_purged_at = now()
     where payload is not null
       and received_at < now() - p_older_than
    returning 1
  )
  select count(*) into v_purged from purged;

  return v_purged;
end;
$$;

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------
-- These functions grant paid access. Who may call them is not something to
-- leave to defaults, and the defaults here are actively dangerous.
--
-- Two separate mechanisms hand out EXECUTE on a newly created function:
--
--   1. Postgres grants EXECUTE to PUBLIC on every new function.
--   2. This project's default privileges grant EXECUTE to anon, authenticated
--      and service_role EXPLICITLY whenever postgres creates a function in
--      public:
--        postgres=X/postgres | anon=X/postgres | authenticated=X/postgres |
--        service_role=X/postgres
--
-- The second is the trap. `REVOKE ... FROM public` removes only the first, so a
-- function revoked from PUBLIC alone is still callable by anon and by any
-- signed-in visitor through PostgREST — measured, not assumed:
--
--   revoke from public only  ->  anon=t authenticated=t service_role=t
--   revoke + explicit grant  ->  anon=f authenticated=f service_role=t
--
-- So every role is named explicitly on both sides. service_role is granted
-- rather than assumed: these functions are owned by postgres, not by
-- service_role, so it holds no privilege by virtue of ownership, and relying on
-- the default ACL would mean relying on a project setting that could change.

revoke all on function public.claim_payment_event(text, text, jsonb, interval) from public, anon, authenticated;
revoke all on function public.complete_payment_event(uuid) from public, anon, authenticated;
revoke all on function public.fail_payment_event(uuid, text) from public, anon, authenticated;
revoke all on function public.grant_purchase_from_checkout(uuid, text, text, uuid, integer, text) from public, anon, authenticated;
revoke all on function public.revoke_purchase(text, text, text, text) from public, anon, authenticated;
revoke all on function public.purge_payment_event_payloads(interval) from public, anon, authenticated;

grant execute on function public.claim_payment_event(text, text, jsonb, interval) to service_role;
grant execute on function public.complete_payment_event(uuid) to service_role;
grant execute on function public.fail_payment_event(uuid, text) to service_role;
grant execute on function public.grant_purchase_from_checkout(uuid, text, text, uuid, integer, text) to service_role;
grant execute on function public.revoke_purchase(text, text, text, text) to service_role;
grant execute on function public.purge_payment_event_payloads(interval) to service_role;

-- Post-apply check. Every row must read anon=f, authenticated=f, service_role=t:
--
--   select p.proname,
--          has_function_privilege('anon',          p.oid, 'EXECUTE') as anon,
--          has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated,
--          has_function_privilege('service_role',  p.oid, 'EXECUTE') as service_role
--     from pg_proc p
--     join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public'
--      and p.proname in ('claim_payment_event', 'complete_payment_event',
--                        'fail_payment_event', 'grant_purchase_from_checkout',
--                        'revoke_purchase', 'purge_payment_event_payloads');

-- ---------------------------------------------------------------------------

comment on table public.checkout_sessions is
  'The snapshot of what a payment will buy, frozen server-side before the customer leaves for the provider. granted_game_content_ids is authoritative: the webhook grants from it and never re-reads the catalog.';
comment on column public.checkout_sessions.granted_game_content_ids is
  'The expanded set of playable games this payment grants, resolved from Sanity at creation time. Editing a bundle afterwards does not change what an existing session delivers.';
comment on table public.payment_events is
  'Every webhook delivery received from a payment provider, with the processing state that lets a failed delivery be retried. Only status = processed refuses a retry.';
comment on table public.purchases is
  'One row per successful payment, carrying its own copy of the checkout snapshot. user_id is nullable: a payment record outlives the account. Not the access check — see entitlements.';
comment on table public.entitlements is
  'One row per grant of a game to a user. Ownership is "at least one row with revoked_at is null" — the same game may be owned through several purchases, and refunding one does not revoke the others.';
