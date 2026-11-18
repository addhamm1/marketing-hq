-- W-03 Monthly gates: how a month runs, day 1 to 30.
-- Tracks and templates hold the standing rhythm; gate_items are the dated
-- copies for one month. Editing a template rebuilds items nobody has touched.

create type public.gate_kind as enum ('phase', 'gate', 'checkpoint', 'recurring');
create type public.gate_status as enum ('not_started', 'in_progress', 'done', 'at_risk', 'missed', 'skipped');

create table public.gate_tracks (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z0-9-]+$'),
  name_en text not null check (length(trim(name_en)) between 1 and 80),
  name_ar text not null check (length(trim(name_ar)) between 1 and 80),
  subtitle_en text not null default '',
  subtitle_ar text not null default '',
  position int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.gate_templates (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.gate_tracks (id) on delete cascade,
  kind public.gate_kind not null,
  name_en text not null check (length(trim(name_en)) between 1 and 160),
  name_ar text not null check (length(trim(name_ar)) between 1 and 160),
  start_day int not null check (start_day between 1 and 31),
  end_day int not null check (end_day between 1 and 31),
  weekdays int[] not null default '{}', -- recurring only: 0 = Sunday ... 6 = Saturday
  owner_id uuid references public.profiles (id) on delete set null,
  position int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gate_templates_days check (end_day >= start_day),
  constraint gate_templates_weekdays check (weekdays <@ array[0, 1, 2, 3, 4, 6]),
  constraint gate_templates_recurring check (kind <> 'recurring' or cardinality(weekdays) > 0)
);
create index gate_templates_track_id_idx on public.gate_templates (track_id, position);
create index gate_templates_owner_id_idx on public.gate_templates (owner_id);
create trigger gate_templates_updated_at before update on public.gate_templates
  for each row execute function public.set_updated_at();

create table public.gate_items (
  id uuid primary key default gen_random_uuid(),
  month date not null check (extract(day from month) = 1),
  track_id uuid not null references public.gate_tracks (id) on delete cascade,
  template_id uuid references public.gate_templates (id) on delete set null,
  kind public.gate_kind not null,
  name_en text not null check (length(trim(name_en)) between 1 and 160),
  name_ar text not null check (length(trim(name_ar)) between 1 and 160),
  starts_on date not null,
  due_on date not null,
  owner_id uuid references public.profiles (id) on delete set null,
  status public.gate_status not null default 'not_started',
  note text not null default '' check (length(note) <= 2000),
  customised boolean not null default false,
  position int not null default 0,
  completed_at timestamptz,
  completed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gate_items_dates check (due_on >= starts_on),
  constraint gate_items_occurrence unique (template_id, month, due_on)
);
create index gate_items_month_idx on public.gate_items (month, track_id, position);
create index gate_items_track_id_idx on public.gate_items (track_id);
create index gate_items_owner_id_idx on public.gate_items (owner_id, due_on);
create index gate_items_due_on_idx on public.gate_items (due_on) where status not in ('done', 'skipped');
create index gate_items_completed_by_idx on public.gate_items (completed_by);
create trigger gate_items_updated_at before update on public.gate_items
  for each row execute function public.set_updated_at();

create table public.gate_item_cards (
  item_id uuid not null references public.gate_items (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  primary key (item_id, card_id)
);
create index gate_item_cards_card_id_idx on public.gate_item_cards (card_id);

-- ---------------------------------------------------------------------------
-- Access
-- ---------------------------------------------------------------------------
create function public.can_manage_gates() returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_any_role('{super_admin,traffic_manager}');
$$;

create function public.can_update_gate(p_item_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.can_manage_gates() or exists (
    select 1 from gate_items i where i.id = p_item_id and i.owner_id = auth.uid() and public.is_active_user());
$$;

-- ---------------------------------------------------------------------------
-- Building a month
-- ---------------------------------------------------------------------------
-- Copies active templates into a month. Safe to repeat.
create function public._build_gate_month(p_month date) returns int
language plpgsql security definer set search_path = public as $$
declare
  m date := date_trunc('month', p_month)::date;
  last_day date := (date_trunc('month', p_month) + interval '1 month - 1 day')::date;
  t gate_templates;
  d date;
  s date;
  e date;
  n int := 0;
  c int;
begin
  for t in select tp.* from gate_templates tp join gate_tracks tr on tr.id = tp.track_id
           where tp.is_active and tr.is_active loop
    s := least(m + (t.start_day - 1), last_day);
    e := least(m + (t.end_day - 1), last_day);
    if t.kind = 'recurring' then
      for d in select x::date from generate_series(s, e, interval '1 day') x loop
        if extract(dow from d)::int = any (t.weekdays) and public._is_workday(d) then
          insert into gate_items (month, track_id, template_id, kind, name_en, name_ar, starts_on, due_on, owner_id, position)
          values (m, t.track_id, t.id, t.kind, t.name_en, t.name_ar, d, d, t.owner_id, t.position)
          on conflict (template_id, month, due_on) do nothing;
          get diagnostics c = row_count;
          n := n + c;
        end if;
      end loop;
    else
      -- A gate that lands on a day off moves to the working day before it.
      if t.kind in ('gate', 'checkpoint') then
        e := public._roll_back_workday(e);
        s := least(s, e);
      end if;
      insert into gate_items (month, track_id, template_id, kind, name_en, name_ar, starts_on, due_on, owner_id, position)
      values (m, t.track_id, t.id, t.kind, t.name_en, t.name_ar, s, e, t.owner_id, t.position)
      on conflict (template_id, month, due_on) do nothing;
      get diagnostics c = row_count;
      n := n + c;
    end if;
  end loop;
  return n;
end $$;

-- Opens a month in the app: staff may build the months around today.
create function public.ensure_gate_month(p_month date) returns int
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_month < (date_trunc('month', public.cairo_today()) - interval '12 months')::date
     or p_month > (date_trunc('month', public.cairo_today()) + interval '12 months')::date then
    raise exception 'month_out_of_range' using errcode = '22023';
  end if;
  return public._build_gate_month(p_month);
end $$;

-- Rebuilds this month and later months from the templates, keeping anything
-- someone has started, finished or edited.
create function public._sync_gate_months() returns void
language plpgsql security definer set search_path = public as $$
declare
  this_month date := date_trunc('month', public.cairo_today())::date;
  m date;
begin
  for m in select distinct month from gate_items where month >= this_month loop
    delete from gate_items
    where month = m and template_id is not null and not customised and status = 'not_started'
      and not exists (select 1 from gate_item_cards c where c.item_id = gate_items.id);
    perform public._build_gate_month(m);
  end loop;
end $$;

-- p: { track_id, kind, name_en, name_ar, start_day, end_day, weekdays, owner_id, position, is_active }
create function public.save_gate_template(p_id uuid, p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  tid uuid := p_id;
  wd int[] := array(select x::int from jsonb_array_elements_text(coalesce(p -> 'weekdays', '[]')) x);
begin
  if not public.can_manage_gates() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if tid is null then
    insert into gate_templates (track_id, kind, name_en, name_ar, start_day, end_day, weekdays, owner_id, position, is_active)
    values ((p ->> 'track_id')::uuid, (p ->> 'kind')::gate_kind, trim(p ->> 'name_en'), trim(p ->> 'name_ar'),
      (p ->> 'start_day')::int, (p ->> 'end_day')::int, wd, nullif(p ->> 'owner_id', '')::uuid,
      coalesce((p ->> 'position')::int, 0), coalesce((p ->> 'is_active')::boolean, true))
    returning id into tid;
  else
    update gate_templates set
      track_id = (p ->> 'track_id')::uuid, kind = (p ->> 'kind')::gate_kind,
      name_en = trim(p ->> 'name_en'), name_ar = trim(p ->> 'name_ar'),
      start_day = (p ->> 'start_day')::int, end_day = (p ->> 'end_day')::int, weekdays = wd,
      owner_id = nullif(p ->> 'owner_id', '')::uuid, position = coalesce((p ->> 'position')::int, position),
      is_active = coalesce((p ->> 'is_active')::boolean, is_active)
    where id = tid;
    if not found then
      raise exception 'not found' using errcode = 'P0002';
    end if;
  end if;
  perform public._sync_gate_months();
  return tid;
end $$;

create function public.delete_gate_template(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage_gates() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  delete from gate_items i using gate_templates t
  where i.template_id = t.id and t.id = p_id and i.month >= date_trunc('month', public.cairo_today())::date
    and not i.customised and i.status = 'not_started';
  delete from gate_templates where id = p_id;
end $$;

-- Edit one month's item, or add a one-off item when p_id is null.
-- p: { month, track_id, kind, name_en, name_ar, starts_on, due_on, owner_id, status, note, position }
create function public.save_gate_item(p_id uuid, p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  iid uuid := p_id;
  st gate_status := coalesce((p ->> 'status')::gate_status, 'not_started');
begin
  if not public.can_manage_gates() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if iid is null then
    insert into gate_items (month, track_id, kind, name_en, name_ar, starts_on, due_on, owner_id, status, note, customised, position,
      completed_at, completed_by)
    values (date_trunc('month', (p ->> 'month')::date)::date, (p ->> 'track_id')::uuid, (p ->> 'kind')::gate_kind,
      trim(p ->> 'name_en'), trim(p ->> 'name_ar'), (p ->> 'starts_on')::date, (p ->> 'due_on')::date,
      nullif(p ->> 'owner_id', '')::uuid, st, coalesce(p ->> 'note', ''), true, coalesce((p ->> 'position')::int, 100),
      case when st = 'done' then now() end, case when st = 'done' then auth.uid() end)
    returning id into iid;
  else
    update gate_items set
      name_en = trim(p ->> 'name_en'), name_ar = trim(p ->> 'name_ar'),
      starts_on = (p ->> 'starts_on')::date, due_on = (p ->> 'due_on')::date,
      owner_id = nullif(p ->> 'owner_id', '')::uuid, status = st, note = coalesce(p ->> 'note', ''),
      customised = true,
      completed_at = case when st = 'done' then coalesce(completed_at, now()) end,
      completed_by = case when st = 'done' then coalesce(completed_by, auth.uid()) end
    where id = iid;
    if not found then
      raise exception 'not found' using errcode = 'P0002';
    end if;
  end if;
  return iid;
end $$;

create function public.delete_gate_item(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage_gates() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  delete from gate_items where id = p_id;
end $$;

-- The owner, traffic and super admins update progress.
create function public.set_gate_status(p_id uuid, p_status public.gate_status, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.can_update_gate(p_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update gate_items set
    status = p_status,
    note = coalesce(p_note, note),
    customised = true,
    completed_at = case when p_status = 'done' then coalesce(completed_at, now()) end,
    completed_by = case when p_status = 'done' then coalesce(completed_by, auth.uid()) end
  where id = p_id;
end $$;

-- ---------------------------------------------------------------------------
-- Daily: build this month and next, remind owners, flag overdue gates
-- ---------------------------------------------------------------------------
create function public.cron_gates(p_now timestamptz default now()) returns int
language plpgsql security definer set search_path = public as $$
declare
  today date := public.cairo_today(p_now);
  r record;
  n int := 0;
  left_days int;
begin
  perform public._build_gate_month(today);
  perform public._build_gate_month((date_trunc('month', today) + interval '1 month')::date);

  for r in
    select * from gate_items
    where kind <> 'phase' and status not in ('done', 'skipped', 'missed') and due_on <= today + 3
  loop
    left_days := r.due_on - today;
    if left_days in (3, 1, 0) and public._once('gate:' || r.id || ':' || left_days) then
      if r.owner_id is not null then
        perform public.notify(r.owner_id, 'gate_due_soon', '/gates?month=' || to_char(r.month, 'YYYY-MM'),
          jsonb_build_object('item_id', r.id, 'title', r.name_en, 'title_ar', r.name_ar, 'due_on', r.due_on, 'days', left_days));
      else
        perform public._notify_role('traffic_manager', 'gate_due_soon', '/gates?month=' || to_char(r.month, 'YYYY-MM'),
          jsonb_build_object('item_id', r.id, 'title', r.name_en, 'title_ar', r.name_ar, 'due_on', r.due_on, 'days', left_days));
      end if;
      n := n + 1;
    elsif left_days < 0 and public._once('gate:' || r.id || ':overdue') then
      perform public.notify(r.owner_id, 'gate_overdue', '/gates?month=' || to_char(r.month, 'YYYY-MM'),
        jsonb_build_object('item_id', r.id, 'title', r.name_en, 'title_ar', r.name_ar, 'due_on', r.due_on));
      perform public._notify_role('traffic_manager', 'gate_overdue', '/gates?month=' || to_char(r.month, 'YYYY-MM'),
        jsonb_build_object('item_id', r.id, 'title', r.name_en, 'title_ar', r.name_ar, 'due_on', r.due_on));
      perform public._notify_role('super_admin', 'gate_overdue', '/gates?month=' || to_char(r.month, 'YYYY-MM'),
        jsonb_build_object('item_id', r.id, 'title', r.name_en, 'title_ar', r.name_ar, 'due_on', r.due_on));
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.gate_tracks enable row level security;
alter table public.gate_templates enable row level security;
alter table public.gate_items enable row level security;
alter table public.gate_item_cards enable row level security;

revoke insert, update, delete on public.gate_templates, public.gate_items from authenticated;

create policy gate_tracks_select on public.gate_tracks for select to authenticated
  using ((select public.is_staff()));
create policy gate_tracks_insert on public.gate_tracks for insert to authenticated
  with check ((select public.can_manage_gates()));
create policy gate_tracks_update on public.gate_tracks for update to authenticated
  using ((select public.can_manage_gates())) with check ((select public.can_manage_gates()));
create policy gate_tracks_delete on public.gate_tracks for delete to authenticated
  using ((select public.can_manage_gates()));

create policy gate_templates_select on public.gate_templates for select to authenticated
  using ((select public.is_staff()));
create policy gate_items_select on public.gate_items for select to authenticated
  using ((select public.is_staff()));

create policy gate_item_cards_select on public.gate_item_cards for select to authenticated
  using ((select public.is_staff()) and public.can_view_card(card_id));
create policy gate_item_cards_insert on public.gate_item_cards for insert to authenticated
  with check (public.can_update_gate(item_id) and public.can_view_card(card_id));
create policy gate_item_cards_delete on public.gate_item_cards for delete to authenticated
  using (public.can_update_gate(item_id));

alter publication supabase_realtime add table public.gate_items;

-- ---------------------------------------------------------------------------
-- The month at a glance, day 1 to 30 (Adham's monthly plan).
-- ---------------------------------------------------------------------------
insert into public.gate_tracks (key, name_en, name_ar, subtitle_en, subtitle_ar, position) values
  ('content-social', 'Content and social', 'المحتوى والسوشيال', 'Next month''s content', 'محتوى الشهر الجاي', 1),
  ('publishing', 'Publishing', 'النشر', 'This month', 'الشهر الحالي', 2),
  ('performance', 'Performance', 'الأداء', 'Paid campaigns', 'الحملات المدفوعة', 3),
  ('mql-review', 'MQL review', 'مراجعة العملاء المؤهلين', 'Every 10 days', 'كل 10 أيام', 4);

insert into public.gate_templates (track_id, kind, name_en, name_ar, start_day, end_day, weekdays, position)
select t.id, v.kind::public.gate_kind, v.name_en, v.name_ar, v.start_day, v.end_day, v.weekdays::int[], v.position
from (values
  ('content-social', 'phase', 'Plan drafted', 'كتابة الخطة', 1, 4, '{}', 1),
  ('content-social', 'gate', 'Gate 5: plan delivered', 'بوابة 5: تسليم الخطة', 5, 5, '{}', 2),
  ('content-social', 'phase', 'Production: copy, design, video, reels, with review and approval inside this window', 'الإنتاج: كتابة وتصميم وفيديو وريلز، والمراجعة والاعتماد خلال الفترة دي', 6, 20, '{}', 3),
  ('content-social', 'phase', 'Final approvals', 'الاعتمادات النهائية', 21, 24, '{}', 4),
  ('content-social', 'gate', 'Gate 25: everything approved and scheduled', 'بوابة 25: كل المحتوى معتمد ومجدول', 25, 25, '{}', 5),
  ('content-social', 'phase', 'Buffer and handover', 'وقت احتياطي وتسليم', 26, 31, '{}', 6),
  ('publishing', 'phase', 'Publishing last month''s locked plan', 'نشر خطة الشهر اللي فات المعتمدة', 1, 31, '{}', 1),
  ('performance', 'gate', 'Campaigns live', 'إطلاق الحملات', 1, 1, '{}', 1),
  ('performance', 'phase', 'Execution and optimisation', 'التنفيذ والتحسين', 2, 24, '{}', 2),
  ('performance', 'recurring', 'Spending gate', 'بوابة الإنفاق', 1, 31, '{0,3}', 3),
  ('performance', 'phase', 'Needs', 'الاحتياجات', 25, 27, '{}', 4),
  ('performance', 'phase', 'Media plan', 'خطة الميديا', 28, 31, '{}', 5),
  ('mql-review', 'checkpoint', 'MQL review, day 10', 'مراجعة العملاء المؤهلين، يوم 10', 10, 10, '{}', 1),
  ('mql-review', 'checkpoint', 'MQL review, day 20', 'مراجعة العملاء المؤهلين، يوم 20', 20, 20, '{}', 2),
  ('mql-review', 'checkpoint', 'MQL review, day 30', 'مراجعة العملاء المؤهلين، يوم 30', 30, 30, '{}', 3)
) as v(track, kind, name_en, name_ar, start_day, end_day, weekdays, position)
join public.gate_tracks t on t.key = v.track;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
grant execute on function
  public.can_manage_gates(), public.can_update_gate(uuid), public.ensure_gate_month(date),
  public.save_gate_template(uuid, jsonb), public.delete_gate_template(uuid),
  public.save_gate_item(uuid, jsonb), public.delete_gate_item(uuid),
  public.set_gate_status(uuid, public.gate_status, text)
  to authenticated;
revoke execute on function public._build_gate_month(date), public._sync_gate_months(), public.cron_gates(timestamptz)
  from authenticated;
grant execute on function public.cron_gates(timestamptz) to service_role;

revoke execute on all functions in schema public from public, anon;
