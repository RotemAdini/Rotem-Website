-- Additive entitlement audit fields and non-purchase source support.
-- This migration is intentionally local only; do not apply it remotely as
-- part of the game integration.

alter table public.entitlements
  add column if not exists note text,
  add column if not exists source_reference text,
  add column if not exists granted_by uuid references auth.users (id) on delete set null,
  add column if not exists revoked_by uuid references auth.users (id) on delete set null;

alter table public.entitlements
  drop constraint if exists entitlements_source_check,
  add constraint entitlements_source_check
    check (source in ('purchase', 'bundle', 'manual', 'legacy', 'promo', 'gift'));

alter table public.entitlements
  drop constraint if exists entitlements_purchase_link_check,
  add constraint entitlements_purchase_link_check
    check (
      (source in ('purchase', 'bundle') and purchase_id is not null)
      or
      (source in ('manual', 'legacy', 'promo', 'gift') and purchase_id is null)
    );

-- The original index covered revoked rows forever, preventing support from
-- issuing a fresh manual/non-purchase grant after an earlier one was revoked.
drop index if exists public.entitlements_manual_user_game_unique;
create unique index if not exists entitlements_active_nonpurchase_unique
  on public.entitlements (user_id, game_content_id, source)
  where purchase_id is null and revoked_at is null;

create index if not exists entitlements_source_reference_idx
  on public.entitlements (source, source_reference)
  where source_reference is not null;

comment on column public.entitlements.note is
  'Operator-facing context for a grant. Never used to decide access.';
comment on column public.entitlements.source_reference is
  'External/support reference for a non-purchase grant, when one exists.';
comment on column public.entitlements.granted_by is
  'The operator account that issued a non-purchase grant, when applicable.';
comment on column public.entitlements.revoked_by is
  'The operator account that revoked the grant, when applicable.';
