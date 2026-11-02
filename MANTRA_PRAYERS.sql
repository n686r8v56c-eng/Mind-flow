-- Mind Flow: Prayer library. Run in Supabase SQL Editor once.
create table if not exists public.mindflow_mantra_prayers (
 user_id uuid not null references auth.users(id) on delete cascade,
 id uuid not null,
 payload jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now(),
 primary key(user_id,id)
);
alter table public.mindflow_mantra_prayers enable row level security;
drop policy if exists "Mindflow prayers own" on public.mindflow_mantra_prayers;
create policy "Mindflow prayers own" on public.mindflow_mantra_prayers for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
