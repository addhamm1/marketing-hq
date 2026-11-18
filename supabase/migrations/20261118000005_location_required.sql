-- W-05 Every check-in and check-out needs location access (Adham, 2026-11-18).
-- * check_in: all methods need a location reading; it is recorded for every
--   method, including work from home. Visibility is unchanged: the person,
--   their team lead, hr, super_admin and leadership.
-- * check_out: the location is required. The automatic night-time check-out
--   (cron_auto_checkout) is the only close without one.
-- * Branches whose point nobody has confirmed use a wide geofence so a rough
--   starting coordinate cannot lock people out on launch day.
-- * A field check-in can name the shoot it belongs to.

alter table public.branches add column location_confirmed_at timestamptz;

-- Setting a branch's point in Admin confirms it. Seeds (no signed-in user) do not.
create function public.branch_location_confirm() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null
     and (new.latitude is distinct from old.latitude or new.longitude is distinct from old.longitude)
     and new.latitude is not null then
    new.location_confirmed_at := now();
  end if;
  return new;
end $$;
create trigger branches_location_confirm before update of latitude, longitude on public.branches
  for each row execute function public.branch_location_confirm();

create function public.branch_geofence_m(b public.branches) returns int
language sql stable set search_path = public as $$
  select case when b.location_confirmed_at is null then greatest(b.geofence_radius_m, 1500) else b.geofence_radius_m end;
$$;

alter table public.attendance_sessions
  add column shoot_id uuid references public.shoots (id) on delete set null;
create index attendance_sessions_shoot_id_idx on public.attendance_sessions (shoot_id);

drop function public.check_in(uuid, public.checkin_method, uuid, jsonb, uuid, text, timestamptz, double precision, double precision, double precision, text);

create function public.check_in(
  p_user_id uuid, p_method public.checkin_method, p_branch_id uuid default null, p_verify jsonb default '{}',
  p_card_id uuid default null, p_note text default null, p_now timestamptz default now(),
  p_lat double precision default null, p_lng double precision default null,
  p_accuracy_m double precision default null, p_place text default null, p_shoot_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  b branches;
  sch schedules;
  sh shoots;
  open_branch text;
  local_ts timestamp := p_now at time zone 'Africa/Cairo';
  grace int := coalesce((select (value #>> '{}')::int from settings where key = 'lateness_grace_minutes'), 15);
  late boolean := false;
  dist double precision;
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
  if p_lat is null or p_lng is null or p_accuracy_m is null then
    raise exception 'location_required' using errcode = 'P0001';
  end if;
  if p_lat not between -90 and 90 or p_lng not between -180 and 180 or p_accuracy_m < 0 then
    raise exception 'invalid_location' using errcode = '22023';
  end if;

  if p_method = 'gps' then
    if p_accuracy_m > 200 then
      raise exception 'low_accuracy' using errcode = 'P0001';
    end if;
    select br.* into b from branches br
    where br.is_active and 'gps' = any (br.checkin_methods) and br.latitude is not null
      and (p_branch_id is null or br.id = p_branch_id)
    order by public._distance_m(p_lat, p_lng, br.latitude, br.longitude)
    limit 1;
    if b.id is null then
      raise exception 'method_not_allowed' using errcode = 'P0001';
    end if;
    dist := public._distance_m(p_lat, p_lng, b.latitude, b.longitude);
    if dist > public.branch_geofence_m(b) + least(p_accuracy_m, 100) then
      raise exception 'out_of_range:%', round(dist)::int using errcode = 'P0001';
    end if;
    p_branch_id := b.id;
  elsif p_method = 'wifi' then
    select * into b from branches where id = p_branch_id and is_active;
    if b.id is null or not (p_method = any (b.checkin_methods)) then
      raise exception 'method_not_allowed' using errcode = 'P0001';
    end if;
    if b.latitude is not null then
      dist := public._distance_m(p_lat, p_lng, b.latitude, b.longitude);
    end if;
  elsif p_method = 'field' then
    p_branch_id := null;
    if p_shoot_id is not null then
      select * into sh from shoots where id = p_shoot_id and archived_at is null;
      if sh.id is null then
        raise exception 'shoot_not_found' using errcode = 'P0001';
      end if;
      p_place := coalesce(nullif(trim(p_place), ''), sh.location_name);
    end if;
  elsif p_method = 'home' then
    if not public._has_wfh_today(p_user_id) then
      raise exception 'no_wfh_today' using errcode = 'P0001';
    end if;
    p_branch_id := null;
  else
    raise exception 'method_not_allowed' using errcode = 'P0001';
  end if;

  select * into sch from schedules where user_id = p_user_id;
  if sch.id is not null and extract(dow from local_ts)::int = any (sch.workdays) then
    late := local_ts::time > sch.start_time + make_interval(mins => grace);
  end if;

  insert into attendance_sessions (
    user_id, branch_id, method, checked_in_at, is_late, verify, field_card_id, note,
    checkin_lat, checkin_lng, checkin_accuracy_m, checkin_place, distance_m, shoot_id)
  values (
    p_user_id, p_branch_id, p_method, p_now, late, coalesce(p_verify, '{}'),
    case when p_method = 'field' then p_card_id end,
    nullif(trim(p_note), ''),
    p_lat, p_lng, round(p_accuracy_m)::int,
    case when p_method = 'field' then left(nullif(trim(p_place), ''), 120) end,
    round(dist)::int,
    case when p_method = 'field' then p_shoot_id end)
  returning id into new_id;

  if p_method = 'field' and p_shoot_id is not null then
    update profiles set presence = 'shoot', presence_updated_at = p_now where id = p_user_id;
  end if;
  return new_id;
end $$;

drop function public.check_out();
drop function public.check_out(double precision, double precision, double precision);

create function public.check_out(p_lat double precision, p_lng double precision, p_accuracy_m double precision)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_active_user() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_lat is null or p_lng is null or p_accuracy_m is null then
    raise exception 'location_required' using errcode = 'P0001';
  end if;
  if p_lat not between -90 and 90 or p_lng not between -180 and 180 or p_accuracy_m < 0 then
    raise exception 'invalid_location' using errcode = '22023';
  end if;
  update attendance_sessions set
    checked_out_at = now(),
    checkout_lat = p_lat,
    checkout_lng = p_lng,
    checkout_accuracy_m = round(p_accuracy_m)::int
  where user_id = auth.uid() and checked_out_at is null;
  if not found then
    raise exception 'not_checked_in' using errcode = 'P0001';
  end if;
end $$;

grant execute on function public.check_out(double precision, double precision, double precision) to authenticated;
grant execute on function public.branch_geofence_m(public.branches) to authenticated;
revoke execute on function
  public.check_in(uuid, public.checkin_method, uuid, jsonb, uuid, text, timestamptz, double precision, double precision, double precision, text, uuid),
  public.branch_location_confirm()
  from authenticated;
grant execute on function
  public.check_in(uuid, public.checkin_method, uuid, jsonb, uuid, text, timestamptz, double precision, double precision, double precision, text, uuid)
  to service_role;

revoke execute on all functions in schema public from public, anon;
