-- Run in the approved project's SQL Editor as its administrator, never with an application service-role key.
-- Idempotent upgrade from the initial schema; existing private records are preserved.
begin;
create table if not exists public.core_founders (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table if not exists public.core_founder_workspaces (
  user_id uuid primary key references public.core_founders(user_id) on delete cascade,
  revision integer not null default 0 check (revision >= 0),
  data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 48000),
  updated_at timestamptz not null default now()
);
create schema if not exists core_private;
revoke all on schema core_private from public, anon, authenticated;
grant usage on schema core_private to authenticated;
-- Supabase signs session_id in the user JWT; logout removes that session from auth.sessions.
-- This narrowly scoped definer can read Auth state; no client receives access to auth.sessions.
create or replace function core_private.founder_session_active() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.sessions s
    join public.core_founders f on f.user_id = s.user_id
    where s.user_id = (select auth.uid())
      and s.id = ((select auth.jwt())->>'session_id')::uuid
  );
$$;
revoke all on function core_private.founder_session_active() from public, anon, authenticated;
grant execute on function core_private.founder_session_active() to authenticated;
alter table public.core_founders enable row level security;
alter table public.core_founder_workspaces enable row level security;
revoke all on public.core_founders from public, anon, authenticated;
revoke all on public.core_founder_workspaces from public, anon, authenticated;
grant select on public.core_founders to authenticated;
grant select, update on public.core_founder_workspaces to authenticated;
drop policy if exists founder_membership_read on public.core_founders;
create policy founder_membership_read on public.core_founders for select to authenticated
  using (user_id = (select auth.uid()) and (select core_private.founder_session_active()));
drop policy if exists founder_workspace_read on public.core_founder_workspaces;
create policy founder_workspace_read on public.core_founder_workspaces for select to authenticated
  using (user_id = (select auth.uid()) and (select core_private.founder_session_active()));
drop policy if exists founder_workspace_update on public.core_founder_workspaces;
create policy founder_workspace_update on public.core_founder_workspaces for update to authenticated
  using (user_id = (select auth.uid()) and (select core_private.founder_session_active()))
  with check (user_id = (select auth.uid()) and (select core_private.founder_session_active()));
commit;
