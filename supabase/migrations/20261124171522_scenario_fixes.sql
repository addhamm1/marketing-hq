-- Fixes found by the cross-module scenario tests (supabase/tests/scenarios.test.ts).
-- * meeting_action_to_card: the assignee was told twice ("assigned" from the
--   card_assignees trigger, then "meeting_action_assigned"). Now one notice, with
--   the meeting wording.
-- * decide_step: when the reviewer is also the department's approver, the merged
--   confirmation delivered the card without telling the requester.
-- * team_week: checking in to a shoot turned the day from "Shoot" into "Field",
--   and a shoot at a branch lost its place. A check-in linked to a shoot now shows
--   the shoot, with its place (never coordinates). With two check-ins on one day the
--   cell picked either at random; the latest one now wins.
-- * A shoot check-in sets the person's status to "On a shoot"; checking out (by
--   hand or the night-time job) now puts it back to Available.

-- ---------------------------------------------------------------------------
-- Meeting actions: one notice per assignment
-- ---------------------------------------------------------------------------
create or replace function public.meeting_action_to_card(p_action_id uuid, p_board_id uuid default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  a meeting_actions;
  m meetings;
  b uuid;
  l uuid;
  new_card uuid;
  pos text;
begin
  select * into a from meeting_actions where id = p_action_id for update;
  if a.id is null then
    raise exception 'not found' using errcode = 'P0002';
  end if;
  select * into m from meetings where id = a.meeting_id;
  if not ((public.in_meeting(a.meeting_id) or public.can_edit_meeting(a.meeting_id)) and public.is_marketing_writer()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if a.card_id is not null then
    return a.card_id;
  end if;
  b := coalesce(p_board_id, nullif((select value #>> '{}' from settings where key = 'meeting_actions_board_id'), '')::uuid);
  if b is null or not public.can_add_to_board(b) then
    raise exception 'no_actions_board' using errcode = 'P0001';
  end if;
  select id into l from lists where board_id = b and archived_at is null order by position collate "C" limit 1;
  if l is null then
    raise exception 'no_actions_board' using errcode = 'P0001';
  end if;
  pos := translate('a0' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS'), '0', 'V');
  insert into cards (board_id, list_id, position, title, description, due_at, created_by)
  values (b, l, pos, a.title,
    m.title || ' (' || to_char(m.starts_at at time zone 'Africa/Cairo', 'YYYY-MM-DD') || ')',
    case when a.due_on is not null then ((a.due_on + time '18:00') at time zone 'Africa/Cairo') end,
    auth.uid())
  returning id into new_card;
  if a.assignee_id is not null then
    insert into card_assignees (card_id, user_id, role) values (new_card, a.assignee_id, 'other') on conflict do nothing;
    if a.assignee_id <> auth.uid() then
      -- The card_assignees trigger has just sent the generic "assigned" notice for this
      -- new card. Give that one notice the meeting wording instead of sending a second.
      update notifications
      set kind = 'meeting_action_assigned', data = data || jsonb_build_object('meeting_id', m.id)
      where user_id = a.assignee_id and kind = 'assigned' and data ->> 'card_id' = new_card::text;
      if not found then
        perform public.notify(a.assignee_id, 'meeting_action_assigned', public.card_link(new_card),
          jsonb_build_object('card_id', new_card, 'title', a.title, 'meeting_id', m.id));
      end if;
    end if;
  end if;
  update meeting_actions set card_id = new_card where id = a.id;
  return new_card;
end $$;

-- ---------------------------------------------------------------------------
-- decide_step: the merged confirmation also tells the requester
-- (same body as 20261013000001_portal.sql, plus one notify in the merge branch)
-- ---------------------------------------------------------------------------
create or replace function public.decide_step(
  p_step_id uuid, p_decision public.step_status, p_comment text default null, p_reason public.revision_reason default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  s approval_steps;
  c cards;
  r requests;
  next_idx int;
  u uuid;
begin
  select * into s from approval_steps where id = p_step_id for update;
  if s.id is null or s.approver_id <> auth.uid() or s.status <> 'active' or not public.is_active_user() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if s.subject_type = 'request' then
    if p_decision not in ('approved', 'rejected') then
      raise exception 'invalid_decision' using errcode = '22023';
    end if;
    if p_decision = 'rejected' and nullif(trim(coalesce(p_comment, '')), '') is null then
      raise exception 'missing_fields:comment' using errcode = 'P0001';
    end if;
    select * into r from requests where id = s.subject_id for update;
    if r.status <> 'pending' then
      raise exception 'stale_step' using errcode = 'P0001';
    end if;
    update approval_steps set status = p_decision, comment = p_comment, decided_at = now() where id = s.id;
    -- First decision wins: siblings are skipped.
    update approval_steps set status = 'skipped', decided_at = now()
    where subject_type = 'request' and subject_id = r.id and step_index = s.step_index and id <> s.id and status in ('active', 'waiting');

    if p_decision = 'rejected' then
      update approval_steps set status = 'skipped', decided_at = now()
      where subject_type = 'request' and subject_id = r.id and status = 'waiting';
      perform public._finish_request(r.id, 'rejected');
      return;
    end if;

    select min(step_index) into next_idx from approval_steps
    where subject_type = 'request' and subject_id = r.id and status = 'waiting';
    if next_idx is null then
      perform public._finish_request(r.id, 'approved');
      return;
    end if;
    for u in
      update approval_steps set status = 'active'
      where subject_type = 'request' and subject_id = r.id and step_index = next_idx and status = 'waiting'
      returning approver_id
    loop
      perform public.notify(u, 'approval_waiting', '/approvals', jsonb_build_object('request_id', r.id));
    end loop;
    return;
  end if;

  -- Card steps.
  if p_decision not in ('approved', 'changes_requested') then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;
  if p_decision = 'changes_requested' and (p_reason is null or nullif(trim(coalesce(p_comment, '')), '') is null) then
    raise exception 'missing_fields:reason' using errcode = 'P0001';
  end if;
  select * into c from cards where id = s.subject_id for update;
  if c.stage is distinct from s.card_stage then
    raise exception 'stale_step' using errcode = 'P0001';
  end if;

  update approval_steps set status = p_decision, comment = p_comment, revision_reason = p_reason, decided_at = now()
  where id = s.id;
  update approval_steps set status = 'skipped', decided_at = now()
  where subject_type = 'card' and subject_id = s.subject_id and step_index = s.step_index
    and id <> s.id and status in ('active', 'waiting');
  insert into card_events (card_id, actor_id, kind, from_stage, data)
  values (c.id, auth.uid(), 'approval', c.stage,
    jsonb_build_object('decision', p_decision, 'comment', p_comment, 'reason', p_reason));

  if p_decision = 'changes_requested' then
    update cards set revision_count = revision_count + 1 where id = c.id;
    insert into card_events (card_id, actor_id, kind, data)
    values (c.id, auth.uid(), 'revision', jsonb_build_object('reason', p_reason, 'comment', p_comment, 'stage', c.stage));
    perform public._set_card_stage(c.id, 'production', jsonb_build_object('changes_requested', true), null);
    perform public.notify(a.user_id, 'card_changes_requested', public.card_link(c.id),
      jsonb_build_object('card_id', c.id, 'title', c.title, 'reason', p_reason))
    from card_assignees a where a.card_id = c.id;
    return;
  end if;

  if c.stage = 'creative_review' then
    if c.approver_id = auth.uid() then
      insert into approval_steps (subject_type, subject_id, card_stage, step_index, approver_id, status, comment, decided_at)
      values ('card', c.id, 'confirmation', s.step_index + 1, c.approver_id, 'skipped', 'same approver', now());
      perform public._set_card_stage(c.id, 'ready_to_publish', jsonb_build_object('merged_confirmation', true), null);
      -- Delivered without a separate confirmation: the requester is told, as below.
      perform public.notify(c.requester_id, 'card_delivered', '/portal/requests/' || c.id,
        jsonb_build_object('card_id', c.id, 'title', c.title));
      return;
    end if;
    perform public._set_card_stage(c.id, 'confirmation', '{}', null);
    perform public._create_card_step(c.id, 'confirmation');
    return;
  end if;

  if c.stage = 'confirmation' then
    perform public._set_card_stage(c.id, 'ready_to_publish', '{}', null);
    perform public.notify(c.requester_id, 'card_delivered', '/portal/requests/' || c.id,
      jsonb_build_object('card_id', c.id, 'title', c.title));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- team_week: a check-in linked to a shoot shows the shoot; the latest check-in wins
-- (same as 20261118002000_workflow_fixes.sql except the check-in row and the order)
-- ---------------------------------------------------------------------------
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
      -- Real check-in that day; a check-in to a shoot shows the shoot and its place
      select 1 as prio,
        case when s.shoot_id is not null then 'shoot'
          when s.method = 'field' then 'field' when s.method = 'home' then 'home' else 'branch' end as kind,
        coalesce(s.branch_id, sh.branch_id) as branch_id,
        coalesce(s.checkin_place, sh.location_name, shb.name_en) as place,
        'checkin' as source, s.checked_in_at as seen_at
      from attendance_sessions s
      left join shoots sh on sh.id = s.shoot_id
      left join branches shb on shb.id = sh.branch_id
      where s.user_id = p.id and (s.checked_in_at at time zone 'Africa/Cairo')::date = d.day
      union all
      -- Approved leave (no type or reason)
      select 2, 'away', null::uuid, null::text, 'leave', null::timestamptz
      from requests q join request_types t on t.id = q.type_id
      where q.requester_id = p.id and q.status = 'approved' and t.is_leave
        and d.day between q.starts_on and coalesce(q.ends_on, q.starts_on)
      union all
      -- Approved work from home
      select 3, 'home', null::uuid, null::text, 'wfh', null::timestamptz
      from requests q join request_types t on t.id = q.type_id
      where q.requester_id = p.id and q.status = 'approved' and t.key = 'work_from_home'
        and d.day between q.starts_on and coalesce(q.ends_on, q.starts_on)
      union all
      -- On a shoot's crew
      select 4, 'shoot', sh.branch_id, coalesce(sh.location_name, br.name_en), 'shoot', null::timestamptz
      from shoot_crew c
      join shoots sh on sh.id = c.shoot_id and sh.archived_at is null and sh.status <> 'cancelled'
      left join branches br on br.id = sh.branch_id
      where c.user_id = p.id and sh.shoot_on = d.day
      union all
      -- The person's plan
      select 5, e.kind::text, e.branch_id, e.place, 'plan', null::timestamptz
      from week_plan_entries e where e.user_id = p.id and e.day = d.day
      union all
      -- Day off
      select 6, 'off', null::uuid, null::text, 'schedule', null::timestamptz
      where not public._is_workday(d.day) or not exists (
        select 1 from schedules sc where sc.user_id = p.id and extract(dow from d.day)::int = any (sc.workdays))
      union all
      -- Usual branch
      select 7, case when p.home_branch_id is null then 'unknown' else 'branch' end, p.home_branch_id, null::text, 'default',
        null::timestamptz
    ) options
    order by prio, seen_at desc nulls last
    limit 1
  ) r
  where public.is_staff()
    and p.status = 'active'
    and (p_department_id is null or p.department_id = p_department_id)
    and exists (select 1 from user_roles ur where ur.user_id = p.id and ur.role <> 'guest')
  order by 2, d.day;
$$;

-- ---------------------------------------------------------------------------
-- Leaving a shoot: the status the shoot check-in set goes back to Available
-- ---------------------------------------------------------------------------
create function public.shoot_presence_clear() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.checked_out_at is not null and old.checked_out_at is null and new.shoot_id is not null then
    update profiles set presence = 'available', presence_updated_at = now()
    where id = new.user_id and presence = 'shoot';
  end if;
  return new;
end $$;
create trigger attendance_clear_shoot_presence after update of checked_out_at on public.attendance_sessions
  for each row execute function public.shoot_presence_clear();

revoke execute on function public.shoot_presence_clear() from authenticated;
revoke execute on all functions in schema public from public, anon;
