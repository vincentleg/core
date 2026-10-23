-- CORE backend schema (V7) — READINESS ONLY: not deployed, no project, no keys, no accounts exist.
-- Target: PostgreSQL 15+ with Supabase Auth conventions (auth.uid(), roles `anon` and `authenticated`); portable to any
-- PostgreSQL with an equivalent identity function. Verified locally by scripts/backend-rls-check.mjs (PGlite).
--
-- Principles:
--   • deny by default — RLS enabled AND forced on every table; no policy = no access;
--   • ownership — private rows are visible and writable by their owner only;
--   • end-to-end privacy of ideas — the server stores the Idea Vault CIPHERTEXT only (AES-GCM, sealed in the browser by
--     src/civic/vault.mjs); there is no plaintext column, so a database leak or an operator cannot read ideas;
--   • role separation — roles are granted only by the governance function, never by the user; reviewers cannot approve
--     their own work; decisions are append-only;
--   • data minimisation — no real name, no e-mail (that lives in the auth provider), no location history;
--   • auditability — an append-only audit log written only through SECURITY DEFINER functions.

create schema if not exists core;

-- ---------- identity ----------
create table core.profiles (
  id uuid primary key,                                   -- = auth.uid(); one profile per account
  pseudonym text not null check (char_length(pseudonym) between 3 and 24 and pseudonym !~ '[<>@]'),
  avatar jsonb not null default '{}'::jsonb check (pg_column_size(avatar) < 4096), -- appearance only (avatar-config.mjs)
  age_band text not null default 'adult' check (age_band in ('adult')), -- minors: not admitted until safeguards exist (FD)
  public_fields text[] not null default '{}',            -- what the person chose to show; default nothing
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------- private ideas: ciphertext only ----------
create table core.idea_boxes (
  owner uuid primary key references core.profiles(id) on delete cascade,
  box jsonb not null check (box ? 'ct' and box ? 'iv' and box ? 'salt' and not (box ? 'plaintext')),
  kdf_iterations int not null check (kdf_iterations >= 210000),
  updated_at timestamptz not null default now()
);

-- ---------- saved problems ----------
create table core.follows (
  owner uuid not null references core.profiles(id) on delete cascade,
  problem_id text not null check (char_length(problem_id) <= 120),
  created_at timestamptz not null default now(),
  primary key (owner, problem_id)
);

-- ---------- knowledge contributions: quarantined candidates ----------
create table core.contributions (
  id uuid primary key default gen_random_uuid(),
  author uuid not null references core.profiles(id) on delete cascade,
  claim text not null check (char_length(claim) between 10 and 2000),
  source_url text check (source_url ~ '^https://'),
  state text not null default 'quarantine' check (state in ('quarantine', 'in-review', 'accepted', 'rejected', 'withdrawn')),
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  created_at timestamptz not null default now()
);

-- ---------- roles and review (human, separated, append-only) ----------
create table core.roles (
  account uuid not null references core.profiles(id) on delete cascade,
  role text not null check (role in ('reviewer', 'moderator', 'governance')),
  granted_by uuid references core.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  conflicts text not null default '',                    -- declared conflicts of interest, shown with every decision
  primary key (account, role)
);
create table core.review_decisions (
  id uuid primary key default gen_random_uuid(),
  contribution uuid not null references core.contributions(id) on delete cascade,
  reviewer uuid references core.profiles(id) on delete set null,
  decision text not null check (decision in ('accept', 'reject', 'request-evidence')),
  reasons text not null check (char_length(reasons) >= 20),
  at timestamptz not null default now()
);

-- ---------- audit log (append-only) ----------
create table core.audit_log (
  id bigint generated always as identity primary key,
  actor uuid, action text not null, target text, at timestamptz not null default now()
);

-- ---------- row level security: enabled and forced everywhere ----------
alter table core.profiles enable row level security;          alter table core.profiles force row level security;
alter table core.idea_boxes enable row level security;        alter table core.idea_boxes force row level security;
alter table core.follows enable row level security;           alter table core.follows force row level security;
alter table core.contributions enable row level security;     alter table core.contributions force row level security;
alter table core.roles enable row level security;             alter table core.roles force row level security;
alter table core.review_decisions enable row level security;  alter table core.review_decisions force row level security;
alter table core.audit_log enable row level security;         alter table core.audit_log force row level security;

-- Profiles: owner reads/writes own row; others see nothing (public profile views are a later, explicit feature).
create policy profiles_owner_select on core.profiles for select to authenticated using (id = auth.uid());
create policy profiles_owner_insert on core.profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_owner_update on core.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- (no delete policy: deletion goes through core.delete_account(), which also writes the audit log)

-- Idea boxes: strictly the owner's ciphertext.
create policy boxes_owner_all on core.idea_boxes for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

-- Follows: owner only.
create policy follows_owner_all on core.follows for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

-- Contributions: authors manage their own candidates while in quarantine; public + accepted rows are readable by all.
create policy contrib_select on core.contributions for select to authenticated, anon using (author = auth.uid() or (visibility = 'public' and state = 'accepted'));
create policy contrib_insert on core.contributions for insert to authenticated with check (author = auth.uid() and state = 'quarantine');
create policy contrib_update_own on core.contributions for update to authenticated using (author = auth.uid() and state = 'quarantine') with check (author = auth.uid() and state in ('quarantine', 'withdrawn'));

-- Roles: a person may see their own roles; nobody writes roles directly (core.grant_role only).
create policy roles_self_select on core.roles for select to authenticated using (account = auth.uid());

-- Review decisions: readable by the contribution's author and by reviewers; written only by core.record_decision().
create policy decisions_select on core.review_decisions for select to authenticated using (
  reviewer = auth.uid() or exists (select 1 from core.contributions c where c.id = contribution and c.author = auth.uid()));

-- Audit log: no direct access for anyone (read by governance through a reviewed function, later).

-- ---------- privileged operations (SECURITY DEFINER, minimal, audited) ----------
create function core.record_decision(p_contribution uuid, p_decision text, p_reasons text) returns uuid
language plpgsql security definer set search_path = core, pg_temp as $$
declare v_author uuid; v_id uuid;
begin
  if not exists (select 1 from core.roles where account = auth.uid() and role = 'reviewer') then raise exception 'not a reviewer'; end if;
  select author into v_author from core.contributions where id = p_contribution;
  if v_author is null then raise exception 'unknown contribution'; end if;
  if v_author = auth.uid() then raise exception 'reviewers cannot decide on their own contribution'; end if;
  insert into core.review_decisions (contribution, reviewer, decision, reasons) values (p_contribution, auth.uid(), p_decision, p_reasons) returning id into v_id;
  update core.contributions set state = case p_decision when 'accept' then 'accepted' when 'reject' then 'rejected' else 'in-review' end where id = p_contribution;
  insert into core.audit_log (actor, action, target) values (auth.uid(), 'review.' || p_decision, p_contribution::text);
  return v_id;
end $$;

create function core.grant_role(p_account uuid, p_role text, p_conflicts text) returns void
language plpgsql security definer set search_path = core, pg_temp as $$
begin
  if not exists (select 1 from core.roles where account = auth.uid() and role = 'governance') then raise exception 'governance role required'; end if;
  if p_account = auth.uid() then raise exception 'no self-grant'; end if;
  insert into core.roles (account, role, granted_by, conflicts) values (p_account, p_role, auth.uid(), coalesce(p_conflicts, ''));
  insert into core.audit_log (actor, action, target) values (auth.uid(), 'role.grant.' || p_role, p_account::text);
end $$;

create function core.delete_account() returns void
language plpgsql security definer set search_path = core, pg_temp as $$
begin
  insert into core.audit_log (actor, action, target) values (null, 'account.delete', null); -- no identifier kept after deletion
  delete from core.profiles where id = auth.uid();         -- cascades to boxes, follows, contributions, roles
end $$;

-- Data export: everything the person owns, as one JSON document (ciphertext stays ciphertext).
create function core.export_my_data() returns jsonb
language sql security invoker set search_path = core, pg_temp as $$
  select jsonb_build_object(
    'profile', (select to_jsonb(p) from core.profiles p where p.id = auth.uid()),
    'idea_box', (select to_jsonb(b) from core.idea_boxes b where b.owner = auth.uid()),
    'follows', coalesce((select jsonb_agg(f) from core.follows f where f.owner = auth.uid()), '[]'::jsonb),
    'contributions', coalesce((select jsonb_agg(c) from core.contributions c where c.author = auth.uid()), '[]'::jsonb))
$$;

revoke all on all tables in schema core from public, anon, authenticated;
grant usage on schema core to anon, authenticated;
grant select, insert, update on core.profiles, core.contributions to authenticated;
grant select, insert, update, delete on core.idea_boxes, core.follows to authenticated;
grant select on core.roles, core.review_decisions to authenticated;
grant select on core.contributions to anon;
revoke all on function core.record_decision(uuid, text, text), core.grant_role(uuid, text, text), core.delete_account() from public;
grant execute on function core.record_decision(uuid, text, text), core.grant_role(uuid, text, text), core.delete_account(), core.export_my_data() to authenticated;
