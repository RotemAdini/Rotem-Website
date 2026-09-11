-- Favourites: one row per (user, content item).
--
-- Applied to the linked project with `supabase db push`. Every statement is
-- guarded (if not exists / drop policy if exists) so re-running it is safe.
--
-- Design notes that matter more than the DDL:
--
--   * content_id stores the application's immutable canonical contentId
--     (recipe_<ULID> / date_<ULID>), never a slug. A slug is editable and a
--     recipe's URL is expected to change; a favourite must survive that.
--     This is the whole reason contentId exists.
--   * There is no foreign key to the content, because the content lives in
--     Sanity rather than in this database. contentId is stable by contract:
--     it is minted once in data/migration/content-manifest.json and the Sanity
--     schema marks it read-only.
--   * Nothing here stores purchases, entitlements, payment ids or access
--     state. Those are a separate concern and a separate table, later.

create table if not exists public.favorites (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  content_type  text not null,
  content_id    text not null,
  created_at    timestamptz not null default now(),

  -- Only recipes and date ideas are favouritable today. Games deliberately are
  -- not: the current site has no favourite control on a game card, and adding
  -- one is a product decision, not a migration detail. Widening this list is a
  -- one-line change when that decision is made.
  constraint favorites_content_type_check
    check (content_type in ('recipe', 'dateIdea')),

  -- A canonical id, not a slug. Shape-checked so a slug cannot be written here
  -- by mistake: Hebrew slugs and legacy route ids both fail this pattern.
  constraint favorites_content_id_shape_check
    check (content_id ~ '^(recipe|date)_[0-9A-HJKMNP-TV-Z]{26}$'),

  constraint favorites_content_type_id_check
    check (
      (content_type = 'recipe' and content_id like 'recipe\_%' escape '\') or
      (content_type = 'dateIdea' and content_id like 'date\_%' escape '\')
    ),

  -- Saving the same item twice is the same favourite. This is what makes the
  -- localStorage migration idempotent and what collapses several legacy
  -- aliases of one merged recipe into a single row.
  constraint favorites_user_content_unique
    unique (user_id, content_type, content_id)
);

-- The only query the app makes: "this user's favourites, newest first".
create index if not exists favorites_user_created_idx
  on public.favorites (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- Without RLS enabled, the publishable key would let any visitor read every
-- row in this table. Enabling it denies everything by default; the policies
-- below then allow each user exactly their own rows and nothing else.

alter table public.favorites enable row level security;

-- Belt and braces: even a future policy mistake cannot let the table owner
-- bypass RLS.
alter table public.favorites force row level security;

drop policy if exists "favorites_select_own" on public.favorites;
create policy "favorites_select_own"
  on public.favorites
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "favorites_insert_own" on public.favorites;
create policy "favorites_insert_own"
  on public.favorites
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_delete_own"
  on public.favorites
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- No UPDATE policy on purpose. A favourite has no mutable field — you add it
-- or you remove it — so there is nothing to update, and leaving UPDATE
-- unpolicied means it is denied.
--
-- No policy for the `anon` role on purpose either. A signed-out visitor can
-- browse every recipe, date idea and game, but cannot read or write a single
-- row here. Signed-out favourites keep working in localStorage exactly as they
-- do today.

comment on table public.favorites is
  'One row per (user, saved content item). content_id is the application''s immutable canonical contentId from Sanity — never a slug. RLS restricts every row to its owner.';
comment on column public.favorites.content_id is
  'Immutable canonical contentId (recipe_<ULID> / date_<ULID>). Survives slug and title changes; several legacy localStorage tokens can map to one of these.';
