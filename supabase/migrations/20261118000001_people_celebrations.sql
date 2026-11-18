-- W-01 People details, kudos, birthdays and work anniversaries, seasonal outfits.
-- * Birthdays are stored as month and day only: the year is never collected.
-- * cron_log gives every scheduled reminder a once-only key.

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
-- Staff: an active employee of any department. Freelance guests are not staff.
create function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_any_role('{super_admin,leadership,team_lead,traffic_manager,member,requester,final_approver,hr}');
$$;

-- The Cairo date of a given moment (cairo_today() with no argument is today).
create function public.cairo_today(p_now timestamptz) returns date
language sql stable set search_path = public as $$
  select (p_now at time zone 'Africa/Cairo')::date;
$$;

-- Working day: not a Friday and not a full-day holiday.
create function public._is_workday(p_day date) returns boolean
language sql stable security definer set search_path = public as $$
  select extract(dow from p_day)::int <> 5
    and not exists (select 1 from holidays h where h.day = p_day and not h.is_half_day);
$$;

-- The day itself, or the closest working day before it.
create function public._roll_back_workday(p_day date) returns date
language plpgsql stable security definer set search_path = public as $$
declare
  d date := p_day;
begin
  while not public._is_workday(d) loop
    d := d - 1;
  end loop;
  return d;
end $$;

-- Once-only keys for scheduled jobs: true the first time a key is claimed.
create table public.cron_log (
  key text primary key,
  at timestamptz not null default now()
);
alter table public.cron_log enable row level security;
revoke all on public.cron_log from anon, authenticated;

create function public._once(p_key text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  insert into cron_log (key) values (p_key) on conflict (key) do nothing;
  get diagnostics n = row_count;
  return n > 0;
end $$;

-- ---------------------------------------------------------------------------
-- Profile details
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column birth_month smallint,
  add column birth_day smallint,
  add column joined_on date,
  add column celebrate boolean not null default true,
  add constraint profiles_birthday_pair check ((birth_month is null) = (birth_day is null)),
  add constraint profiles_birthday_valid check (
    birth_month is null or (
      birth_month between 1 and 12
      and birth_day between 1 and (array[31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31])[birth_month]
    ));

grant update (birth_month, birth_day, celebrate) on public.profiles to authenticated;

create or replace function public.admin_update_profile(p_user_id uuid, patch jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  is_admin boolean := public.has_role('super_admin');
  is_hr boolean := public.has_role('hr');
  profile_keys text[] := array['full_name', 'display_name', 'phone', 'department_id', 'team_id',
    'home_branch_id', 'title', 'locale', 'status', 'must_change_password'];
  people_keys text[] := array['birth_month', 'birth_day', 'joined_on'];
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
    if not (k = any (profile_keys) or k = any (schedule_keys) or k = any (people_keys)) then
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
      then (patch ->> 'must_change_password')::boolean else must_change_password end,
    birth_month = case when patch ? 'birth_month' then (patch ->> 'birth_month')::smallint else birth_month end,
    birth_day = case when patch ? 'birth_day' then (patch ->> 'birth_day')::smallint else birth_day end,
    joined_on = case when patch ? 'joined_on' then (patch ->> 'joined_on')::date else joined_on end
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

-- ---------------------------------------------------------------------------
-- Celebrations: birthdays (29 Feb falls on 28 Feb in other years) and anniversaries
-- ---------------------------------------------------------------------------
create function public.upcoming_celebrations(p_from date default null, p_days int default 14)
returns table (user_id uuid, display_name text, kind text, day date, years int)
language sql stable security definer set search_path = public as $$
  with days as (
    select d::date as day
    from generate_series(
      coalesce(p_from, public.cairo_today()),
      coalesce(p_from, public.cairo_today()) + least(greatest(p_days, 0), 62),
      interval '1 day') d
  )
  select p.id, coalesce(nullif(p.display_name, ''), p.full_name), 'birthday', d.day, null::int
  from days d
  join profiles p on p.status = 'active' and p.celebrate and p.birth_month is not null
    and (
      (p.birth_month = extract(month from d.day) and p.birth_day = extract(day from d.day))
      or (p.birth_month = 2 and p.birth_day = 29 and extract(month from d.day) = 2 and extract(day from d.day) = 28
          and extract(day from (d.day + 1)) = 1)
    )
  where public.is_staff()
  union all
  select p.id, coalesce(nullif(p.display_name, ''), p.full_name), 'anniversary', d.day,
    (extract(year from d.day) - extract(year from p.joined_on))::int
  from days d
  join profiles p on p.status = 'active' and p.celebrate and p.joined_on is not null
    and extract(month from p.joined_on) = extract(month from d.day)
    and extract(day from p.joined_on) = extract(day from d.day)
    and extract(year from d.day) > extract(year from p.joined_on)
  where public.is_staff()
  order by 4, 2;
$$;

-- ---------------------------------------------------------------------------
-- Kudos
-- ---------------------------------------------------------------------------
create table public.kudos (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  badge text not null default 'teamwork'
    check (badge in ('teamwork', 'creative', 'on_time', 'helped', 'great_idea', 'birthday')),
  message text not null check (length(trim(message)) between 1 and 280),
  created_at timestamptz not null default now(),
  constraint kudos_not_self check (from_id <> to_id)
);
create index kudos_to_id_idx on public.kudos (to_id, created_at desc);
create index kudos_from_id_idx on public.kudos (from_id);
create index kudos_created_at_idx on public.kudos (created_at desc);

alter table public.kudos enable row level security;
revoke update on public.kudos from authenticated;

create policy kudos_select on public.kudos for select to authenticated
  using ((select public.is_staff()));
create policy kudos_insert on public.kudos for insert to authenticated
  with check ((select public.is_staff()) and from_id = (select auth.uid()) and to_id <> (select auth.uid()));
create policy kudos_delete on public.kudos for delete to authenticated
  using (from_id = (select auth.uid()) or (select public.has_role('super_admin')));

create trigger audit_kudos after delete on public.kudos
  for each row execute function public.audit_row();

-- Tells the recipient, and celebrates on the map when they are checked in.
create function public.kudos_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  s attendance_sessions;
  sender text;
begin
  select coalesce(nullif(display_name, ''), full_name) into sender from profiles where id = new.from_id;
  perform public.notify(new.to_id, 'kudos', '/celebrations',
    jsonb_build_object('kudos_id', new.id, 'badge', new.badge, 'title', sender, 'by', new.from_id));
  select * into s from attendance_sessions where user_id = new.to_id and checked_out_at is null;
  if s.id is not null then
    perform realtime.send(jsonb_build_object('user_id', new.to_id, 'kind', 'kudos', 'badge', new.badge),
      'celebrate', public._branch_topic(s.branch_id, s.method), true);
  end if;
  return new;
end $$;

create trigger kudos_notify after insert on public.kudos
  for each row execute function public.kudos_after_insert();

alter publication supabase_realtime add table public.kudos;

-- ---------------------------------------------------------------------------
-- Seasonal outfits. `items` are option ids from the character catalogue.
-- ---------------------------------------------------------------------------
create table public.seasonal_events (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z0-9-]+$'),
  name_en text not null check (length(trim(name_en)) between 1 and 80),
  name_ar text not null check (length(trim(name_ar)) between 1 and 80),
  starts_on date not null,
  ends_on date not null,
  items text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seasonal_events_dates check (ends_on >= starts_on)
);
create index seasonal_events_dates_idx on public.seasonal_events (starts_on, ends_on) where is_active;
create trigger seasonal_events_updated_at before update on public.seasonal_events
  for each row execute function public.set_updated_at();

alter table public.seasonal_events enable row level security;
create policy seasonal_events_select on public.seasonal_events for select to authenticated
  using ((select public.is_active_user()));
create policy seasonal_events_insert on public.seasonal_events for insert to authenticated
  with check ((select public.has_role('super_admin')));
create policy seasonal_events_update on public.seasonal_events for update to authenticated
  using ((select public.has_role('super_admin'))) with check ((select public.has_role('super_admin')));
create policy seasonal_events_delete on public.seasonal_events for delete to authenticated
  using ((select public.has_role('super_admin')));

-- Dates that depend on the moon are the expected ones; super admins adjust them in Admin.
insert into public.seasonal_events (key, name_en, name_ar, starts_on, ends_on, items) values
  ('winter-2026', 'Winter and New Year', 'الشتا ورأس السنة', '2026-12-20', '2027-01-08', '{winter-sweater,winter-scarf,party-hat}'),
  ('ramadan-2027', 'Ramadan', 'رمضان', '2027-02-07', '2027-03-09', '{ramadan-galabeya,ramadan-lantern,ramadan-taqiyah}'),
  ('eid-fitr-2027', 'Eid al-Fitr', 'عيد الفطر', '2027-03-10', '2027-03-13', '{eid-kaftan,eid-tarboush,eid-balloon}'),
  ('sham-el-nessim-2027', 'Sham El Nessim', 'شم النسيم', '2027-05-01', '2027-05-04', '{spring-shirt,spring-hat}'),
  ('eid-adha-2027', 'Eid al-Adha', 'عيد الأضحى', '2027-05-15', '2027-05-20', '{eid-kaftan,eid-tarboush,eid-balloon}'),
  ('egypt-pride-2027', 'October 6 celebrations', 'احتفالات 6 أكتوبر', '2027-10-04', '2027-10-07', '{egypt-scarf,egypt-cap}');

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
grant execute on function public.is_staff(), public.cairo_today(timestamptz),
  public.upcoming_celebrations(date, int) to authenticated;
revoke execute on function public._is_workday(date), public._roll_back_workday(date), public._once(text),
  public.kudos_after_insert() from authenticated;

revoke execute on all functions in schema public from public, anon;
