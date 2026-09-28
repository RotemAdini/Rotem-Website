create table if not exists public.game_feedback (
  id uuid primary key default gen_random_uuid(),
  game_id text not null,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  constraint game_feedback_game_id_format
    check (game_id ~ '^[a-z0-9][a-z0-9-]{0,63}$')
);

alter table public.game_feedback enable row level security;
alter table public.game_feedback force row level security;

revoke all on table public.game_feedback from anon, authenticated;
grant insert (game_id, rating, comment) on table public.game_feedback to authenticated;
grant select, insert, update, delete on table public.game_feedback to service_role;

drop policy if exists "entitled users can submit enchanted forest feedback" on public.game_feedback;
create policy "entitled users can submit enchanted forest feedback"
on public.game_feedback
for insert
to authenticated
with check (
  game_id = 'enchanted-forest'
  and rating between 1 and 5
  and (comment is null or char_length(comment) <= 1000)
  and exists (
    select 1
    from public.entitlements entitlement
    where entitlement.user_id = (select auth.uid())
      and entitlement.game_content_id = 'game_01M1YKBSJS9WTKJ0G9W19KDJ18'
      and entitlement.revoked_at is null
  )
);

-- Intentionally no SELECT, UPDATE, or DELETE policy for browser roles.
