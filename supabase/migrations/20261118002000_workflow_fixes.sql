-- W-18 Fixes found while building the workflow screens.
-- * cron_strategic_reminders: a variable clashed with a column name, so it failed.
-- * strategic_is_late: uses the same working-day deadline as the portal banner and reminders.
-- * team_week: colleagues can no longer tell whether an away day came from a leave request.
--   The person and the managers who plan the team still see it, so leave days stay locked for them.
-- * week_plan_entries: people can change their own plan from today onward only.

create or replace function public.cron_strategic_reminders(p_now timestamptz default now()) returns int
language plpgsql security definer set search_path = public as $$
declare
  today date := public.cairo_today(p_now);
  deadline_day int := coalesce((select (value #>> '{}')::int from settings where key = 'strategic_deadline_day'), 25);
  deadline date := public._roll_back_workday(date_trunc('month', today)::date + (deadline_day - 1));
  target_month date := (date_trunc('month', today) + interval '1 month')::date;
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
      and not exists (select 1 from strategic_plans sp where sp.department_id = p.department_id and sp.for_month = target_month)
  loop
    if public._once('strategic:' || r.id || ':' || target_month || ':' || left_days) then
      perform public.notify(r.id, 'strategic_reminder', '/portal/requests/new',
        jsonb_build_object('title', to_char(deadline, 'YYYY-MM-DD'), 'deadline', deadline, 'for_month', target_month, 'days', left_days));
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

create or replace function public.strategic_is_late(p_for_month date, p_at timestamptz) returns boolean
language sql stable security definer set search_path = public as $$
  select (p_at at time zone 'Africa/Cairo')::date > public._roll_back_workday(
    (p_for_month - interval '1 month')::date
      + (coalesce((select (value #>> '{}')::int from settings where key = 'strategic_deadline_day'), 25) - 1));
$$;

create or replace function public.team_week(p_from date, p_to date, p_department_id uuid default null)
returns table (
  user_id uuid, display_name text, title text, department_id uuid, team_id uuid,
  day date, kind text, branch_id uuid, place text, source text
)
language sql stable security definer set search_path = public as $$
  select p.id, coalesce(nullif(p.display_name, ''), p.full_name), p.title, p.department_id, p.team_id,
    d.day, r.kind, r.branch_id, r.place,
    case when r.source = 'leave' and p.id is distinct from auth.uid()
      and not public.has_any_role('{super_admin,traffic_manager}') then 'plan' else r.source end
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

drop policy week_plan_insert on public.week_plan_entries;
drop policy week_plan_update on public.week_plan_entries;
drop policy week_plan_delete on public.week_plan_entries;

create policy week_plan_insert on public.week_plan_entries for insert to authenticated
  with check ((select public.is_staff()) and (
    (user_id = (select auth.uid()) and day >= (select public.cairo_today()))
    or (select public.has_any_role('{super_admin,traffic_manager}'))));
create policy week_plan_update on public.week_plan_entries for update to authenticated
  using ((select public.is_staff()) and (
    (user_id = (select auth.uid()) and day >= (select public.cairo_today()))
    or (select public.has_any_role('{super_admin,traffic_manager}'))))
  with check ((select public.is_staff()) and (
    (user_id = (select auth.uid()) and day >= (select public.cairo_today()))
    or (select public.has_any_role('{super_admin,traffic_manager}'))));
create policy week_plan_delete on public.week_plan_entries for delete to authenticated
  using ((select public.is_staff()) and (
    (user_id = (select auth.uid()) and day >= (select public.cairo_today()))
    or (select public.has_any_role('{super_admin,traffic_manager}'))));

revoke execute on all functions in schema public from public, anon;
