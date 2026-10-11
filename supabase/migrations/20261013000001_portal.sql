-- D3-01..D3-05 Department portal, approval engine for requests, email queue, cron functions.
-- Leave balances and holidays are created here too because submit_request needs them;
-- the leave screens arrive on Day 5.

-- ---------------------------------------------------------------------------
-- Leave balances and holidays
-- ---------------------------------------------------------------------------
create table public.leave_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type_id uuid not null references public.request_types (id) on delete cascade,
  year int not null check (year between 2020 and 2100),
  allowance numeric not null default 0 check (allowance >= 0),
  used numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, type_id, year)
);
create index leave_balances_type_id_idx on public.leave_balances (type_id);
create trigger leave_balances_updated_at before update on public.leave_balances
  for each row execute function public.set_updated_at();
create trigger audit_leave_balances after insert or update or delete on public.leave_balances
  for each row execute function public.audit_row();

create table public.holidays (
  id uuid primary key default gen_random_uuid(),
  day date not null unique,
  name_en text not null,
  name_ar text not null,
  is_half_day boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications add column emailed_at timestamptz;
create index notifications_email_queue_idx on public.notifications (created_at)
  where emailed_at is null and kind in ('approval_waiting', 'request_decided', 'card_returned');

-- ---------------------------------------------------------------------------
-- Date helpers (Cairo, Saturday to Thursday)
-- ---------------------------------------------------------------------------
create function public.cairo_today() returns date
language sql stable set search_path = public as $$
  select (now() at time zone 'Africa/Cairo')::date;
$$;

-- Working days between two dates inclusive: skips Fridays and holidays (half days count 0.5).
create function public.working_days(p_from date, p_to date) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(sum(case when h.is_half_day then 0.5 when h.day is not null then 0 else 1 end), 0)
  from generate_series(p_from, p_to, interval '1 day') as g(d)
  left join holidays h on h.day = g.d::date
  where extract(isodow from g.d) <> 5;
$$;

-- Strategic plans: the month after submission, late after the deadline day (Cairo time).
create function public.strategic_is_late(p_for_month date, p_at timestamptz) returns boolean
language sql stable security definer set search_path = public as $$
  select (p_at at time zone 'Africa/Cairo')::date >
    (p_for_month - interval '1 month')::date
      + ((select coalesce((value #>> '{}')::int, 25) from settings where key = 'strategic_deadline_day') - 1);
$$;

-- ---------------------------------------------------------------------------
-- Defaults for department cards
-- ---------------------------------------------------------------------------
create function public._creative_lead() returns uuid
language sql stable security definer set search_path = public as $$
  select ur.user_id from user_roles ur
  join teams t on t.id = ur.team_id
  join profiles p on p.id = ur.user_id and p.status = 'active'
  where ur.role = 'team_lead' and t.slug = 'creative'
  order by p.created_at limit 1;
$$;

create function public._notify_role(p_role public.app_role, p_kind text, p_link text, p_data jsonb, p_team text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  u uuid;
begin
  for u in
    select distinct ur.user_id from user_roles ur
    join profiles p on p.id = ur.user_id and p.status = 'active'
    left join teams t on t.id = ur.team_id
    where ur.role = p_role and (p_team is null or t.slug = p_team)
  loop
    perform public.notify(u, p_kind, p_link, p_data);
  end loop;
end $$;

-- Insert one department request card from a payload line and move it to performance_input.
create function public._insert_department_card(
  p_line jsonb, p_kind public.card_request_kind, p_plan uuid, p_late boolean
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  b uuid;
  l uuid;
  dept uuid := public.my_department_id();
  new_id uuid;
  pos text;
begin
  select id into b from boards where is_pipeline;
  select id into l from lists where board_id = b and stage = 'request';
  select 'a0' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS') into pos;
  pos := translate(pos, '0', 'V');
  insert into cards (
    board_id, list_id, position, title, description, objective, key_message, reference_links, vertical,
    brand_id, branch_id, format, platforms, priority, due_at, stage, request_kind, requesting_department_id,
    requester_id, reviewer_id, approver_id, is_late_submission, strategic_plan_id, urgent_reason, budget_note,
    created_by, stage_entered_at
  ) values (
    b, l, pos,
    left(trim(p_line ->> 'title'), 200),
    coalesce(p_line ->> 'description', ''),
    nullif(trim(p_line ->> 'objective'), ''),
    nullif(trim(p_line ->> 'key_message'), ''),
    coalesce(p_line -> 'reference_links', '[]'),
    nullif(p_line ->> 'vertical', ''),
    nullif(p_line ->> 'brand_id', '')::uuid,
    nullif(p_line ->> 'branch_id', '')::uuid,
    nullif(p_line ->> 'format', ''),
    coalesce(array(select jsonb_array_elements_text(p_line -> 'platforms')), '{}'),
    coalesce(nullif(p_line ->> 'priority', ''), case when p_kind = 'urgent' then 'urgent' else 'normal' end)::card_priority,
    nullif(p_line ->> 'due_at', '')::timestamptz,
    'request', p_kind, dept, auth.uid(),
    public._creative_lead(),
    (select default_approver_id from departments where id = dept),
    p_late, p_plan,
    nullif(trim(p_line ->> 'urgent_reason'), ''),
    nullif(trim(p_line ->> 'budget_note'), ''),
    auth.uid(), now()
  ) returning id into new_id;
  perform public._set_card_stage(new_id, 'performance_input', jsonb_build_object('submitted', true), null);
  return new_id;
end $$;

create function public._require_requester() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_any_role('{requester,final_approver}') or public.my_department_id() is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;
end $$;

create function public._check_line(p_line jsonb, p_strict boolean) returns void
language plpgsql immutable set search_path = public as $$
declare
  missing text[] := '{}';
begin
  if nullif(trim(coalesce(p_line ->> 'title', '')), '') is null then missing := array_append(missing, 'title'); end if;
  if p_strict then
    if nullif(trim(coalesce(p_line ->> 'objective', '')), '') is null then missing := array_append(missing, 'objective'); end if;
    if nullif(p_line ->> 'vertical', '') is null then missing := array_append(missing, 'vertical'); end if;
    if nullif(p_line ->> 'brand_id', '') is null then missing := array_append(missing, 'brand_id'); end if;
    if nullif(p_line ->> 'format', '') is null then missing := array_append(missing, 'format'); end if;
    if coalesce(jsonb_array_length(p_line -> 'platforms'), 0) = 0 then missing := array_append(missing, 'platforms'); end if;
    if nullif(p_line ->> 'due_at', '') is null then missing := array_append(missing, 'due_at'); end if;
  end if;
  if array_length(missing, 1) > 0 then
    raise exception 'missing_fields:%', array_to_string(missing, ',') using errcode = 'P0001';
  end if;
end $$;

-- payload: { for_month: 'YYYY-MM-01', lines: [ {title, objective, ...}, ... ] }
create function public.submit_strategic_plan(payload jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  for_month date := (payload ->> 'for_month')::date;
  expected date := (date_trunc('month', public.cairo_today()) + interval '1 month')::date;
  plan uuid;
  late boolean;
  line jsonb;
  n int := 0;
begin
  perform public._require_requester();
  if for_month is distinct from expected then
    raise exception 'invalid_month' using errcode = '22023';
  end if;
  if coalesce(jsonb_array_length(payload -> 'lines'), 0) = 0 then
    raise exception 'missing_fields:lines' using errcode = 'P0001';
  end if;
  for line in select * from jsonb_array_elements(payload -> 'lines') loop
    perform public._check_line(line, false);
  end loop;

  late := public.strategic_is_late(for_month, now());
  insert into strategic_plans (department_id, submitted_by, for_month, is_late)
  values (public.my_department_id(), auth.uid(), for_month, late)
  returning id into plan;

  for line in select * from jsonb_array_elements(payload -> 'lines') loop
    perform public._insert_department_card(line, 'strategic', plan, late);
    n := n + 1;
  end loop;

  perform public._notify_role('team_lead', 'strategic_submitted', '/boards', jsonb_build_object('count', n, 'late', late), 'performance');
  perform public._notify_role('traffic_manager', 'strategic_submitted', '/boards', jsonb_build_object('count', n, 'late', late));
  return plan;
end $$;

create function public.submit_urgent_request(payload jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  new_id uuid;
begin
  perform public._require_requester();
  perform public._check_line(payload, true);
  if nullif(trim(coalesce(payload ->> 'urgent_reason', '')), '') is null then
    raise exception 'missing_fields:urgent_reason' using errcode = 'P0001';
  end if;
  new_id := public._insert_department_card(payload, 'urgent', null, false);
  perform public._notify_role('traffic_manager', 'urgent_submitted', '/boards/' ||
    (select board_id from cards where id = new_id) || '?card=' || new_id,
    jsonb_build_object('card_id', new_id, 'title', payload ->> 'title'));
  perform public._notify_role('team_lead', 'urgent_submitted', '/boards', jsonb_build_object('card_id', new_id, 'title', payload ->> 'title'), 'performance');
  return new_id;
end $$;

-- A returned request edited and resubmitted by anyone in the requesting department.
create function public.resubmit_request(p_card_id uuid, payload jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  c cards;
begin
  perform public._require_requester();
  select * into c from cards where id = p_card_id for update;
  if c.id is null or c.requesting_department_id is distinct from public.my_department_id() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if c.stage <> 'request' or c.returned_reason is null then
    raise exception 'transition_not_allowed' using errcode = 'P0001';
  end if;
  update cards set
    title = coalesce(nullif(left(trim(payload ->> 'title'), 200), ''), title),
    description = coalesce(payload ->> 'description', description),
    objective = coalesce(nullif(trim(payload ->> 'objective'), ''), objective),
    key_message = coalesce(nullif(trim(payload ->> 'key_message'), ''), key_message),
    vertical = coalesce(nullif(payload ->> 'vertical', ''), vertical),
    brand_id = coalesce(nullif(payload ->> 'brand_id', '')::uuid, brand_id),
    format = coalesce(nullif(payload ->> 'format', ''), format),
    platforms = case when payload ? 'platforms' then array(select jsonb_array_elements_text(payload -> 'platforms')) else platforms end,
    due_at = coalesce(nullif(payload ->> 'due_at', '')::timestamptz, due_at),
    reference_links = coalesce(payload -> 'reference_links', reference_links),
    missing_items = '{}',
    returned_reason = null
  where id = c.id;
  insert into card_events (card_id, actor_id, kind) values (c.id, auth.uid(), 'resubmitted');
  perform public._set_card_stage(c.id, 'performance_input', jsonb_build_object('resubmitted', true), null);
  perform public._notify_role('traffic_manager', 'request_resubmitted', public.card_link(c.id),
    jsonb_build_object('card_id', c.id, 'title', c.title));
end $$;

-- ---------------------------------------------------------------------------
-- Approval engine for requests (DATA_MODEL.md section 6)
-- ---------------------------------------------------------------------------
create function public._resolve_approvers(p_resolver text, p_requester uuid) returns uuid[]
language plpgsql stable security definer set search_path = public as $$
declare
  result uuid[];
  r text := split_part(p_resolver, ':', 1);
  arg text := substr(p_resolver, length(r) + 2);
begin
  if r = 'team_lead_of_requester' then
    select coalesce(array_agg(distinct ur.user_id), '{}') into result
    from user_roles ur
    join profiles lead on lead.id = ur.user_id and lead.status = 'active'
    join profiles req on req.id = p_requester
    where ur.role = 'team_lead' and req.team_id is not null and ur.team_id = req.team_id and ur.user_id <> p_requester;
    -- Fallbacks: super_admin, then leadership (rule 3).
    if coalesce(array_length(result, 1), 0) = 0 then
      result := public._resolve_approvers('role:super_admin', p_requester);
    end if;
    if coalesce(array_length(result, 1), 0) = 0 then
      result := public._resolve_approvers('role:leadership', p_requester);
    end if;
  elsif r = 'role' then
    select coalesce(array_agg(distinct ur.user_id), '{}') into result
    from user_roles ur join profiles p on p.id = ur.user_id and p.status = 'active'
    where ur.role::text = arg and ur.user_id <> p_requester;
  elsif r = 'user' then
    select coalesce(array_agg(p.id), '{}') into result
    from profiles p where p.id = public.try_uuid(arg) and p.status = 'active' and p.id <> p_requester;
  else
    result := '{}';
  end if;
  return result;
end $$;

-- Build the steps for a request; returns true when nothing needs approval.
create function public._build_request_steps(p_request_id uuid, p_chain jsonb, p_requester uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  step jsonb;
  idx int := 0;
  candidates uuid[];
  prev uuid[] := null;
  first_active boolean := true;
  u uuid;
begin
  for step in select * from jsonb_array_elements(p_chain) loop
    candidates := public._resolve_approvers(step ->> 'resolve', p_requester);
    if coalesce(array_length(candidates, 1), 0) = 0 then
      insert into approval_steps (subject_type, subject_id, step_index, approver_id, status, comment, decided_at)
      select 'request', p_request_id, idx, p_requester, 'skipped', 'no approver', now();
    elsif prev is not null and candidates <@ prev then
      -- Same approver as the previous step (rule 5).
      foreach u in array candidates loop
        insert into approval_steps (subject_type, subject_id, step_index, approver_id, status, comment, decided_at)
        values ('request', p_request_id, idx, u, 'skipped', 'same approver', now());
      end loop;
    else
      foreach u in array candidates loop
        insert into approval_steps (subject_type, subject_id, step_index, approver_id, status)
        values ('request', p_request_id, idx, u, case when first_active then 'active' else 'waiting' end::step_status);
        if first_active then
          perform public.notify(u, 'approval_waiting', '/approvals', jsonb_build_object('request_id', p_request_id));
        end if;
      end loop;
      first_active := false;
      prev := candidates;
    end if;
    idx := idx + 1;
  end loop;
  return first_active;
end $$;

create function public._finish_request(p_request_id uuid, p_status public.request_status) returns void
language plpgsql security definer set search_path = public as $$
declare
  r requests;
  t request_types;
begin
  update requests set status = p_status, decided_at = now() where id = p_request_id returning * into r;
  select * into t from request_types where id = r.type_id;
  if p_status = 'approved' and t.is_leave and r.days is not null then
    insert into leave_balances (user_id, type_id, year, allowance, used)
    values (r.requester_id, r.type_id, extract(year from r.starts_on)::int, 0, r.days)
    on conflict (user_id, type_id, year) do update set used = leave_balances.used + excluded.used;
  end if;
  perform public.notify(r.requester_id, 'request_decided', '/requests',
    jsonb_build_object('request_id', r.id, 'status', p_status, 'type', t.key, 'type_en', t.name_en, 'type_ar', t.name_ar));
end $$;

-- Leaves and special requests. data holds the form values; dates in starts_on / ends_on.
create function public.submit_request(type_key text, data jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  t request_types;
  f jsonb;
  starts date := nullif(data ->> 'starts_on', '')::date;
  ends date := nullif(data ->> 'ends_on', '')::date;
  n numeric;
  bal leave_balances;
  pending numeric;
  new_id uuid;
  nothing_to_approve boolean;
  missing text[] := '{}';
begin
  if not public.is_active_user() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select * into t from request_types where key = type_key and is_active;
  if t.id is null then
    raise exception 'unknown request type' using errcode = 'P0002';
  end if;
  for f in select * from jsonb_array_elements(t.form_schema -> 'fields') loop
    if coalesce((f ->> 'required')::boolean, false) and nullif(trim(coalesce(data ->> (f ->> 'name'), '')), '') is null then
      missing := array_append(missing, f ->> 'name');
    end if;
  end loop;
  if array_length(missing, 1) > 0 then
    raise exception 'missing_fields:%', array_to_string(missing, ',') using errcode = 'P0001';
  end if;
  if ends is null then ends := starts; end if;
  if starts is not null and ends < starts then
    raise exception 'invalid_dates' using errcode = '22023';
  end if;

  if starts is not null and t.counts_working_days then
    n := public.working_days(starts, ends);
    if n <= 0 then
      raise exception 'no_working_days' using errcode = '22023';
    end if;
  end if;

  if t.is_leave then
    if extract(year from starts) <> extract(year from ends) then
      raise exception 'crosses_year' using errcode = '22023';
    end if;
    select * into bal from leave_balances
      where user_id = auth.uid() and type_id = t.id and year = extract(year from starts)::int;
    select coalesce(sum(days), 0) into pending from requests
      where requester_id = auth.uid() and type_id = t.id and status = 'pending'
        and extract(year from starts_on) = extract(year from starts);
    if coalesce(bal.allowance, 0) - coalesce(bal.used, 0) - pending < n then
      raise exception 'insufficient_balance:%', greatest(coalesce(bal.allowance, 0) - coalesce(bal.used, 0) - pending, 0)
        using errcode = 'P0001';
    end if;
  end if;

  insert into requests (type_id, requester_id, status, data, starts_on, ends_on, days)
  values (t.id, auth.uid(), 'pending', data, starts, case when starts is null then null else ends end, n)
  returning id into new_id;

  nothing_to_approve := public._build_request_steps(new_id, t.approval_chain, auth.uid());
  if nothing_to_approve then
    perform public._finish_request(new_id, 'approved');
  end if;
  return new_id;
end $$;

-- Requests are cancelled by their requester while pending, or by hr once approved (refund).
create function public.cancel_request(p_request_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  r requests;
  t request_types;
begin
  select * into r from requests where id = p_request_id for update;
  if r.id is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select * into t from request_types where id = r.type_id;
  if r.status = 'pending' and r.requester_id = auth.uid() and public.is_active_user() then
    update requests set status = 'cancelled', decided_at = now() where id = r.id;
  elsif r.status = 'approved' and public.has_role('hr') then
    update requests set status = 'cancelled', decided_at = now() where id = r.id;
    if t.is_leave and r.days is not null then
      update leave_balances set used = greatest(used - r.days, 0)
      where user_id = r.requester_id and type_id = r.type_id and year = extract(year from r.starts_on)::int;
    end if;
    perform public.notify(r.requester_id, 'request_decided', '/requests',
      jsonb_build_object('request_id', r.id, 'status', 'cancelled', 'type', t.key, 'type_en', t.name_en, 'type_ar', t.name_ar));
  else
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update approval_steps set status = 'skipped', decided_at = now(), comment = coalesce(comment, 'cancelled')
  where subject_type = 'request' and subject_id = r.id and status in ('waiting', 'active');
end $$;

-- ---------------------------------------------------------------------------
-- decide_step: cards (Day 2 logic) and requests.
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
-- Cron functions (service_role only; route handlers call them)
-- ---------------------------------------------------------------------------
-- Cards due within 24 hours that have not reached review; each due date notifies once.
create function public.cron_due_soon() returns int
language plpgsql security definer set search_path = public as $$
declare
  c record;
  n int := 0;
begin
  for c in
    select id, title, due_at from cards
    where archived_at is null and due_at between now() and now() + interval '24 hours'
      and stage is distinct from 'creative_review' and stage is distinct from 'confirmation'
      and coalesce(stage::text, 'free') not in ('ready_to_publish', 'published', 'reported')
      and due_notified_for is distinct from due_at
    for update skip locked
  loop
    perform public.notify(a.user_id, 'card_due_soon', public.card_link(c.id),
      jsonb_build_object('card_id', c.id, 'title', c.title, 'due_at', c.due_at))
    from card_assignees a where a.card_id = c.id;
    update cards set due_notified_for = c.due_at where id = c.id;
    n := n + 1;
  end loop;
  return n;
end $$;

-- Daily: cards published 7 or more days ago move to reported.
create function public.cron_daily() returns int
language plpgsql security definer set search_path = public as $$
declare
  c record;
  n int := 0;
begin
  for c in
    select id from cards where stage = 'published' and published_at <= now() - interval '7 days' and archived_at is null
    for update skip locked
  loop
    perform public._set_card_stage(c.id, 'reported', jsonb_build_object('automatic', true), null);
    n := n + 1;
  end loop;
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- Privileges, policies
-- ---------------------------------------------------------------------------
revoke insert, update, delete on public.leave_balances from authenticated;
grant insert, update, delete on public.leave_balances to authenticated; -- narrowed by policies (hr, super_admin)
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

alter table public.leave_balances enable row level security;
alter table public.holidays enable row level security;

create policy leave_balances_select on public.leave_balances for select to authenticated
  using ((select public.is_active_user()) and (
    user_id = (select auth.uid()) or public.is_team_lead_of(user_id) or (select public.has_any_role('{hr,super_admin}'))));
create policy leave_balances_write on public.leave_balances for all to authenticated
  using ((select public.has_any_role('{hr,super_admin}'))) with check ((select public.has_any_role('{hr,super_admin}')));

create policy holidays_select on public.holidays for select to authenticated using ((select public.is_active_user()));
create policy holidays_write on public.holidays for all to authenticated
  using ((select public.has_any_role('{hr,super_admin}'))) with check ((select public.has_any_role('{hr,super_admin}')));

grant execute on function
  public.cairo_today(), public.working_days(date, date), public.strategic_is_late(date, timestamptz),
  public.submit_strategic_plan(jsonb), public.submit_urgent_request(jsonb), public.resubmit_request(uuid, jsonb),
  public.submit_request(text, jsonb), public.cancel_request(uuid)
  to authenticated;
revoke execute on function public._creative_lead(), public._notify_role(public.app_role, text, text, jsonb, text),
  public._insert_department_card(jsonb, public.card_request_kind, uuid, boolean), public._require_requester(),
  public._check_line(jsonb, boolean), public._resolve_approvers(text, uuid), public._build_request_steps(uuid, jsonb, uuid),
  public._finish_request(uuid, public.request_status), public.cron_due_soon(), public.cron_daily()
  from authenticated;
grant execute on function public.cron_due_soon(), public.cron_daily() to service_role;

-- Belt and braces: nothing in public is executable by PUBLIC or anon.
revoke execute on all functions in schema public from public, anon;
