-- W-04 Shoot day planner, and the week view: where each person is, day by day.
-- The week view shows a place only: never coordinates, leave types or reasons.

-- ---------------------------------------------------------------------------
-- Shoots
-- ---------------------------------------------------------------------------
create type public.shoot_status as enum ('planned', 'confirmed', 'wrapped', 'cancelled');

create table public.shoots (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 160),
  shoot_on date not null,
  call_time time not null default '09:00',
  wrap_time time,
  branch_id uuid references public.branches (id) on delete set null,
  location_name text check (location_name is null or length(location_name) <= 160),
  location_url text check (location_url is null or location_url ~* '^https?://'),
  status public.shoot_status not null default 'planned',
  producer_id uuid references public.profiles (id) on delete set null,
  brief text not null default '' check (length(brief) <= 6000),
  backup_plan text not null default '' check (length(backup_plan) <= 2000),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shoots_place check (branch_id is not null or location_name is not null),
  constraint shoots_times check (wrap_time is null or wrap_time > call_time)
);
create index shoots_shoot_on_idx on public.shoots (shoot_on) where archived_at is null;
create index shoots_branch_id_idx on public.shoots (branch_id);
create index shoots_producer_id_idx on public.shoots (producer_id);
create index shoots_created_by_idx on public.shoots (created_by);
create trigger shoots_updated_at before update on public.shoots
  for each row execute function public.set_updated_at();

create table public.shoot_crew (
  id uuid primary key default gen_random_uuid(),
  shoot_id uuid not null references public.shoots (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  external_name text check (external_name is null or length(trim(external_name)) between 1 and 120),
  role text not null default '' check (length(role) <= 80),
  call_time time,
  confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  constraint shoot_crew_person check ((user_id is null) <> (external_name is null)),
  constraint shoot_crew_unique unique (shoot_id, user_id)
);
create index shoot_crew_user_id_idx on public.shoot_crew (user_id);

create table public.shoot_shots (
  id uuid primary key default gen_random_uuid(),
  shoot_id uuid not null references public.shoots (id) on delete cascade,
  position int not null default 0,
  description text not null check (length(trim(description)) between 1 and 500),
  shot_type text not null default '' check (length(shot_type) <= 60),
  card_id uuid references public.cards (id) on delete set null,
  done boolean not null default false,
  notes text not null default '' check (length(notes) <= 1000),
  created_at timestamptz not null default now()
);
create index shoot_shots_shoot_id_idx on public.shoot_shots (shoot_id, position);
create index shoot_shots_card_id_idx on public.shoot_shots (card_id);

create table public.shoot_equipment (
  id uuid primary key default gen_random_uuid(),
  shoot_id uuid not null references public.shoots (id) on delete cascade,
  item text not null check (length(trim(item)) between 1 and 120),
  quantity int not null default 1 check (quantity between 1 and 999),
  owner_id uuid references public.profiles (id) on delete set null,
  packed boolean not null default false,
  returned boolean not null default false,
  created_at timestamptz not null default now()
);
create index shoot_equipment_shoot_id_idx on public.shoot_equipment (shoot_id);
create index shoot_equipment_owner_id_idx on public.shoot_equipment (owner_id);

create table public.shoot_cards (
  shoot_id uuid not null references public.shoots (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  primary key (shoot_id, card_id)
);
create index shoot_cards_card_id_idx on public.shoot_cards (card_id);

create function public.on_shoot_crew(p_shoot_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from shoot_crew c where c.shoot_id = p_shoot_id and c.user_id = auth.uid());
$$;

create function public.can_view_shoot(p_shoot_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_active_user() and (public.is_marketing() or public.on_shoot_crew(p_shoot_id));
$$;

create function public.can_edit_shoot(p_shoot_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_active_user() and (
    (public.has_any_role('{super_admin,traffic_manager,team_lead}') and public.is_marketing_writer())
    or public.on_shoot_crew(p_shoot_id)
    or exists (select 1 from shoots s where s.id = p_shoot_id and (s.producer_id = auth.uid() or s.created_by = auth.uid()))
  );
$$;

create function public.shoot_crew_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  s shoots;
begin
  if new.user_id is not null and new.user_id is distinct from auth.uid() then
    select * into s from shoots where id = new.shoot_id;
    perform public.notify(new.user_id, 'shoot_crew_added', '/shoots/' || new.shoot_id,
      jsonb_build_object('shoot_id', new.shoot_id, 'title', s.title, 'shoot_on', s.shoot_on));
  end if;
  return new;
end $$;
create trigger shoot_crew_notify after insert on public.shoot_crew
  for each row execute function public.shoot_crew_after_insert();

-- The day before: reminds the crew. Runs from the daily job.
create function public.cron_shoots(p_now timestamptz default now()) returns int
language plpgsql security definer set search_path = public as $$
declare
  r record;
  n int := 0;
begin
  for r in
    select * from shoots
    where archived_at is null and status in ('planned', 'confirmed') and shoot_on = public.cairo_today(p_now) + 1
  loop
    if public._once('shoot:' || r.id || ':' || r.shoot_on) then
      perform public.notify(c.user_id, 'shoot_tomorrow', '/shoots/' || r.id,
        jsonb_build_object('shoot_id', r.id, 'title', r.title, 'shoot_on', r.shoot_on, 'call_time', coalesce(c.call_time, r.call_time)))
      from shoot_crew c where c.shoot_id = r.id and c.user_id is not null;
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

alter table public.shoots enable row level security;
alter table public.shoot_crew enable row level security;
alter table public.shoot_shots enable row level security;
alter table public.shoot_equipment enable row level security;
alter table public.shoot_cards enable row level security;

create policy shoots_select on public.shoots for select to authenticated using (public.can_view_shoot(id));
create policy shoots_insert on public.shoots for insert to authenticated
  with check ((select public.is_marketing_writer()) and created_by = (select auth.uid()));
create policy shoots_update on public.shoots for update to authenticated
  using (public.can_edit_shoot(id)) with check (public.can_edit_shoot(id));
create policy shoots_delete on public.shoots for delete to authenticated
  using ((select public.has_any_role('{super_admin,traffic_manager}')));

create policy shoot_crew_select on public.shoot_crew for select to authenticated using (public.can_view_shoot(shoot_id));
create policy shoot_crew_insert on public.shoot_crew for insert to authenticated
  with check (public.can_edit_shoot(shoot_id));
create policy shoot_crew_update on public.shoot_crew for update to authenticated
  using (public.can_edit_shoot(shoot_id)) with check (public.can_edit_shoot(shoot_id));
create policy shoot_crew_delete on public.shoot_crew for delete to authenticated
  using (public.can_edit_shoot(shoot_id));
create policy shoot_shots_select on public.shoot_shots for select to authenticated using (public.can_view_shoot(shoot_id));
create policy shoot_shots_insert on public.shoot_shots for insert to authenticated
  with check (public.can_edit_shoot(shoot_id));
create policy shoot_shots_update on public.shoot_shots for update to authenticated
  using (public.can_edit_shoot(shoot_id)) with check (public.can_edit_shoot(shoot_id));
create policy shoot_shots_delete on public.shoot_shots for delete to authenticated
  using (public.can_edit_shoot(shoot_id));
create policy shoot_equipment_select on public.shoot_equipment for select to authenticated using (public.can_view_shoot(shoot_id));
create policy shoot_equipment_insert on public.shoot_equipment for insert to authenticated
  with check (public.can_edit_shoot(shoot_id));
create policy shoot_equipment_update on public.shoot_equipment for update to authenticated
  using (public.can_edit_shoot(shoot_id)) with check (public.can_edit_shoot(shoot_id));
create policy shoot_equipment_delete on public.shoot_equipment for delete to authenticated
  using (public.can_edit_shoot(shoot_id));
create policy shoot_cards_select on public.shoot_cards for select to authenticated using (public.can_view_shoot(shoot_id));
create policy shoot_cards_insert on public.shoot_cards for insert to authenticated
  with check (public.can_edit_shoot(shoot_id) and public.can_view_card(card_id));
create policy shoot_cards_delete on public.shoot_cards for delete to authenticated
  using (public.can_edit_shoot(shoot_id));

-- ---------------------------------------------------------------------------
-- Week plan: where each person expects to be
-- ---------------------------------------------------------------------------
create type public.week_plan_kind as enum ('branch', 'field', 'home', 'away');

create table public.week_plan_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  kind public.week_plan_kind not null,
  branch_id uuid references public.branches (id) on delete set null,
  place text check (place is null or length(place) <= 120),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint week_plan_unique unique (user_id, day),
  constraint week_plan_branch check (kind <> 'branch' or branch_id is not null)
);
create index week_plan_entries_day_idx on public.week_plan_entries (day);
create index week_plan_entries_branch_id_idx on public.week_plan_entries (branch_id);
create index week_plan_entries_created_by_idx on public.week_plan_entries (created_by);
create trigger week_plan_entries_updated_at before update on public.week_plan_entries
  for each row execute function public.set_updated_at();

alter table public.week_plan_entries enable row level security;
create policy week_plan_select on public.week_plan_entries for select to authenticated
  using ((select public.is_staff()) and (user_id = (select auth.uid()) or (select public.has_any_role('{super_admin,traffic_manager}'))));
create policy week_plan_insert on public.week_plan_entries for insert to authenticated
  with check ((select public.is_staff()) and (user_id = (select auth.uid()) or (select public.has_any_role('{super_admin,traffic_manager}'))));
create policy week_plan_update on public.week_plan_entries for update to authenticated
  using ((select public.is_staff()) and (user_id = (select auth.uid()) or (select public.has_any_role('{super_admin,traffic_manager}'))))
  with check ((select public.is_staff()) and (user_id = (select auth.uid()) or (select public.has_any_role('{super_admin,traffic_manager}'))));
create policy week_plan_delete on public.week_plan_entries for delete to authenticated
  using ((select public.is_staff()) and (user_id = (select auth.uid()) or (select public.has_any_role('{super_admin,traffic_manager}'))));

-- One row per person and day. Order of truth: today's real check-in, approved
-- leave, approved work from home, a shoot, the person's plan, their schedule.
-- kind: branch, field, shoot, home, away, off, unknown.
create function public.team_week(p_from date, p_to date, p_department_id uuid default null)
returns table (
  user_id uuid, display_name text, title text, department_id uuid, team_id uuid,
  day date, kind text, branch_id uuid, place text, source text
)
language sql stable security definer set search_path = public as $$
  select p.id, coalesce(nullif(p.display_name, ''), p.full_name), p.title, p.department_id, p.team_id,
    d.day, r.kind, r.branch_id, r.place, r.source
  from profiles p
  cross join lateral (
    select x::date as day from generate_series(p_from, least(p_to, p_from + 41), interval '1 day') x
  ) d
  cross join lateral (
    select * from (
      -- Real check-in that day
      select 1 as prio,
        case s.method when 'field' then 'field' when 'home' then 'home' else 'branch' end as kind,
        s.branch_id, s.checkin_place as place, 'checkin' as source
      from attendance_sessions s
      where s.user_id = p.id and (s.checked_in_at at time zone 'Africa/Cairo')::date = d.day
      union all
      -- Approved leave (no type or reason)
      select 2, 'away', null::uuid, null::text, 'leave'
      from requests q join request_types t on t.id = q.type_id
      where q.requester_id = p.id and q.status = 'approved' and t.is_leave
        and d.day between q.starts_on and coalesce(q.ends_on, q.starts_on)
      union all
      -- Approved work from home
      select 3, 'home', null::uuid, null::text, 'wfh'
      from requests q join request_types t on t.id = q.type_id
      where q.requester_id = p.id and q.status = 'approved' and t.key = 'work_from_home'
        and d.day between q.starts_on and coalesce(q.ends_on, q.starts_on)
      union all
      -- On a shoot's crew
      select 4, 'shoot', sh.branch_id, coalesce(sh.location_name, br.name_en), 'shoot'
      from shoot_crew c
      join shoots sh on sh.id = c.shoot_id and sh.archived_at is null and sh.status <> 'cancelled'
      left join branches br on br.id = sh.branch_id
      where c.user_id = p.id and sh.shoot_on = d.day
      union all
      -- The person's plan
      select 5, e.kind::text, e.branch_id, e.place, 'plan'
      from week_plan_entries e where e.user_id = p.id and e.day = d.day
      union all
      -- Day off
      select 6, 'off', null::uuid, null::text, 'schedule'
      where not public._is_workday(d.day) or not exists (
        select 1 from schedules sc where sc.user_id = p.id and extract(dow from d.day)::int = any (sc.workdays))
      union all
      -- Usual branch
      select 7, case when p.home_branch_id is null then 'unknown' else 'branch' end, p.home_branch_id, null::text, 'default'
    ) options
    order by prio
    limit 1
  ) r
  where public.is_staff()
    and p.status = 'active'
    and (p_department_id is null or p.department_id = p_department_id)
    and exists (select 1 from user_roles ur where ur.user_id = p.id and ur.role <> 'guest')
  order by 2, d.day;
$$;

-- ---------------------------------------------------------------------------
-- Strategic requests: reminders before the monthly deadline
-- ---------------------------------------------------------------------------
create function public.cron_strategic_reminders(p_now timestamptz default now()) returns int
language plpgsql security definer set search_path = public as $$
declare
  today date := public.cairo_today(p_now);
  deadline_day int := coalesce((select (value #>> '{}')::int from settings where key = 'strategic_deadline_day'), 25);
  deadline date := public._roll_back_workday(date_trunc('month', today)::date + (deadline_day - 1));
  for_month date := (date_trunc('month', today) + interval '1 month')::date;
  left_days int := deadline - today;
  r record;
  n int := 0;
begin
  if left_days not in (5, 1) then return 0; end if;
  for r in
    select distinct p.id, p.department_id
    from profiles p
    join user_roles ur on ur.user_id = p.id and ur.role = 'requester'
    join departments d on d.id = p.department_id and not d.is_marketing
    where p.status = 'active'
      and not exists (select 1 from strategic_plans sp where sp.department_id = p.department_id and sp.for_month = for_month)
  loop
    if public._once('strategic:' || r.id || ':' || for_month || ':' || left_days) then
      perform public.notify(r.id, 'strategic_reminder', '/portal/requests/new',
        jsonb_build_object('title', to_char(deadline, 'YYYY-MM-DD'), 'deadline', deadline, 'for_month', for_month, 'days', left_days));
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
grant execute on function
  public.on_shoot_crew(uuid), public.can_view_shoot(uuid), public.can_edit_shoot(uuid),
  public.team_week(date, date, uuid)
  to authenticated;
revoke execute on function public.shoot_crew_after_insert(), public.cron_shoots(timestamptz),
  public.cron_strategic_reminders(timestamptz) from authenticated;
grant execute on function public.cron_shoots(timestamptz), public.cron_strategic_reminders(timestamptz) to service_role;

revoke execute on all functions in schema public from public, anon;
