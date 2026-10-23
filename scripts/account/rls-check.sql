-- Read-only RLS isolation check for the founder account tables. Every write attempt is rolled back.
-- Run as the project administrator: supabase db query --linked -f scripts/account/rls-check.sql
begin;
create temp table rls_results(check_name text, passed boolean) on commit drop;
grant all on rls_results to anon, authenticated;
create function pg_temp.claims(uid uuid, sid uuid) returns text language sql as $$
  select json_build_object('sub',uid,'role','authenticated','session_id',sid)::text $$;

-- Anonymous visitors hold no table privileges at all.
set local role anon;
do $$ begin
  begin perform 1 from public.core_founder_workspaces; insert into rls_results values ('anon workspace read denied', false);
  exception when insufficient_privilege then insert into rls_results values ('anon workspace read denied', true); end;
  begin perform 1 from public.core_founders; insert into rls_results values ('anon membership read denied', false);
  exception when insufficient_privilege then insert into rls_results values ('anon membership read denied', true); end;
end $$;
reset role;

-- Another authenticated user, even with a live-looking session claim, sees and changes nothing.
select set_config('request.jwt.claims', pg_temp.claims(gen_random_uuid(), gen_random_uuid()), true);
set local role authenticated;
insert into rls_results select 'other user reads no workspace', count(*) = 0 from public.core_founder_workspaces;
insert into rls_results select 'other user reads no membership', count(*) = 0 from public.core_founders;
with changed as (update public.core_founder_workspaces set revision = revision + 1 returning 1)
insert into rls_results select 'other user updates nothing', count(*) = 0 from changed;
do $$ begin
  begin insert into public.core_founder_workspaces(user_id, data) values ((select auth.uid()), '{}'); insert into rls_results values ('insert denied', false);
  exception when insufficient_privilege then insert into rls_results values ('insert denied', true); end;
  begin delete from public.core_founder_workspaces; insert into rls_results values ('delete denied', false);
  exception when insufficient_privilege then insert into rls_results values ('delete denied', true); end;
end $$;
reset role;

-- The founder's identity with a revoked or forged session id (token replay after logout) is denied.
select set_config('request.jwt.claims', pg_temp.claims((select user_id from public.core_founders), gen_random_uuid()), true);
set local role authenticated;
insert into rls_results select 'founder replayed session reads nothing', count(*) = 0 from public.core_founder_workspaces;
with changed as (update public.core_founder_workspaces set revision = revision + 1 returning 1)
insert into rls_results select 'founder replayed session updates nothing', count(*) = 0 from changed;
reset role;

select check_name, passed from rls_results;
rollback;
