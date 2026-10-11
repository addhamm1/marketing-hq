-- D1-04 Core schema: organisation, people, roles, schedules, settings, audit.
-- Access model: DATA_MODEL.md sections 0, 2, 3, 8, 9, 10.

-- New objects in public get no automatic grants to anon, and functions are not
-- executable by public or anon unless a migration grants them explicitly.
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon;

-- ---------------------------------------------------------------------------
-- Enums (all of them, so later migrations only add tables)
-- ---------------------------------------------------------------------------
create type public.app_role as enum (
  'super_admin', 'leadership', 'team_lead', 'traffic_manager', 'member',
  'requester', 'final_approver', 'hr', 'guest'
);
create type public.profile_status as enum ('active', 'inactive');
create type public.presence_status as enum ('available', 'focus', 'meeting', 'shoot', 'break', 'away');
create type public.checkin_method as enum ('wifi', 'qr', 'field', 'home', 'manual');
create type public.card_stage as enum (
  'request', 'performance_input', 'intake', 'brief_schedule', 'production',
  'creative_review', 'confirmation', 'ready_to_publish', 'published', 'reported'
);
create type public.card_request_kind as enum ('strategic', 'urgent', 'internal');
create type public.card_priority as enum ('low', 'normal', 'high', 'urgent');
create type public.assignee_role as enum ('design', 'copy', 'video', 'media_buying', 'other');
create type public.revision_reason as enum ('brief_changed', 'quality', 'new_information', 'other');
create type public.request_status as enum ('pending', 'approved', 'rejected', 'cancelled');
create type public.step_status as enum ('waiting', 'active', 'approved', 'rejected', 'changes_requested', 'skipped');
create type public.post_status as enum ('draft', 'in_review', 'approved', 'scheduled', 'published');
create type public.content_pillar as enum ('awareness', 'engagement', 'insights', 'offer', 'community');

-- ---------------------------------------------------------------------------
-- Shared trigger: updated_at
-- ---------------------------------------------------------------------------
create function public.set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Organisation
-- ---------------------------------------------------------------------------
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_ar text not null,
  slug text not null unique,
  is_marketing boolean not null default false,
  default_approver_id uuid,
  created_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments (id) on delete restrict,
  name_en text not null,
  name_ar text not null,
  slug text not null unique,
  color text not null default '#64748B',
  created_at timestamptz not null default now()
);
create index teams_department_id_idx on public.teams (department_id);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_ar text not null,
  slug text not null unique,
  area text not null default '',
  map_key text not null default 'hq',
  public_ips cidr[] not null default '{}',
  checkin_methods public.checkin_method[] not null default '{wifi,qr}', -- DECISION: D-03
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Secrets live apart from branches. Clients have no access at all: the server
-- reads them with the admin client and admins change them through functions.
create table public.branch_secrets (
  branch_id uuid primary key references public.branches (id) on delete cascade,
  hmac_secret text not null default encode(extensions.gen_random_bytes(32), 'hex'),
  kiosk_key_hash text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  display_name text,
  phone text,
  department_id uuid references public.departments (id) on delete set null,
  team_id uuid references public.teams (id) on delete set null,
  home_branch_id uuid references public.branches (id) on delete set null,
  title text,
  locale text not null default 'en' check (locale in ('en', 'ar')),
  status public.profile_status not null default 'active',
  must_change_password boolean not null default true,
  presence public.presence_status not null default 'available',
  presence_updated_at timestamptz not null default now(),
  avatar_seen boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_department_id_idx on public.profiles (department_id);
create index profiles_team_id_idx on public.profiles (team_id);
create index profiles_home_branch_id_idx on public.profiles (home_branch_id);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.departments
  add constraint departments_default_approver_fk
  foreign key (default_approver_id) references public.profiles (id) on delete set null;
create index departments_default_approver_id_idx on public.departments (default_approver_id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null,
  team_id uuid references public.teams (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_roles_unique unique nulls not distinct (user_id, role, team_id),
  constraint user_roles_team_lead_needs_team check (role <> 'team_lead' or team_id is not null)
);
create index user_roles_user_id_idx on public.user_roles (user_id);
create index user_roles_team_id_idx on public.user_roles (team_id);
create index user_roles_role_idx on public.user_roles (role);

-- DECISION: D-14 (Saturday to Thursday, 10:00 to 18:00)
create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  workdays int[] not null default '{6,0,1,2,3,4}',
  start_time time not null default '10:00',
  end_time time not null default '18:00',
  timezone text not null default 'Africa/Cairo',
  updated_at timestamptz not null default now()
);
create trigger schedules_updated_at before update on public.schedules
  for each row execute function public.set_updated_at();

create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
create trigger settings_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  table_name text not null,
  row_id text,
  action text not null check (action in ('insert', 'update', 'delete')),
  old_data jsonb,
  new_data jsonb,
  at timestamptz not null default now()
);
create index audit_log_table_row_idx on public.audit_log (table_name, row_id);
create index audit_log_at_idx on public.audit_log (at desc);

-- ---------------------------------------------------------------------------
-- Read helpers (security definer, stable). Used inside policies.
-- ---------------------------------------------------------------------------
create function public.is_active_user() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and status = 'active'
  );
$$;

create function public.has_role(r public.app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from user_roles ur
    join profiles p on p.id = ur.user_id
    where ur.user_id = auth.uid() and ur.role = r and p.status = 'active'
  );
$$;

create function public.has_any_role(rs public.app_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from user_roles ur
    join profiles p on p.id = ur.user_id
    where ur.user_id = auth.uid() and ur.role = any (rs) and p.status = 'active'
  );
$$;

-- Marketing user: active, holds at least one role, and is in a marketing
-- department or is super_admin or leadership (DATA_MODEL.md section 2).
create function public.is_marketing() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from profiles p
    left join departments d on d.id = p.department_id
    where p.id = auth.uid()
      and p.status = 'active'
      and exists (select 1 from user_roles ur where ur.user_id = p.id)
      and (
        coalesce(d.is_marketing, false)
        or exists (
          select 1 from user_roles ur
          where ur.user_id = p.id and ur.role in ('super_admin', 'leadership')
        )
      )
  );
$$;

create function public.in_team(slug text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from profiles p
    join teams t on t.id = p.team_id
    where p.id = auth.uid() and p.status = 'active' and t.slug = in_team.slug
  );
$$;

create function public.is_team_lead_of(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select target is distinct from auth.uid() and exists (
    select 1
    from user_roles ur
    join profiles me on me.id = ur.user_id and me.status = 'active'
    join profiles p on p.id = target
    where ur.user_id = auth.uid()
      and ur.role = 'team_lead'
      and p.team_id is not null
      and ur.team_id = p.team_id
  );
$$;

-- Team app user: active marketing user, or hr, leadership or super_admin.
-- Guests (freelancers) also use the team app, limited to boards they belong to.
create function public.is_team_app_user() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_marketing() or public.has_any_role('{hr,leadership,super_admin,guest}');
$$;

-- Portal user: active requester or final approver.
create function public.is_portal_user() returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_any_role('{requester,final_approver}');
$$;

-- Narrow directory for requesters and guests.
create function public.public_profiles()
returns table (id uuid, display_name text, title text, team_id uuid, department_id uuid)
language sql stable security definer set search_path = public as $$
  select p.id, coalesce(nullif(p.display_name, ''), p.full_name), p.title, p.team_id, p.department_id
  from profiles p
  where p.status = 'active' and public.is_active_user();
$$;


-- Everything the app shell and route guards need about the caller, in one call.
create function public.my_access() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'user_id', p.id,
    'email', p.email,
    'full_name', p.full_name,
    'display_name', coalesce(nullif(p.display_name, ''), p.full_name),
    'status', p.status,
    'must_change_password', p.must_change_password,
    'locale', p.locale,
    'presence', p.presence,
    'avatar_seen', p.avatar_seen,
    'department_id', p.department_id,
    'team_id', p.team_id,
    'team_slug', (select slug from teams where id = p.team_id),
    'home_branch_id', p.home_branch_id,
    'roles', coalesce((
      select jsonb_agg(jsonb_build_object('role', ur.role, 'team_id', ur.team_id, 'team_slug', t.slug))
      from user_roles ur left join teams t on t.id = ur.team_id where ur.user_id = p.id
    ), '[]'::jsonb),
    'is_marketing', public.is_marketing(),
    'is_team_app', public.is_team_app_user(),
    'is_portal', public.is_portal_user()
  )
  from profiles p
  where p.id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Admin actions
-- ---------------------------------------------------------------------------
create function public.admin_update_profile(p_user_id uuid, patch jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  is_admin boolean := public.has_role('super_admin');
  is_hr boolean := public.has_role('hr');
  profile_keys text[] := array['full_name', 'display_name', 'phone', 'department_id', 'team_id',
    'home_branch_id', 'title', 'locale', 'status', 'must_change_password'];
  schedule_keys text[] := array['workdays', 'start_time', 'end_time'];
  k text;
begin
  if not (is_admin or is_hr) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from profiles where id = p_user_id) then
    raise exception 'user not found' using errcode = 'P0002';
  end if;

  for k in select jsonb_object_keys(patch) loop
    if not (k = any (profile_keys) or k = any (schedule_keys)) then
      raise exception 'unknown field %', k using errcode = '22023';
    end if;
    if k = any (profile_keys) and not is_admin then
      raise exception 'not allowed to change %', k using errcode = '42501';
    end if;
  end loop;

  if p_user_id = auth.uid() and patch ? 'status' and patch ->> 'status' <> 'active' then
    raise exception 'you cannot deactivate yourself' using errcode = '42501';
  end if;

  update profiles set
    full_name = case when patch ? 'full_name' then coalesce(patch ->> 'full_name', '') else full_name end,
    display_name = case when patch ? 'display_name' then patch ->> 'display_name' else display_name end,
    phone = case when patch ? 'phone' then patch ->> 'phone' else phone end,
    department_id = case when patch ? 'department_id' then (patch ->> 'department_id')::uuid else department_id end,
    team_id = case when patch ? 'team_id' then (patch ->> 'team_id')::uuid else team_id end,
    home_branch_id = case when patch ? 'home_branch_id' then (patch ->> 'home_branch_id')::uuid else home_branch_id end,
    title = case when patch ? 'title' then patch ->> 'title' else title end,
    locale = case when patch ? 'locale' then patch ->> 'locale' else locale end,
    status = case when patch ? 'status' then (patch ->> 'status')::profile_status else status end,
    must_change_password = case when patch ? 'must_change_password'
      then (patch ->> 'must_change_password')::boolean else must_change_password end
  where id = p_user_id;

  if patch ?| schedule_keys then
    insert into schedules (user_id) values (p_user_id) on conflict (user_id) do nothing;
    update schedules set
      workdays = case when patch ? 'workdays'
        then array(select jsonb_array_elements_text(patch -> 'workdays')::int) else workdays end,
      start_time = case when patch ? 'start_time' then (patch ->> 'start_time')::time else start_time end,
      end_time = case when patch ? 'end_time' then (patch ->> 'end_time')::time else end_time end
    where user_id = p_user_id;
  end if;
end $$;

-- roles: [{ "role": "team_lead", "team_id": "<uuid>" }, { "role": "member" }]
create function public.admin_set_roles(p_user_id uuid, roles jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  item jsonb;
begin
  if not public.has_role('super_admin') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if jsonb_typeof(roles) <> 'array' then
    raise exception 'roles must be an array' using errcode = '22023';
  end if;
  if p_user_id = auth.uid() and not exists (
    select 1 from jsonb_array_elements(roles) r where r ->> 'role' = 'super_admin'
  ) then
    raise exception 'you cannot remove your own super_admin role' using errcode = '42501';
  end if;

  delete from user_roles where user_id = p_user_id;
  for item in select * from jsonb_array_elements(roles) loop
    insert into user_roles (user_id, role, team_id)
    values (p_user_id, (item ->> 'role')::app_role, nullif(item ->> 'team_id', '')::uuid)
    on conflict do nothing;
  end loop;
end $$;

create function public.require_password_change(p_user_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role('super_admin') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update profiles set must_change_password = true where id = p_user_id;
end $$;

-- Branch secrets: rotate the QR secret, store a kiosk key hash (the key itself
-- is generated by the server and shown once).
create function public.admin_rotate_qr_secret(p_branch_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role('super_admin') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  insert into branch_secrets (branch_id) values (p_branch_id)
  on conflict (branch_id) do update
    set hmac_secret = encode(extensions.gen_random_bytes(32), 'hex'), updated_at = now();
end $$;

create function public.admin_set_kiosk_key_hash(p_branch_id uuid, p_hash text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role('super_admin') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid hash' using errcode = '22023';
  end if;
  insert into branch_secrets (branch_id, kiosk_key_hash) values (p_branch_id, p_hash)
  on conflict (branch_id) do update set kiosk_key_hash = excluded.kiosk_key_hash, updated_at = now();
end $$;

-- Sign a user out everywhere (password reset, deactivation). Server only.
create function public.admin_revoke_sessions(p_user_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from auth.sessions where user_id = p_user_id;
end $$;

-- ---------------------------------------------------------------------------
-- auth.users triggers: create the profile and schedule, keep email in sync.
-- Accounts are created only by admins (public sign-up is disabled).
-- ---------------------------------------------------------------------------
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, locale)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when new.raw_user_meta_data ->> 'locale' = 'ar' then 'ar' else 'en' end
  )
  on conflict (id) do nothing;
  insert into public.schedules (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.handle_user_email_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end $$;

create trigger on_auth_user_email_changed after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------------
-- Generic audit trigger. Secret columns are never copied.
-- ---------------------------------------------------------------------------
create function public.audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  old_j jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  new_j jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  rid text;
begin
  old_j := old_j - 'hmac_secret' - 'kiosk_key_hash';
  new_j := new_j - 'hmac_secret' - 'kiosk_key_hash';
  rid := coalesce(new_j ->> 'id', old_j ->> 'id', new_j ->> 'branch_id', old_j ->> 'branch_id');
  insert into audit_log (actor_id, table_name, row_id, action, old_data, new_data)
  values (auth.uid(), tg_table_name, rid, lower(tg_op), old_j, new_j);
  return coalesce(new, old);
end $$;

create trigger audit_user_roles after insert or update or delete on public.user_roles
  for each row execute function public.audit_row();
create trigger audit_profiles after update of status, department_id, team_id on public.profiles
  for each row
  when (old.status is distinct from new.status
     or old.department_id is distinct from new.department_id
     or old.team_id is distinct from new.team_id)
  execute function public.audit_row();
create trigger audit_branch_secrets after insert or update or delete on public.branch_secrets
  for each row execute function public.audit_row();

-- ---------------------------------------------------------------------------
-- Privileges. Supabase grants everything on new tables to anon and
-- authenticated by default, so lock down first and grant back narrowly.
-- ---------------------------------------------------------------------------
revoke all on public.departments, public.teams, public.branches, public.branch_secrets,
  public.profiles, public.user_roles, public.schedules, public.settings, public.audit_log
  from anon;

revoke all on public.branch_secrets from authenticated;
revoke insert, update, delete on public.audit_log from authenticated;
revoke insert, update, delete on public.user_roles from authenticated;
revoke insert, delete on public.profiles from authenticated;
revoke update on public.profiles from authenticated;
grant update (display_name, phone, locale, presence, presence_updated_at, avatar_seen)
  on public.profiles to authenticated;

-- Functions: explicit execute grants.
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.is_active_user(), public.has_role(public.app_role), public.has_any_role(public.app_role[]),
  public.is_marketing(), public.in_team(text), public.is_team_lead_of(uuid),
  public.is_team_app_user(), public.is_portal_user(), public.public_profiles(), public.my_access(),
  public.admin_update_profile(uuid, jsonb), public.admin_set_roles(uuid, jsonb),
  public.require_password_change(uuid), public.admin_rotate_qr_secret(uuid),
  public.admin_set_kiosk_key_hash(uuid, text)
  to authenticated;
revoke execute on function public.handle_new_user(), public.handle_user_email_change(),
  public.audit_row(), public.set_updated_at() from authenticated;
revoke execute on function public.admin_revoke_sessions(uuid) from authenticated;
grant execute on function public.admin_revoke_sessions(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.departments enable row level security;
alter table public.teams enable row level security;
alter table public.branches enable row level security;
alter table public.branch_secrets enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.schedules enable row level security;
alter table public.settings enable row level security;
alter table public.audit_log enable row level security;

-- departments, teams, branches: read by all active users, written by super_admin.
create policy departments_select on public.departments for select to authenticated
  using ((select public.is_active_user()));
create policy departments_write on public.departments for all to authenticated
  using ((select public.has_role('super_admin'))) with check ((select public.has_role('super_admin')));

create policy teams_select on public.teams for select to authenticated
  using ((select public.is_active_user()));
create policy teams_write on public.teams for all to authenticated
  using ((select public.has_role('super_admin'))) with check ((select public.has_role('super_admin')));

create policy branches_select on public.branches for select to authenticated
  using ((select public.is_active_user()));
create policy branches_write on public.branches for all to authenticated
  using ((select public.has_role('super_admin'))) with check ((select public.has_role('super_admin')));

-- branch_secrets: no policies on purpose (no client access).

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or (
      (select public.is_active_user())
      and ((select public.is_marketing()) or (select public.has_any_role('{hr,super_admin,leadership}')))
    )
  );
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid()) and (select public.is_active_user()))
  with check (id = (select auth.uid()));

-- user_roles
create policy user_roles_select on public.user_roles for select to authenticated
  using (
    (select public.is_active_user())
    and (user_id = (select auth.uid()) or (select public.is_marketing()) or (select public.has_role('hr')))
  );

-- schedules
create policy schedules_select on public.schedules for select to authenticated
  using (
    (select public.is_active_user())
    and (
      user_id = (select auth.uid())
      or public.is_team_lead_of(user_id)
      or (select public.has_any_role('{hr,super_admin}'))
    )
  );
create policy schedules_update on public.schedules for update to authenticated
  using ((select public.has_any_role('{hr,super_admin}')))
  with check ((select public.has_any_role('{hr,super_admin}')));

-- settings
create policy settings_select on public.settings for select to authenticated
  using ((select public.is_active_user()));
create policy settings_update on public.settings for update to authenticated
  using ((select public.has_role('super_admin'))
    or ((select public.has_role('hr')) and key = 'lateness_grace_minutes'))
  with check ((select public.has_role('super_admin'))
    or ((select public.has_role('hr')) and key = 'lateness_grace_minutes'));
create policy settings_insert on public.settings for insert to authenticated
  with check ((select public.has_role('super_admin')));
create policy settings_delete on public.settings for delete to authenticated
  using ((select public.has_role('super_admin')));

-- audit_log
create policy audit_log_select on public.audit_log for select to authenticated
  using ((select public.has_role('super_admin')));
