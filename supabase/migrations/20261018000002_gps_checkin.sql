-- M-02 Location check-in replaces the QR kiosk.
-- * branches get coordinates and a geofence radius (super_admin edits them).
-- * attendance_sessions record where the person was at check-in and check-out.
--   Row policies are unchanged: a session (and so its coordinates) is readable
--   only by the person, their team lead, hr, super_admin and leadership.
--   Everyone else sees presence through who_is_in(), which never returns
--   coordinates (only branch, method and the optional field place name).
-- * check_in: 'gps' needs a location inside a branch geofence, 'field' needs a
--   location, 'qr' is refused for new check-ins (kept in the enum for history).
-- * branch_secrets (QR HMAC secret and kiosk key hash) is dropped.

-- ---------------------------------------------------------------------------
-- Branches
-- ---------------------------------------------------------------------------
alter table public.branches
  add column latitude double precision,
  add column longitude double precision,
  add column geofence_radius_m integer not null default 150,
  add constraint branches_latitude_range check (latitude is null or latitude between -90 and 90),
  add constraint branches_longitude_range check (longitude is null or longitude between -180 and 180),
  add constraint branches_coordinates_pair check ((latitude is null) = (longitude is null)),
  add constraint branches_geofence_radius_range check (geofence_radius_m between 25 and 2000);

update public.branches
  set checkin_methods = '{gps,wifi,field,home}'
  where 'qr' = any (checkin_methods) or checkin_methods = '{wifi}';
alter table public.branches alter column checkin_methods set default '{gps,wifi,field,home}'; -- DECISION: D-03
alter table public.branches add constraint branches_no_qr check (not ('qr' = any (checkin_methods)));

-- ---------------------------------------------------------------------------
-- Attendance: recorded location
-- ---------------------------------------------------------------------------
alter table public.attendance_sessions
  add column checkin_lat double precision,
  add column checkin_lng double precision,
  add column checkin_accuracy_m integer,
  add column checkin_place text,
  add column checkout_lat double precision,
  add column checkout_lng double precision,
  add column checkout_accuracy_m integer,
  add column distance_m integer,
  add constraint attendance_checkin_location check (
    (checkin_lat is null) = (checkin_lng is null)
    and (checkin_lat is null or (checkin_lat between -90 and 90 and checkin_lng between -180 and 180))
    and (checkin_accuracy_m is null or checkin_accuracy_m >= 0)),
  add constraint attendance_checkout_location check (
    (checkout_lat is null) = (checkout_lng is null)
    and (checkout_lat is null or (checkout_lat between -90 and 90 and checkout_lng between -180 and 180))
    and (checkout_accuracy_m is null or checkout_accuracy_m >= 0)),
  add constraint attendance_checkin_place_length check (checkin_place is null or length(checkin_place) <= 120),
  add constraint attendance_distance_positive check (distance_m is null or distance_m >= 0);

-- ---------------------------------------------------------------------------
-- Distance (haversine, metres). Same formula as src/lib/geo.ts.
-- ---------------------------------------------------------------------------
create function public._distance_m(p_lat1 double precision, p_lng1 double precision, p_lat2 double precision, p_lng2 double precision)
returns double precision
language sql immutable set search_path = public as $$
  select 2 * 6371008.8 * asin(least(1, sqrt(
    power(sin(radians(p_lat2 - p_lat1) / 2), 2)
    + cos(radians(p_lat1)) * cos(radians(p_lat2)) * power(sin(radians(p_lng2 - p_lng1) / 2), 2)
  )));
$$;

-- ---------------------------------------------------------------------------
-- Check-in (service role only; the server action validated the input first)
-- ---------------------------------------------------------------------------
drop function public.check_in(uuid, public.checkin_method, uuid, jsonb, uuid, text, timestamptz);

create function public.check_in(
  p_user_id uuid, p_method public.checkin_method, p_branch_id uuid default null, p_verify jsonb default '{}',
  p_card_id uuid default null, p_note text default null, p_now timestamptz default now(),
  p_lat double precision default null, p_lng double precision default null,
  p_accuracy_m double precision default null, p_place text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  b branches;
  sch schedules;
  open_branch text;
  local_ts timestamp := p_now at time zone 'Africa/Cairo';
  grace int := coalesce((select (value #>> '{}')::int from settings where key = 'lateness_grace_minutes'), 15);
  late boolean := false;
  has_loc boolean := p_lat is not null and p_lng is not null and p_accuracy_m is not null;
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
  if has_loc and (p_lat not between -90 and 90 or p_lng not between -180 and 180 or p_accuracy_m < 0) then
    raise exception 'invalid_location' using errcode = '22023';
  end if;

  if p_method = 'gps' then
    if not has_loc then
      raise exception 'location_required' using errcode = 'P0001';
    end if;
    if p_accuracy_m > 200 then
      raise exception 'low_accuracy' using errcode = 'P0001';
    end if;
    -- The given branch, or the nearest active branch that takes gps check-ins.
    select br.* into b from branches br
    where br.is_active and 'gps' = any (br.checkin_methods) and br.latitude is not null
      and (p_branch_id is null or br.id = p_branch_id)
    order by public._distance_m(p_lat, p_lng, br.latitude, br.longitude)
    limit 1;
    if b.id is null then
      raise exception 'method_not_allowed' using errcode = 'P0001';
    end if;
    dist := public._distance_m(p_lat, p_lng, b.latitude, b.longitude);
    if dist > b.geofence_radius_m + least(p_accuracy_m, 100) then
      raise exception 'out_of_range:%', round(dist)::int using errcode = 'P0001';
    end if;
    p_branch_id := b.id;
  elsif p_method = 'wifi' then
    select * into b from branches where id = p_branch_id and is_active;
    if b.id is null or not (p_method = any (b.checkin_methods)) then
      raise exception 'method_not_allowed' using errcode = 'P0001';
    end if;
    -- Location is optional here (best effort, for the record).
    if has_loc and b.latitude is not null then
      dist := public._distance_m(p_lat, p_lng, b.latitude, b.longitude);
    end if;
  elsif p_method = 'field' then
    if not has_loc then
      raise exception 'location_required' using errcode = 'P0001';
    end if;
    p_branch_id := null;
  elsif p_method = 'home' then
    if not public._has_wfh_today(p_user_id) then
      raise exception 'no_wfh_today' using errcode = 'P0001';
    end if;
    p_branch_id := null;
    has_loc := false; -- never record a home location
  else
    -- 'qr' (retired with the kiosk) and 'manual' (HR edits only).
    raise exception 'method_not_allowed' using errcode = 'P0001';
  end if;

  -- Late: on a scheduled workday, after start + grace (Cairo time).
  select * into sch from schedules where user_id = p_user_id;
  if sch.id is not null and extract(dow from local_ts)::int = any (sch.workdays) then
    late := local_ts::time > sch.start_time + make_interval(mins => grace);
  end if;

  insert into attendance_sessions (
    user_id, branch_id, method, checked_in_at, is_late, verify, field_card_id, note,
    checkin_lat, checkin_lng, checkin_accuracy_m, checkin_place, distance_m)
  values (
    p_user_id, p_branch_id, p_method, p_now, late, coalesce(p_verify, '{}'),
    case when p_method = 'field' then p_card_id end,
    nullif(trim(p_note), ''),
    case when has_loc then p_lat end, case when has_loc then p_lng end,
    case when has_loc then round(p_accuracy_m)::int end,
    case when p_method = 'field' then left(nullif(trim(p_place), ''), 120) end,
    round(dist)::int)
  returning id into new_id;
  return new_id;
end $$;

-- Check-out with the location where it happened (best effort: null is fine).
-- check_out() without arguments keeps working.
create function public.check_out(p_lat double precision, p_lng double precision, p_accuracy_m double precision)
returns void
language plpgsql security definer set search_path = public as $$
declare
  has_loc boolean := p_lat is not null and p_lng is not null;
begin
  if not public.is_active_user() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if has_loc and (p_lat not between -90 and 90 or p_lng not between -180 and 180 or coalesce(p_accuracy_m, 0) < 0) then
    raise exception 'invalid_location' using errcode = '22023';
  end if;
  update attendance_sessions set
    checked_out_at = now(),
    checkout_lat = case when has_loc and method <> 'home' then p_lat end,
    checkout_lng = case when has_loc and method <> 'home' then p_lng end,
    checkout_accuracy_m = case when has_loc and method <> 'home' then round(p_accuracy_m)::int end
  where user_id = auth.uid() and checked_out_at is null;
  if not found then
    raise exception 'not_checked_in' using errcode = 'P0001';
  end if;
end $$;

-- who_is_in now also returns the field place name (never coordinates).
drop function public.who_is_in(uuid);
create function public.who_is_in(p_branch_id uuid default null)
returns table (user_id uuid, branch_id uuid, method public.checkin_method, checked_in_at timestamptz,
  field_card_id uuid, note text, checkin_place text)
language sql stable security definer set search_path = public as $$
  select s.user_id, s.branch_id, s.method, s.checked_in_at, s.field_card_id, s.note, s.checkin_place
  from attendance_sessions s
  join profiles p on p.id = s.user_id and p.status = 'active'
  where s.checked_out_at is null
    and public.is_marketing()
    and (p_branch_id is null or s.branch_id = p_branch_id);
$$;

-- ---------------------------------------------------------------------------
-- QR kiosk removal
-- ---------------------------------------------------------------------------
drop function public.admin_rotate_qr_secret(uuid);
drop function public.admin_set_kiosk_key_hash(uuid, text);
drop table public.branch_secrets;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
grant execute on function public.who_is_in(uuid),
  public.check_out(double precision, double precision, double precision) to authenticated;
revoke execute on function
  public.check_in(uuid, public.checkin_method, uuid, jsonb, uuid, text, timestamptz, double precision, double precision, double precision, text),
  public._distance_m(double precision, double precision, double precision, double precision)
  from authenticated;
grant execute on function
  public.check_in(uuid, public.checkin_method, uuid, jsonb, uuid, text, timestamptz, double precision, double precision, double precision, text)
  to service_role;

revoke execute on all functions in schema public from public, anon;
