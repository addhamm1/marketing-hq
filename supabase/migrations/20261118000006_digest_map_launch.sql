-- W-06 Phone notifications and daily digest, tap-to-move and interactions on the
-- map, and the daily job that runs the workflow reminders.

-- ---------------------------------------------------------------------------
-- Push subscriptions and notification preferences
-- ---------------------------------------------------------------------------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://' and length(endpoint) <= 1000),
  p256dh text not null check (length(p256dh) <= 200),
  auth text not null check (length(auth) <= 100),
  user_agent text check (user_agent is null or length(user_agent) <= 300),
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

create table public.notification_preferences (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  digest_email boolean not null default true,
  push_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
create trigger notification_preferences_updated_at before update on public.notification_preferences
  for each row execute function public.set_updated_at();

alter table public.notifications add column pushed_at timestamptz;
create index notifications_push_queue_idx on public.notifications (created_at) where pushed_at is null;

alter table public.push_subscriptions enable row level security;
alter table public.notification_preferences enable row level security;

revoke update on public.push_subscriptions from authenticated;

create policy push_subscriptions_select on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy push_subscriptions_insert on public.push_subscriptions for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_active_user()));
create policy push_subscriptions_delete on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));

create policy notification_preferences_select on public.notification_preferences for select to authenticated
  using (user_id = (select auth.uid()));
create policy notification_preferences_insert on public.notification_preferences for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_active_user()));
create policy notification_preferences_update on public.notification_preferences for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Service role: claim a once-only key from server code (daily digest).
create function public.claim_once(p_key text) returns boolean
language sql security definer set search_path = public as $$
  select public._once(p_key);
$$;

insert into public.settings (key, value) values ('digest_hour', '8') on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Map: tap to move and interact. Events are sent by these functions, never by browsers.
-- ---------------------------------------------------------------------------
create table public.map_positions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  tile_x int not null check (tile_x between 0 and 500),
  tile_y int not null check (tile_y between 0 and 500),
  updated_at timestamptz not null default now()
);
create index map_positions_branch_id_idx on public.map_positions (branch_id);

create table public.map_interactions (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('wave', 'high_five', 'coffee', 'chat', 'dance', 'clap')),
  created_at timestamptz not null default now()
);
create index map_interactions_from_idx on public.map_interactions (from_id, created_at desc);
create index map_interactions_to_id_idx on public.map_interactions (to_id, created_at desc);

alter table public.map_positions enable row level security;
alter table public.map_interactions enable row level security;
revoke insert, update, delete on public.map_positions, public.map_interactions from authenticated;

create policy map_positions_select on public.map_positions for select to authenticated
  using ((select public.is_marketing()));
create policy map_interactions_select on public.map_interactions for select to authenticated
  using (from_id = (select auth.uid()) or to_id = (select auth.uid()));

-- Moves the caller's character on the branch they are checked in to.
create function public.map_move(p_branch_id uuid, p_x int, p_y int) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  last_at timestamptz;
begin
  if not public.is_marketing() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_x not between 0 and 500 or p_y not between 0 and 500 then
    raise exception 'invalid_position' using errcode = '22023';
  end if;
  if not exists (select 1 from attendance_sessions s
                 where s.user_id = me and s.branch_id = p_branch_id and s.checked_out_at is null) then
    raise exception 'not_checked_in' using errcode = 'P0001';
  end if;
  select updated_at into last_at from map_positions where user_id = me;
  if last_at is not null and last_at > now() - interval '400 milliseconds' then
    return false;
  end if;
  insert into map_positions (user_id, branch_id, tile_x, tile_y) values (me, p_branch_id, p_x, p_y)
  on conflict (user_id) do update set branch_id = excluded.branch_id, tile_x = excluded.tile_x,
    tile_y = excluded.tile_y, updated_at = now();
  perform realtime.send(jsonb_build_object('user_id', me, 'x', p_x, 'y', p_y), 'move', 'branch:' || p_branch_id, true);
  return true;
end $$;

-- Wave, high five, coffee or chat invitation, or an emote when p_to is null.
create function public.map_interact(p_to uuid, p_kind text) returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  mine attendance_sessions;
  theirs attendance_sessions;
  sender text;
begin
  if not public.is_marketing() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_kind not in ('wave', 'high_five', 'coffee', 'chat', 'dance', 'clap') then
    raise exception 'invalid_kind' using errcode = '22023';
  end if;
  if p_to = me then
    raise exception 'invalid_target' using errcode = '22023';
  end if;
  select * into mine from attendance_sessions where user_id = me and checked_out_at is null;
  if mine.id is null then
    raise exception 'not_checked_in' using errcode = 'P0001';
  end if;
  if (select count(*) from map_interactions where from_id = me and created_at > now() - interval '10 seconds') >= 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  if p_to is not null then
    select * into theirs from attendance_sessions where user_id = p_to and checked_out_at is null;
    if theirs.id is null or public._branch_topic(theirs.branch_id, theirs.method) <> public._branch_topic(mine.branch_id, mine.method) then
      raise exception 'not_here' using errcode = 'P0001';
    end if;
  end if;
  insert into map_interactions (from_id, to_id, kind) values (me, p_to, p_kind);
  perform realtime.send(jsonb_build_object('from', me, 'to', p_to, 'kind', p_kind), 'interact',
    public._branch_topic(mine.branch_id, mine.method), true);
  if p_to is not null and p_kind in ('coffee', 'chat') then
    select coalesce(nullif(display_name, ''), full_name) into sender from profiles where id = me;
    perform public.notify(p_to, 'map_invite', '/map', jsonb_build_object('kind', p_kind, 'title', sender, 'by', me));
  end if;
end $$;

-- A person who checks out leaves the floor.
create function public.map_position_clear() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.checked_out_at is not null and old.checked_out_at is null then
    delete from map_positions where user_id = new.user_id;
  end if;
  return new;
end $$;
create trigger attendance_clear_map_position after update of checked_out_at on public.attendance_sessions
  for each row execute function public.map_position_clear();

-- ---------------------------------------------------------------------------
-- Birthdays and anniversaries, told once in the morning
-- ---------------------------------------------------------------------------
create function public.cron_celebrations(p_now timestamptz default now()) returns int
language plpgsql security definer set search_path = public as $$
declare
  today date := public.cairo_today(p_now);
  r record;
  n int := 0;
begin
  for r in
    select p.id, coalesce(nullif(p.display_name, ''), p.full_name) as name, p.department_id, x.kind, x.years
    from profiles p
    cross join lateral (
      select 'birthday' as kind, null::int as years
      where p.birth_month is not null and (
        (p.birth_month = extract(month from today) and p.birth_day = extract(day from today))
        or (p.birth_month = 2 and p.birth_day = 29 and extract(month from today) = 2 and extract(day from today) = 28
            and extract(day from (today + 1)) = 1))
      union all
      select 'anniversary', (extract(year from today) - extract(year from p.joined_on))::int
      where p.joined_on is not null and extract(month from p.joined_on) = extract(month from today)
        and extract(day from p.joined_on) = extract(day from today)
        and extract(year from today) > extract(year from p.joined_on)
    ) x
    where p.status = 'active' and p.celebrate
  loop
    if public._once('celebrate:' || r.kind || ':' || r.id || ':' || today) then
      perform public.notify(r.id, case r.kind when 'birthday' then 'happy_birthday' else 'happy_anniversary' end,
        '/celebrations', jsonb_build_object('title', r.name, 'years', r.years));
      perform public.notify(c.id, case r.kind when 'birthday' then 'celebration_birthday' else 'celebration_anniversary' end,
        '/celebrations', jsonb_build_object('title', r.name, 'user_id', r.id, 'years', r.years))
      from profiles c
      where c.status = 'active' and c.id <> r.id and c.department_id is not distinct from r.department_id;
      n := n + 1;
    end if;
  end loop;
  delete from map_interactions where created_at < p_now - interval '30 days';
  delete from cron_log where at < p_now - interval '120 days';
  return n;
end $$;

-- Everything the daily job runs.
create function public.cron_workflow_daily(p_now timestamptz default now()) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  return jsonb_build_object(
    'gates', public.cron_gates(p_now),
    'shoots', public.cron_shoots(p_now),
    'strategic', public.cron_strategic_reminders(p_now),
    'celebrations', public.cron_celebrations(p_now));
end $$;

-- Sets default owners once the staff accounts exist. Safe to repeat; never
-- replaces an owner someone has chosen. Server only.
create function public.workflow_assign_default_owners() returns void
language plpgsql security definer set search_path = public as $$
declare
  roaa uuid := (select id from profiles where email = 'roaa@e-spaces.co');
  ibrahem uuid := (select id from profiles where email = 'ibrahem@e-spaces.co');
  afify uuid := (select id from profiles where email = 'omar.afify@e-spaces.co');
  adham uuid := (select id from profiles where email = 'adham@e-spaces.co');
begin
  update gate_templates t set owner_id = case
      when tr.key = 'performance' or tr.key = 'mql-review' then afify
      when t.name_en = 'Plan drafted' or t.name_en like 'Gate 5%' then ibrahem
      when t.name_en = 'Final approvals' then adham
      else roaa end
  from gate_tracks tr
  where tr.id = t.track_id and t.owner_id is null;

  update gate_items i set owner_id = t.owner_id
  from gate_templates t where t.id = i.template_id and i.owner_id is null;

  update meeting_series set owner_id = case
      when title in ('Spending gate', 'MQL review') then afify
      when title = 'Daily stand-up' then roaa
      when title like 'Weekly traffic%' then roaa
      else adham end
  where owner_id is null;

  update meetings m set organizer_id = s.owner_id
  from meeting_series s where s.id = m.series_id and m.organizer_id is null;

  insert into meeting_series_members (series_id, user_id)
  select s.id, u.id from meeting_series s
  join profiles u on u.email in ('adham@e-spaces.co', 'omar.afify@e-spaces.co', 'omar.mansy@e-spaces.co', 'ahmed.gad@e-spaces.co')
  where s.title in ('Spending gate', 'MQL review')
  on conflict do nothing;
end $$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
grant execute on function public.map_move(uuid, int, int), public.map_interact(uuid, text) to authenticated;
revoke execute on function public.claim_once(text), public.map_position_clear(),
  public.cron_celebrations(timestamptz), public.cron_workflow_daily(timestamptz),
  public.workflow_assign_default_owners() from authenticated;
grant execute on function public.claim_once(text), public.cron_celebrations(timestamptz),
  public.cron_workflow_daily(timestamptz), public.workflow_assign_default_owners() to service_role;

revoke execute on all functions in schema public from public, anon;
