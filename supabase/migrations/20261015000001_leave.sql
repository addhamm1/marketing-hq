-- D5-03..D5-05 Request files, attachment rule, team absences.

-- ---------------------------------------------------------------------------
-- submit_request: adds the supporting-file rule.
-- ---------------------------------------------------------------------------
create or replace function public.submit_request(type_key text, data jsonb) returns uuid
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

  -- Supporting files (for example a sick note after N days) live in
  -- request-files under requests/<requester>/ and are listed in data.files.
  if jsonb_typeof(coalesce(data -> 'files', '[]')) <> 'array'
     or exists (select 1 from jsonb_array_elements_text(coalesce(data -> 'files', '[]')) as file_list(path)
                where file_list.path not like 'requests/' || auth.uid() || '/%') then
    raise exception 'invalid_files' using errcode = '22023';
  end if;
  if t.requires_attachment_after_days is not null and n > t.requires_attachment_after_days
     and coalesce(jsonb_array_length(data -> 'files'), 0) = 0 then
    raise exception 'missing_fields:files' using errcode = 'P0001';
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


-- ---------------------------------------------------------------------------
-- Team calendar: absences without reasons or form data.
-- Marketing users see everyone in marketing; others see their own department.
-- ---------------------------------------------------------------------------
create function public.team_absences(p_from date, p_to date)
returns table (user_id uuid, category text, starts_on date, ends_on date)
language sql stable security definer set search_path = public as $$
  with viewer as (
    select public.is_marketing() as marketing, public.my_department_id() as dept, public.is_active_user() as active
  ),
  visible as (
    select p.id from profiles p
    left join departments d on d.id = p.department_id
    cross join viewer v
    where v.active and p.status = 'active' and (
      (v.marketing and (coalesce(d.is_marketing, false) or exists (
        select 1 from user_roles ur where ur.user_id = p.id and ur.role in ('super_admin', 'leadership', 'traffic_manager', 'team_lead', 'member'))))
      or (not v.marketing and p.department_id = v.dept)
    )
  )
  select r.requester_id, case when t.is_leave then 'leave' else 'wfh' end, r.starts_on, coalesce(r.ends_on, r.starts_on)
  from requests r join request_types t on t.id = r.type_id
  where r.status = 'approved' and (t.is_leave or t.key = 'work_from_home')
    and r.starts_on <= p_to and coalesce(r.ends_on, r.starts_on) >= p_from
    and r.requester_id in (select id from visible)
  union all
  select distinct s.user_id, 'field', (s.checked_in_at at time zone 'Africa/Cairo')::date, (s.checked_in_at at time zone 'Africa/Cairo')::date
  from attendance_sessions s
  where s.method = 'field'
    and (s.checked_in_at at time zone 'Africa/Cairo')::date between p_from and p_to
    and s.user_id in (select id from visible);
$$;

-- ---------------------------------------------------------------------------
-- Storage: request files (sick notes). Path: requests/<requester_id>/<file>
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('request-files', 'request-files', false, 20971520)
on conflict (id) do nothing;

create function public.can_read_request_file(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select (storage.foldername(p_name))[1] = 'requests' and (
    (storage.foldername(p_name))[2] = auth.uid()::text
    or exists (
      select 1 from requests r
      where r.requester_id::text = (storage.foldername(p_name))[2]
        and r.data -> 'files' ? p_name
        and public.can_view_request(r.id)
    )
  );
$$;

create policy request_files_read on storage.objects for select to authenticated
  using (bucket_id = 'request-files' and public.can_read_request_file(name));
create policy request_files_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'request-files'
    and (storage.foldername(name))[1] = 'requests'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and (select public.is_active_user()));
create policy request_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'request-files' and owner_id = (select auth.uid())::text);

grant execute on function public.team_absences(date, date), public.can_read_request_file(text) to authenticated;

revoke execute on all functions in schema public from public, anon;
