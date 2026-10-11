-- D4-03..D4-05 Desks, attendance, check-in, auto check-out, live presence.
-- Avatars are created here so the map can draw characters; the creator UI is Day 5.

create table public.desks (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  zone_name text not null check (zone_name ~ '^desk-[0-9]+$'),
  assigned_user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (branch_id, zone_name)
);
create index desks_assigned_user_id_idx on public.desks (assigned_user_id);

create table public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  branch_id uuid references public.branches (id) on delete set null,
  method public.checkin_method not null,
  checked_in_at timestamptz not null default now(),
  checked_out_at timestamptz,
  is_late boolean not null default false,
  auto_closed boolean not null default false,
  confirmed_at timestamptz,
  field_card_id uuid references public.cards (id) on delete set null,
  note text check (note is null or length(note) <= 300),
  verify jsonb not null default '{}',
  created_at timestamptz not null default now(),
  check (checked_out_at is null or checked_out_at >= checked_in_at)
);
-- One open session per user.
create unique index attendance_one_open_session on public.attendance_sessions (user_id) where checked_out_at is null;
create index attendance_sessions_user_idx on public.attendance_sessions (user_id, checked_in_at desc);
create index attendance_sessions_branch_open_idx on public.attendance_sessions (branch_id) where checked_out_at is null;
create index attendance_sessions_field_card_id_idx on public.attendance_sessions (field_card_id);

create table public.attendance_edits (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.attendance_sessions (id) on delete cascade,
  edited_by uuid references public.profiles (id) on delete set null,
  old_in timestamptz,
  new_in timestamptz,
  old_out timestamptz,
  new_out timestamptz,
  reason text not null check (length(reason) between 1 and 500),
  created_at timestamptz not null default now()
);
create index attendance_edits_session_id_idx on public.attendance_edits (session_id);
create index attendance_edits_edited_by_idx on public.attendance_edits (edited_by);

create table public.avatars (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  config jsonb not null,
  updated_at timestamptz not null default now()
);
create trigger avatars_updated_at before update on public.avatars
  for each row execute function public.set_updated_at();

create trigger audit_attendance_sessions after update or delete on public.attendance_sessions
  for each row execute function public.audit_row();
create trigger audit_attendance_edits after insert on public.attendance_edits
  for each row execute function public.audit_row();

-- ---------------------------------------------------------------------------
-- Reads
-- ---------------------------------------------------------------------------
-- Open sessions without lateness, for marketing users (the map).
create function public.who_is_in(p_branch_id uuid default null)
returns table (user_id uuid, branch_id uuid, method public.checkin_method, checked_in_at timestamptz, field_card_id uuid, note text)
language sql stable security definer set search_path = public as $$
  select s.user_id, s.branch_id, s.method, s.checked_in_at, s.field_card_id, s.note
  from attendance_sessions s
  join profiles p on p.id = s.user_id and p.status = 'active'
  where s.checked_out_at is null
    and public.is_marketing()
    and (p_branch_id is null or s.branch_id = p_branch_id);
$$;

-- The caller's own open session (any user, for the check-in page).
create function public.my_open_session()
returns table (id uuid, branch_id uuid, method public.checkin_method, checked_in_at timestamptz, is_late boolean)
language sql stable security definer set search_path = public as $$
  select id, branch_id, method, checked_in_at, is_late from attendance_sessions
  where user_id = auth.uid() and checked_out_at is null;
$$;

create function public._has_wfh_today(p_user_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from requests r join request_types t on t.id = r.type_id
    where r.requester_id = p_user_id and t.key = 'work_from_home' and r.status = 'approved'
      and public.cairo_today() between r.starts_on and coalesce(r.ends_on, r.starts_on)
  );
$$;

create function public.my_wfh_today() returns boolean
language sql stable security definer set search_path = public as $$
  select public._has_wfh_today(auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Check-in (service role only: the server verified Wi-Fi IP or QR token first)
-- ---------------------------------------------------------------------------
create function public.check_in(
  p_user_id uuid, p_method public.checkin_method, p_branch_id uuid, p_verify jsonb default '{}',
  p_card_id uuid default null, p_note text default null, p_now timestamptz default now()
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  b branches;
  sch schedules;
  open_branch text;
  local_ts timestamp := p_now at time zone 'Africa/Cairo';
  grace int := coalesce((select (value #>> '{}')::int from settings where key = 'lateness_grace_minutes'), 15);
  late boolean := false;
  new_id uuid;
begin
  if not exists (select 1 from profiles where id = p_user_id and status = 'active') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select coalesce(br.name_en, s.method::text) into open_branch
  from attendance_sessions s left join branches br on br.id = s.branch_id
  where s.user_id = p_user_id and s.checked_out_at is null;
  if open_branch is not null then
    raise exception 'already_checked_in:%', open_branch using errcode = 'P0001';
  end if;

  if p_method in ('wifi', 'qr') then
    select * into b from branches where id = p_branch_id and is_active;
    if b.id is null or not (p_method = any (b.checkin_methods)) then
      raise exception 'method_not_allowed' using errcode = 'P0001';
    end if;
  elsif p_method = 'home' then
    if not public._has_wfh_today(p_user_id) then
      raise exception 'no_wfh_today' using errcode = 'P0001';
    end if;
    p_branch_id := null;
  elsif p_method = 'field' then
    p_branch_id := null;
  end if;

  -- Late: on a scheduled workday, after start + grace (Cairo time).
  select * into sch from schedules where user_id = p_user_id;
  if sch.id is not null and extract(dow from local_ts)::int = any (sch.workdays) then
    late := local_ts::time > sch.start_time + make_interval(mins => grace);
  end if;

  insert into attendance_sessions (user_id, branch_id, method, checked_in_at, is_late, verify, field_card_id, note)
  values (p_user_id, p_branch_id, p_method, p_now, late, coalesce(p_verify, '{}'), p_card_id, nullif(trim(p_note), ''))
  returning id into new_id;
  return new_id;
end $$;

create function public.check_out() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_active_user() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update attendance_sessions set checked_out_at = now()
  where user_id = auth.uid() and checked_out_at is null;
  if not found then
    raise exception 'not_checked_in' using errcode = 'P0001';
  end if;
end $$;

create function public.confirm_auto_checkout(p_session_id uuid, p_actual_out timestamptz) returns void
language plpgsql security definer set search_path = public as $$
declare
  s attendance_sessions;
begin
  select * into s from attendance_sessions where id = p_session_id for update;
  if s.id is null or s.user_id <> auth.uid() or not s.auto_closed or s.confirmed_at is not null then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_actual_out < s.checked_in_at or p_actual_out > now() then
    raise exception 'invalid_time' using errcode = '22023';
  end if;
  insert into attendance_edits (session_id, edited_by, old_in, new_in, old_out, new_out, reason)
  values (s.id, auth.uid(), s.checked_in_at, s.checked_in_at, s.checked_out_at, p_actual_out, 'Confirmed after automatic check-out');
  update attendance_sessions set checked_out_at = p_actual_out, confirmed_at = now() where id = s.id;
end $$;

create function public.admin_edit_session(p_session_id uuid, p_new_in timestamptz, p_new_out timestamptz, p_reason text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  s attendance_sessions;
begin
  if not public.has_any_role('{super_admin,hr}') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'missing_fields:reason' using errcode = 'P0001';
  end if;
  select * into s from attendance_sessions where id = p_session_id for update;
  if s.id is null then
    raise exception 'not found' using errcode = 'P0002';
  end if;
  if p_new_out is not null and p_new_out < p_new_in then
    raise exception 'invalid_time' using errcode = '22023';
  end if;
  insert into attendance_edits (session_id, edited_by, old_in, new_in, old_out, new_out, reason)
  values (s.id, auth.uid(), s.checked_in_at, p_new_in, s.checked_out_at, p_new_out, trim(p_reason));
  update attendance_sessions set checked_in_at = p_new_in, checked_out_at = p_new_out, confirmed_at = coalesce(confirmed_at, now())
  where id = s.id;
end $$;

-- From 23:00 Cairo, close open sessions from that day or earlier at
-- greatest(scheduled end, checked_in_at); earlier days close at any hour.
create function public.cron_auto_checkout(p_now timestamptz default now()) returns int
language plpgsql security definer set search_path = public as $$
declare
  local_now timestamp := p_now at time zone 'Africa/Cairo';
  r record;
  close_at timestamptz;
  n int := 0;
begin
  for r in
    select s.id, s.user_id, s.checked_in_at, coalesce(sch.end_time, '18:00'::time) as end_time
    from attendance_sessions s
    left join schedules sch on sch.user_id = s.user_id
    where s.checked_out_at is null
      and (
        (s.checked_in_at at time zone 'Africa/Cairo')::date < local_now::date
        or (extract(hour from local_now) >= 23 and (s.checked_in_at at time zone 'Africa/Cairo')::date <= local_now::date)
      )
    for update of s skip locked
  loop
    close_at := greatest(
      (((r.checked_in_at at time zone 'Africa/Cairo')::date + r.end_time) at time zone 'Africa/Cairo'),
      r.checked_in_at
    );
    update attendance_sessions set checked_out_at = close_at, auto_closed = true where id = r.id;
    perform public.notify(r.user_id, 'auto_checkout', '/checkin', jsonb_build_object('session_id', r.id));
    n := n + 1;
  end loop;
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- Live presence: database triggers send events on private branch channels.
-- ---------------------------------------------------------------------------
create function public._branch_topic(p_branch_id uuid, p_method public.checkin_method) returns text
language sql immutable set search_path = public as $$
  select 'branch:' || case
    when p_branch_id is not null then p_branch_id::text
    when p_method = 'home' then 'home'
    else 'field' end;
$$;

create function public.broadcast_attendance() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform realtime.send(
      jsonb_build_object('user_id', new.user_id, 'branch_id', new.branch_id, 'method', new.method, 'checked_in_at', new.checked_in_at),
      'checkin', public._branch_topic(new.branch_id, new.method), true);
  elsif new.checked_out_at is not null and old.checked_out_at is null then
    perform realtime.send(
      jsonb_build_object('user_id', new.user_id, 'branch_id', new.branch_id, 'method', new.method),
      'checkout', public._branch_topic(new.branch_id, new.method), true);
  end if;
  return new;
end $$;

create trigger attendance_broadcast after insert or update of checked_out_at on public.attendance_sessions
  for each row execute function public.broadcast_attendance();

create function public.broadcast_presence() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  s attendance_sessions;
  topic text;
begin
  select * into s from attendance_sessions where user_id = new.id and checked_out_at is null;
  topic := case when s.id is not null then public._branch_topic(s.branch_id, s.method)
    when new.home_branch_id is not null then 'branch:' || new.home_branch_id
    else null end;
  if topic is not null then
    perform realtime.send(jsonb_build_object('user_id', new.id, 'presence', new.presence), 'status', topic, true);
  end if;
  return new;
end $$;

create trigger profiles_presence_broadcast after update of presence on public.profiles
  for each row when (old.presence is distinct from new.presence)
  execute function public.broadcast_presence();

create function public.broadcast_avatar() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  s attendance_sessions;
begin
  select * into s from attendance_sessions where user_id = new.user_id and checked_out_at is null;
  if s.id is not null then
    perform realtime.send(jsonb_build_object('user_id', new.user_id), 'avatar', public._branch_topic(s.branch_id, s.method), true);
  end if;
  return new;
end $$;

create trigger avatars_broadcast after insert or update on public.avatars
  for each row execute function public.broadcast_avatar();

-- Private branch channels: marketing users only, topics starting with branch:.
create policy branch_channels_receive on realtime.messages for select to authenticated
  using (realtime.topic() like 'branch:%' and (select public.is_marketing()));
create policy branch_channels_presence on realtime.messages for insert to authenticated
  with check (realtime.topic() like 'branch:%' and (select public.is_marketing()) and extension = 'presence');

-- ---------------------------------------------------------------------------
-- Privileges and policies
-- ---------------------------------------------------------------------------
revoke insert, update, delete on public.attendance_sessions, public.attendance_edits from authenticated;

alter table public.desks enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_edits enable row level security;
alter table public.avatars enable row level security;

create policy desks_select on public.desks for select to authenticated using ((select public.is_marketing()));
create policy desks_write on public.desks for all to authenticated
  using ((select public.has_any_role('{super_admin,traffic_manager}')))
  with check ((select public.has_any_role('{super_admin,traffic_manager}')));

create policy attendance_sessions_select on public.attendance_sessions for select to authenticated
  using ((select public.is_active_user()) and (
    user_id = (select auth.uid()) or public.is_team_lead_of(user_id)
    or (select public.has_any_role('{hr,super_admin,leadership}'))));
create policy attendance_edits_select on public.attendance_edits for select to authenticated
  using (exists (select 1 from attendance_sessions s where s.id = session_id and (
    s.user_id = (select auth.uid()) or public.is_team_lead_of(s.user_id)
    or (select public.has_any_role('{hr,super_admin,leadership}')))));

create policy avatars_select on public.avatars for select to authenticated using ((select public.is_active_user()));
create policy avatars_insert on public.avatars for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_active_user()));
create policy avatars_update on public.avatars for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant execute on function public.who_is_in(uuid), public.my_open_session(), public.my_wfh_today(),
  public.check_out(), public.confirm_auto_checkout(uuid, timestamptz),
  public.admin_edit_session(uuid, timestamptz, timestamptz, text)
  to authenticated;
revoke execute on function public.check_in(uuid, public.checkin_method, uuid, jsonb, uuid, text, timestamptz),
  public.cron_auto_checkout(timestamptz), public._branch_topic(uuid, public.checkin_method),
  public._has_wfh_today(uuid)
  from authenticated;
grant execute on function public.check_in(uuid, public.checkin_method, uuid, jsonb, uuid, text, timestamptz),
  public.cron_auto_checkout(timestamptz) to service_role;

revoke execute on all functions in schema public from public, anon;
