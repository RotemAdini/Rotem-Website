-- Favourites: table privileges, narrowed to what the app actually does.
--
-- NOT YET APPLIED. Created during the pre-launch hardening pass; apply with
-- `supabase db push` when Rotem is ready.
--
-- Why this exists
-- ---------------
-- RLS decides *which rows* a role may touch. Table privileges decide *which
-- statements* a role may issue at all. 20260908120000_favorites.sql set up the
-- first half and left the second at Supabase's project default, which grants
-- ALL on every new table in schema public to anon and authenticated. Today
-- nothing leaks, because the policies deny every row anon asks for and every
-- row that is not the caller's own — but that makes RLS the single thing
-- standing between a stranger's publishable key and this table. Two locks are
-- better than one:
--
--   * anon loses everything. A signed-out visitor has no business naming this
--     table in any statement; signed-out favourites live in localStorage.
--   * authenticated keeps exactly SELECT, INSERT and DELETE — the three verbs
--     lib/favorites/actions.ts issues — and loses UPDATE, TRUNCATE,
--     REFERENCES and TRIGGER.
--
-- Why UPDATE is not in that list: the app's only "save" is a PostgREST upsert
-- sent with `ignoreDuplicates: true`, which becomes INSERT ... ON CONFLICT DO
-- NOTHING. That needs INSERT alone. A favourite has no mutable column anyway,
-- which is also why the original migration deliberately wrote no UPDATE
-- policy. If a future change ever switches that upsert to merge-duplicates,
-- it will need both an UPDATE policy and an UPDATE grant added here.
--
-- What this migration does NOT do
-- -------------------------------
-- It creates, alters and drops no policy, and it changes no column, index or
-- constraint. The three policies from 20260908120000_favorites.sql and FORCE
-- ROW LEVEL SECURITY are left exactly as they are. service_role is untouched:
-- it keeps its project-default privileges, and RLS is forced on this table so
-- even it answers to the policies.
--
-- Re-running this file is a no-op: REVOKE and GRANT both state a desired end
-- state rather than applying a delta, and the two ALTER TABLE lines below
-- re-assert settings that are already in force.

-- ---------------------------------------------------------------------------
-- Guard rails re-asserted (no-ops on a correctly migrated database)
-- ---------------------------------------------------------------------------
-- Stated here so that a database which somehow lost them cannot end up with
-- narrowed grants and open rows, which would look tightened and not be.

alter table public.favorites enable row level security;
alter table public.favorites force row level security;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

-- Start from nothing for both client-facing roles, so this file's end state
-- does not depend on what the project default happened to grant.
revoke all privileges on table public.favorites from anon;
revoke all privileges on table public.favorites from authenticated;

-- PUBLIC is every role there is or will be. Nothing is granted to it today;
-- revoking keeps a future blanket `grant ... to public` from quietly undoing
-- the two lines above. anon, authenticated and service_role all hold their own
-- direct grants, so nothing depends on a PUBLIC grant here.
revoke all privileges on table public.favorites from public;

-- The three verbs the app issues, and nothing else. Row-level access stays
-- with the policies: these grants let a signed-in reader name the table,
-- the policies decide that the only rows they reach are their own.
grant select, insert, delete on table public.favorites to authenticated;

comment on table public.favorites is
  'One row per (user, saved content item). content_id is the application''s immutable canonical contentId from Sanity — never a slug. RLS restricts every row to its owner; anon holds no privileges at all and authenticated holds only SELECT, INSERT and DELETE.';
