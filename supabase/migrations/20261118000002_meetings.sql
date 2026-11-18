-- W-02 Meetings: one-off meetings with colleagues and outside guests, fixed
-- daily, weekly and monthly meetings, rooms, agendas, notes and action items
-- that become cards. All writes to meetings go through functions.

create extension if not exists btree_gist with schema extensions;

create type public.meeting_status as enum ('scheduled', 'done', 'cancelled');
create type public.meeting_cadence as enum ('daily', 'weekly', 'monthly');
create type public.attendee_response as enum ('pending', 'accepted', 'declined', 'tentative');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.meeting_rooms (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.branches (id) on delete cascade,
  name_en text not null check (length(trim(name_en)) between 1 and 80),
  name_ar text not null check (length(trim(name_ar)) between 1 and 80),
  capacity int not null default 6 check (capacity between 1 and 500),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index meeting_rooms_branch_id_idx on public.meeting_rooms (branch_id);

create table public.meeting_series (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 120),
  title_ar text check (title_ar is null or length(trim(title_ar)) between 1 and 120),
  agenda text not null default '' check (length(agenda) <= 4000),
  cadence public.meeting_cadence not null,
  weekdays int[] not null default '{}',   -- 0 = Sunday ... 6 = Saturday; empty daily = every working day
  month_days int[] not null default '{}', -- 1 to 31; a day past the month's end becomes its last day
  start_time time not null,
  duration_minutes int not null default 30 check (duration_minutes between 5 and 480),
  room_id uuid references public.meeting_rooms (id) on delete set null,
  online_url text check (online_url is null or online_url ~* '^https?://'),
  owner_id uuid references public.profiles (id) on delete set null,
  audience text not null default 'custom' check (audience in ('marketing', 'custom')),
  starts_on date not null default public.cairo_today(),
  ends_on date,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meeting_series_weekdays check (weekdays <@ array[0, 1, 2, 3, 4, 6]),
  constraint meeting_series_month_days check (month_days <@ array[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31]),
  constraint meeting_series_rule check (
    (cadence = 'daily')
    or (cadence = 'weekly' and cardinality(weekdays) > 0)
    or (cadence = 'monthly' and cardinality(month_days) > 0)),
  constraint meeting_series_dates check (ends_on is null or ends_on >= starts_on)
);
create index meeting_series_room_id_idx on public.meeting_series (room_id);
create index meeting_series_owner_id_idx on public.meeting_series (owner_id);
create index meeting_series_created_by_idx on public.meeting_series (created_by);
create trigger meeting_series_updated_at before update on public.meeting_series
  for each row execute function public.set_updated_at();

create table public.meeting_series_members (
  series_id uuid not null references public.meeting_series (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (series_id, user_id)
);
create index meeting_series_members_user_id_idx on public.meeting_series_members (user_id);

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  series_id uuid references public.meeting_series (id) on delete set null,
  occurrence_on date,
  detached boolean not null default false, -- edited by hand: the series no longer rewrites it
  title text not null check (length(trim(title)) between 1 and 120),
  title_ar text,
  agenda text not null default '' check (length(agenda) <= 4000),
  notes text not null default '' check (length(notes) <= 20000),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  room_id uuid references public.meeting_rooms (id) on delete set null,
  location_text text check (location_text is null or length(location_text) <= 160),
  online_url text check (online_url is null or online_url ~* '^https?://'),
  is_private boolean not null default false,
  organizer_id uuid references public.profiles (id) on delete set null,
  status public.meeting_status not null default 'scheduled',
  reminded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meetings_time_order check (ends_at > starts_at),
  constraint meetings_max_length check (ends_at <= starts_at + interval '12 hours'),
  constraint meetings_occurrence_unique unique (series_id, occurrence_on),
  constraint meetings_room_free exclude using gist (
    room_id extensions.gist_uuid_ops with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (room_id is not null and status = 'scheduled')
);
create index meetings_starts_at_idx on public.meetings (starts_at);
create index meetings_organizer_id_idx on public.meetings (organizer_id);
create index meetings_room_id_idx on public.meetings (room_id);
create trigger meetings_updated_at before update on public.meetings
  for each row execute function public.set_updated_at();

create table public.meeting_attendees (
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  response public.attendee_response not null default 'pending',
  responded_at timestamptz,
  presence_set boolean not null default false, -- the meeting put this person "In a meeting"
  primary key (meeting_id, user_id)
);
create index meeting_attendees_user_id_idx on public.meeting_attendees (user_id, meeting_id);

-- People outside the company: invited by email with a calendar file.
create table public.meeting_guests (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  invited_at timestamptz,
  created_at timestamptz not null default now(),
  constraint meeting_guests_unique unique (meeting_id, email)
);

create table public.meeting_actions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200),
  assignee_id uuid references public.profiles (id) on delete set null,
  due_on date,
  done boolean not null default false,
  card_id uuid references public.cards (id) on delete set null,
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index meeting_actions_meeting_id_idx on public.meeting_actions (meeting_id);
create index meeting_actions_assignee_id_idx on public.meeting_actions (assignee_id) where not done;
create index meeting_actions_card_id_idx on public.meeting_actions (card_id);
create index meeting_actions_created_by_idx on public.meeting_actions (created_by);
create trigger meeting_actions_updated_at before update on public.meeting_actions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Access helpers
-- ---------------------------------------------------------------------------
create function public.in_meeting(p_meeting_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_active_user() and (
    exists (select 1 from meeting_attendees a where a.meeting_id = p_meeting_id and a.user_id = auth.uid())
    or exists (select 1 from meetings m where m.id = p_meeting_id and m.organizer_id = auth.uid())
  );
$$;

create function public.can_view_meeting(p_meeting_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_active_user() and (
    public.in_meeting(p_meeting_id)
    or public.has_role('super_admin')
    or exists (select 1 from meetings m where m.id = p_meeting_id and not m.is_private and public.is_marketing())
  );
$$;

create function public.can_edit_meeting(p_meeting_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_active_user() and (
    public.has_any_role('{super_admin,traffic_manager}')
    or exists (select 1 from meetings m where m.id = p_meeting_id and m.organizer_id = auth.uid())
  );
$$;

-- ---------------------------------------------------------------------------
-- Create or edit a meeting.
-- p: { title, agenda, starts_at, ends_at, room_id, location_text, online_url,
--      is_private, attendee_ids: [uuid], guests: [{ name, email }] }
-- ---------------------------------------------------------------------------
create function public.save_meeting(p_id uuid, p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  old_row meetings;
  new_id uuid;
  ids uuid[];
  u uuid;
  moved boolean := false;
  t text := left(trim(coalesce(p ->> 'title', '')), 120);
begin
  if not public.is_staff() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if t = '' then
    raise exception 'title_required' using errcode = '22023';
  end if;
  if (p ->> 'starts_at')::timestamptz < now() - interval '1 day' and p_id is null then
    raise exception 'in_the_past' using errcode = 'P0001';
  end if;
  ids := array(
    select distinct x::uuid from jsonb_array_elements_text(coalesce(p -> 'attendee_ids', '[]')) x
    join profiles pr on pr.id = x::uuid and pr.status = 'active');

  if p_id is null then
    insert into meetings (title, agenda, starts_at, ends_at, room_id, location_text, online_url, is_private, organizer_id)
    values (t, coalesce(p ->> 'agenda', ''), (p ->> 'starts_at')::timestamptz, (p ->> 'ends_at')::timestamptz,
      nullif(p ->> 'room_id', '')::uuid, nullif(trim(p ->> 'location_text'), ''), nullif(trim(p ->> 'online_url'), ''),
      coalesce((p ->> 'is_private')::boolean, false), me)
    returning id into new_id;
    insert into meeting_attendees (meeting_id, user_id, response, responded_at)
    values (new_id, me, 'accepted', now());
  else
    if not public.can_edit_meeting(p_id) then
      raise exception 'not allowed' using errcode = '42501';
    end if;
    select * into old_row from meetings where id = p_id for update;
    if old_row.id is null then
      raise exception 'not found' using errcode = 'P0002';
    end if;
    moved := old_row.starts_at is distinct from (p ->> 'starts_at')::timestamptz
      or old_row.ends_at is distinct from (p ->> 'ends_at')::timestamptz
      or old_row.room_id is distinct from nullif(p ->> 'room_id', '')::uuid;
    update meetings set
      title = t, agenda = coalesce(p ->> 'agenda', ''),
      starts_at = (p ->> 'starts_at')::timestamptz, ends_at = (p ->> 'ends_at')::timestamptz,
      room_id = nullif(p ->> 'room_id', '')::uuid,
      location_text = nullif(trim(p ->> 'location_text'), ''),
      online_url = nullif(trim(p ->> 'online_url'), ''),
      is_private = coalesce((p ->> 'is_private')::boolean, is_private),
      detached = true, reminded_at = case when moved then null else reminded_at end
    where id = p_id;
    new_id := p_id;
    delete from meeting_attendees a
    where a.meeting_id = p_id and a.user_id <> coalesce(old_row.organizer_id, me) and not (a.user_id = any (ids));
    if moved then
      update meeting_attendees set response = 'pending', responded_at = null
      where meeting_id = p_id and user_id <> coalesce(old_row.organizer_id, me);
      perform public.notify(a.user_id, 'meeting_updated', '/meetings/' || p_id,
        jsonb_build_object('meeting_id', p_id, 'title', t, 'starts_at', p ->> 'starts_at'))
      from meeting_attendees a where a.meeting_id = p_id and a.user_id <> me;
    end if;
  end if;

  foreach u in array ids loop
    insert into meeting_attendees (meeting_id, user_id) values (new_id, u) on conflict do nothing;
    if found and u <> me then
      perform public.notify(u, 'meeting_invite', '/meetings/' || new_id,
        jsonb_build_object('meeting_id', new_id, 'title', t, 'starts_at', p ->> 'starts_at', 'by', me));
    end if;
  end loop;

  if p ? 'guests' then
    delete from meeting_guests g where g.meeting_id = new_id and lower(g.email) not in (
      select lower(x ->> 'email') from jsonb_array_elements(p -> 'guests') x);
    insert into meeting_guests (meeting_id, name, email)
    select new_id, left(trim(x ->> 'name'), 120), lower(trim(x ->> 'email'))
    from jsonb_array_elements(p -> 'guests') x
    on conflict (meeting_id, email) do update set name = excluded.name;
  end if;
  return new_id;
end $$;

create function public.respond_meeting(p_id uuid, p_response public.attendee_response) returns void
language plpgsql security definer set search_path = public as $$
declare
  m meetings;
begin
  if p_response = 'pending' then
    raise exception 'invalid_response' using errcode = '22023';
  end if;
  update meeting_attendees set response = p_response, responded_at = now()
  where meeting_id = p_id and user_id = auth.uid();
  if not found or not public.is_active_user() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select * into m from meetings where id = p_id;
  if p_response = 'declined' and m.organizer_id is distinct from auth.uid() then
    perform public.notify(m.organizer_id, 'meeting_declined', '/meetings/' || p_id,
      jsonb_build_object('meeting_id', p_id, 'title', m.title, 'by', auth.uid()));
  end if;
end $$;

create function public.cancel_meeting(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  m meetings;
begin
  if not public.can_edit_meeting(p_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update meetings set status = 'cancelled', detached = true where id = p_id and status = 'scheduled' returning * into m;
  if m.id is null then return; end if;
  perform public.notify(a.user_id, 'meeting_cancelled', '/meetings/' || p_id,
    jsonb_build_object('meeting_id', p_id, 'title', m.title, 'starts_at', m.starts_at))
  from meeting_attendees a where a.meeting_id = p_id and a.user_id <> auth.uid();
end $$;

-- Everyone in the meeting can write the notes.
create function public.save_meeting_notes(p_id uuid, p_notes text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (public.in_meeting(p_id) or public.can_edit_meeting(p_id)) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update meetings set notes = coalesce(p_notes, '') where id = p_id;
end $$;

-- Busy times for scheduling. Shows when, never what.
create function public.meeting_busy(p_from timestamptz, p_to timestamptz, p_user_ids uuid[] default '{}')
returns table (kind text, id uuid, starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = public as $$
  select 'user', a.user_id, m.starts_at, m.ends_at
  from meetings m join meeting_attendees a on a.meeting_id = m.id
  where public.is_staff() and m.status = 'scheduled' and a.response <> 'declined'
    and a.user_id = any (p_user_ids)
    and m.starts_at < p_to and m.ends_at > p_from
  union all
  select 'room', m.room_id, m.starts_at, m.ends_at
  from meetings m
  where public.is_staff() and m.status = 'scheduled' and m.room_id is not null
    and m.starts_at < p_to and m.ends_at > p_from;
$$;

-- ---------------------------------------------------------------------------
-- Meeting actions become cards
-- ---------------------------------------------------------------------------
create function public.meeting_action_to_card(p_action_id uuid, p_board_id uuid default null) returns uuid
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
      perform public.notify(a.assignee_id, 'meeting_action_assigned', public.card_link(new_card),
        jsonb_build_object('card_id', new_card, 'title', a.title, 'meeting_id', m.id));
    end if;
  end if;
  update meeting_actions set card_id = new_card where id = a.id;
  return new_card;
end $$;

-- A finished card closes the action it came from.
create function public.meeting_action_from_card() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.archived_at is not null and old.archived_at is null then
    update meeting_actions set done = true where card_id = new.id and not done;
  end if;
  return new;
end $$;
create trigger cards_close_meeting_action after update of archived_at on public.cards
  for each row execute function public.meeting_action_from_card();

-- ---------------------------------------------------------------------------
-- Fixed meetings
-- ---------------------------------------------------------------------------
-- The dates a series falls on between two days.
create function public._series_dates(s public.meeting_series, p_from date, p_to date)
returns setof date
language plpgsql stable security definer set search_path = public as $$
declare
  d date;
  m date;
  md int;
  last_day date;
  first date := greatest(p_from, s.starts_on);
  final date := least(p_to, coalesce(s.ends_on, p_to));
begin
  if s.cadence in ('daily', 'weekly') then
    for d in select x::date from generate_series(first, final, interval '1 day') x loop
      if public._is_workday(d) and (cardinality(s.weekdays) = 0 or extract(dow from d)::int = any (s.weekdays)) then
        return next d;
      end if;
    end loop;
  else
    for m in select x::date from generate_series(date_trunc('month', first)::date, date_trunc('month', final)::date, interval '1 month') x loop
      last_day := (m + interval '1 month - 1 day')::date;
      for d in
        select distinct public._roll_back_workday(least(m + (md_val - 1), last_day))
        from unnest(s.month_days) md_val
      loop
        if d between first and final then
          return next d;
        end if;
      end loop;
    end loop;
  end if;
end $$;

-- Creates the occurrences of active series in a date range. Safe to repeat.
create function public._generate_meetings(p_from date, p_to date, p_series uuid default null) returns int
language plpgsql security definer set search_path = public as $$
declare
  s meeting_series;
  d date;
  mid uuid;
  starts timestamptz;
  n int := 0;
  taken boolean;
begin
  for s in select * from meeting_series where is_active and (p_series is null or id = p_series) loop
    for d in select * from public._series_dates(s, p_from, p_to) loop
      starts := (d + s.start_time) at time zone 'Africa/Cairo';
      if starts < now() then continue; end if;
      taken := s.room_id is not null and exists (
        select 1 from meetings x where x.room_id = s.room_id and x.status = 'scheduled'
          and x.starts_at < starts + make_interval(mins => s.duration_minutes) and x.ends_at > starts);
      insert into meetings (series_id, occurrence_on, title, title_ar, agenda, starts_at, ends_at, room_id, online_url, organizer_id)
      values (s.id, d, s.title, s.title_ar, s.agenda, starts, starts + make_interval(mins => s.duration_minutes),
        case when taken then null else s.room_id end, s.online_url, s.owner_id)
      on conflict (series_id, occurrence_on) do nothing
      returning id into mid;
      if mid is null then continue; end if;
      n := n + 1;
      insert into meeting_attendees (meeting_id, user_id, response, responded_at)
      select mid, x.user_id, 'accepted', now() from (
        select s.owner_id as user_id where s.owner_id is not null
        union
        select m.user_id from meeting_series_members m where m.series_id = s.id
        union
        select p.id from profiles p join departments dp on dp.id = p.department_id and dp.is_marketing
        where s.audience = 'marketing' and p.status = 'active'
      ) x
      join profiles active_p on active_p.id = x.user_id and active_p.status = 'active'
      on conflict do nothing;
      mid := null;
    end loop;
  end loop;
  return n;
end $$;

-- Create or edit a fixed meeting. Future untouched occurrences are rebuilt.
-- p: { title, title_ar, agenda, cadence, weekdays, month_days, start_time, duration_minutes,
--      room_id, online_url, owner_id, audience, member_ids, starts_on, ends_on, is_active }
create function public.save_meeting_series(p_id uuid, p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  sid uuid := p_id;
  wd int[] := array(select x::int from jsonb_array_elements_text(coalesce(p -> 'weekdays', '[]')) x);
  md int[] := array(select x::int from jsonb_array_elements_text(coalesce(p -> 'month_days', '[]')) x);
begin
  if not (public.has_any_role('{super_admin,traffic_manager}')) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if sid is null then
    insert into meeting_series (title, title_ar, agenda, cadence, weekdays, month_days, start_time, duration_minutes,
      room_id, online_url, owner_id, audience, starts_on, ends_on, is_active, created_by)
    values (trim(p ->> 'title'), nullif(trim(p ->> 'title_ar'), ''), coalesce(p ->> 'agenda', ''),
      (p ->> 'cadence')::meeting_cadence, wd, md, (p ->> 'start_time')::time, coalesce((p ->> 'duration_minutes')::int, 30),
      nullif(p ->> 'room_id', '')::uuid, nullif(trim(p ->> 'online_url'), ''), nullif(p ->> 'owner_id', '')::uuid,
      coalesce(p ->> 'audience', 'custom'), coalesce((p ->> 'starts_on')::date, public.cairo_today()),
      nullif(p ->> 'ends_on', '')::date, coalesce((p ->> 'is_active')::boolean, true), auth.uid())
    returning id into sid;
  else
    update meeting_series set
      title = trim(p ->> 'title'), title_ar = nullif(trim(p ->> 'title_ar'), ''), agenda = coalesce(p ->> 'agenda', ''),
      cadence = (p ->> 'cadence')::meeting_cadence, weekdays = wd, month_days = md,
      start_time = (p ->> 'start_time')::time, duration_minutes = coalesce((p ->> 'duration_minutes')::int, 30),
      room_id = nullif(p ->> 'room_id', '')::uuid, online_url = nullif(trim(p ->> 'online_url'), ''),
      owner_id = nullif(p ->> 'owner_id', '')::uuid, audience = coalesce(p ->> 'audience', 'custom'),
      starts_on = coalesce((p ->> 'starts_on')::date, starts_on), ends_on = nullif(p ->> 'ends_on', '')::date,
      is_active = coalesce((p ->> 'is_active')::boolean, is_active)
    where id = sid;
    if not found then
      raise exception 'not found' using errcode = 'P0002';
    end if;
    delete from meetings where series_id = sid and starts_at > now() and status = 'scheduled' and not detached;
  end if;
  delete from meeting_series_members where series_id = sid;
  insert into meeting_series_members (series_id, user_id)
  select sid, x::uuid from jsonb_array_elements_text(coalesce(p -> 'member_ids', '[]')) x
  join profiles pr on pr.id = x::uuid and pr.status = 'active'
  on conflict do nothing;
  perform public._generate_meetings(public.cairo_today(), public.cairo_today() + 35, sid);
  return sid;
end $$;

-- Stops a fixed meeting; meetings already held stay in history.
create function public.archive_meeting_series(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_any_role('{super_admin,traffic_manager}') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update meeting_series set is_active = false where id = p_id;
  delete from meetings where series_id = p_id and starts_at > now() and status = 'scheduled' and not detached;
end $$;

-- ---------------------------------------------------------------------------
-- Every 5 minutes: new occurrences, reminders, "In a meeting" status
-- ---------------------------------------------------------------------------
create function public.cron_meetings(p_now timestamptz default now()) returns int
language plpgsql security definer set search_path = public as $$
declare
  r record;
  n int := 0;
begin
  perform public._generate_meetings(public.cairo_today(p_now), public.cairo_today(p_now) + 35);

  for r in
    select id, title, starts_at from meetings
    where status = 'scheduled' and reminded_at is null
      and starts_at between p_now and p_now + interval '15 minutes'
    for update skip locked
  loop
    perform public.notify(a.user_id, 'meeting_soon', '/meetings/' || r.id,
      jsonb_build_object('meeting_id', r.id, 'title', r.title, 'starts_at', r.starts_at))
    from meeting_attendees a where a.meeting_id = r.id and a.response <> 'declined';
    update meetings set reminded_at = p_now where id = r.id;
    n := n + 1;
  end loop;

  -- Back to Available when no other meeting is still running for the person.
  update profiles p set presence = 'available', presence_updated_at = p_now
  from meeting_attendees a join meetings m on m.id = a.meeting_id
  where a.user_id = p.id and a.presence_set and p.presence = 'meeting'
    and (m.ends_at <= p_now or m.status <> 'scheduled')
    and not exists (
      select 1 from meeting_attendees a2 join meetings m2 on m2.id = a2.meeting_id
      where a2.user_id = p.id and a2.response <> 'declined' and m2.status = 'scheduled'
        and m2.starts_at <= p_now and m2.ends_at > p_now);
  update meeting_attendees a set presence_set = false
  from meetings m where m.id = a.meeting_id and a.presence_set and (m.ends_at <= p_now or m.status <> 'scheduled');

  -- In a meeting, for people who are checked in and have not chosen another status.
  with live as (
    select a.meeting_id, a.user_id
    from meeting_attendees a
    join meetings m on m.id = a.meeting_id
    join profiles p on p.id = a.user_id
    where m.status = 'scheduled' and m.starts_at <= p_now and m.ends_at > p_now
      and a.response = 'accepted' and p.presence in ('available', 'focus')
      and exists (select 1 from attendance_sessions s where s.user_id = a.user_id and s.checked_out_at is null)
  ), marked as (
    update meeting_attendees a set presence_set = true
    from live where a.meeting_id = live.meeting_id and a.user_id = live.user_id
    returning a.user_id
  )
  update profiles p set presence = 'meeting', presence_updated_at = p_now
  where p.id in (select user_id from marked);

  update meetings set status = 'done' where status = 'scheduled' and ends_at <= p_now;
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.meeting_rooms enable row level security;
alter table public.meeting_series enable row level security;
alter table public.meeting_series_members enable row level security;
alter table public.meetings enable row level security;
alter table public.meeting_attendees enable row level security;
alter table public.meeting_guests enable row level security;
alter table public.meeting_actions enable row level security;

revoke insert, update, delete on public.meeting_series, public.meeting_series_members, public.meetings,
  public.meeting_attendees, public.meeting_guests from authenticated;
revoke update on public.meeting_actions from authenticated;
grant update (title, assignee_id, due_on, done) on public.meeting_actions to authenticated;

create policy meeting_rooms_select on public.meeting_rooms for select to authenticated
  using ((select public.is_active_user()));
create policy meeting_rooms_insert on public.meeting_rooms for insert to authenticated
  with check ((select public.has_any_role('{super_admin,traffic_manager}')));
create policy meeting_rooms_update on public.meeting_rooms for update to authenticated
  using ((select public.has_any_role('{super_admin,traffic_manager}')))
  with check ((select public.has_any_role('{super_admin,traffic_manager}')));
create policy meeting_rooms_delete on public.meeting_rooms for delete to authenticated
  using ((select public.has_any_role('{super_admin,traffic_manager}')));

create policy meeting_series_select on public.meeting_series for select to authenticated
  using ((select public.is_staff()));
create policy meeting_series_members_select on public.meeting_series_members for select to authenticated
  using ((select public.is_staff()));
create policy meetings_select on public.meetings for select to authenticated
  using (public.can_view_meeting(id));
create policy meeting_attendees_select on public.meeting_attendees for select to authenticated
  using (public.can_view_meeting(meeting_id));
create policy meeting_guests_select on public.meeting_guests for select to authenticated
  using (public.in_meeting(meeting_id) or public.can_edit_meeting(meeting_id));

create policy meeting_actions_select on public.meeting_actions for select to authenticated
  using (public.can_view_meeting(meeting_id));
create policy meeting_actions_insert on public.meeting_actions for insert to authenticated
  with check (created_by = (select auth.uid()) and card_id is null
    and (public.in_meeting(meeting_id) or public.can_edit_meeting(meeting_id)));
create policy meeting_actions_update on public.meeting_actions for update to authenticated
  using (public.in_meeting(meeting_id) or public.can_edit_meeting(meeting_id))
  with check (public.in_meeting(meeting_id) or public.can_edit_meeting(meeting_id));
create policy meeting_actions_delete on public.meeting_actions for delete to authenticated
  using (public.in_meeting(meeting_id) or public.can_edit_meeting(meeting_id));

alter publication supabase_realtime add table public.meetings, public.meeting_attendees, public.meeting_actions;

-- ---------------------------------------------------------------------------
-- Default fixed meetings, from the monthly rhythm. All editable in Meetings.
-- ---------------------------------------------------------------------------
insert into public.meeting_series (title, title_ar, agenda, cadence, weekdays, month_days, start_time, duration_minutes, audience, starts_on) values
  ('Daily stand-up', 'الاجتماع اليومي السريع', 'What was done, what is next, what is blocked.', 'daily', '{}', '{}', '10:15', 15, 'marketing', '2026-11-21'),
  ('Spending gate', 'بوابة الإنفاق', 'Review paid spend against plan and decide what continues.', 'weekly', '{0,3}', '{}', '11:00', 30, 'custom', '2026-11-21'),
  ('Weekly traffic and creative sync', 'اجتماع التنسيق والإبداع الأسبوعي', 'Production status, priorities and risks for the week.', 'weekly', '{0}', '{}', '12:00', 45, 'marketing', '2026-11-21'),
  ('Gate 5: content plan review', 'بوابة 5: مراجعة خطة المحتوى', 'Next month''s content plan delivered and reviewed.', 'monthly', '{}', '{5}', '12:00', 60, 'marketing', '2026-11-21'),
  ('MQL review', 'مراجعة العملاء المؤهلين', 'Lead quality and volume against target.', 'monthly', '{}', '{10,20,30}', '13:00', 45, 'custom', '2026-11-21'),
  ('Gate 25: final sign-off', 'بوابة 25: الاعتماد النهائي', 'Everything approved and scheduled for next month.', 'monthly', '{}', '{25}', '12:00', 60, 'marketing', '2026-11-21');

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
grant execute on function
  public.in_meeting(uuid), public.can_view_meeting(uuid), public.can_edit_meeting(uuid),
  public.save_meeting(uuid, jsonb), public.respond_meeting(uuid, public.attendee_response),
  public.cancel_meeting(uuid), public.save_meeting_notes(uuid, text),
  public.meeting_busy(timestamptz, timestamptz, uuid[]), public.meeting_action_to_card(uuid, uuid),
  public.save_meeting_series(uuid, jsonb), public.archive_meeting_series(uuid)
  to authenticated;
revoke execute on function
  public._series_dates(public.meeting_series, date, date), public._generate_meetings(date, date, uuid),
  public.cron_meetings(timestamptz), public.meeting_action_from_card()
  from authenticated;
grant execute on function public.cron_meetings(timestamptz) to service_role;

revoke execute on all functions in schema public from public, anon;
