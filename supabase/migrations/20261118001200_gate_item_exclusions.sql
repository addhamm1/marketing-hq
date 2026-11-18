-- W-12 Monthly gates: a month keeps what managers did to it.
-- ensure_gate_month and the daily cron rebuild a month from its templates, so an
-- item a manager deleted came back on the next page load, and an item moved to
-- another date appeared twice. Exclusions record the occurrences that were
-- removed or moved, and the builder skips them.

create table public.gate_item_exclusions (
  template_id uuid not null references public.gate_templates (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  due_on date not null,
  created_at timestamptz not null default now(),
  primary key (template_id, month, due_on)
);

alter table public.gate_item_exclusions enable row level security;

-- Written only inside save_gate_item and delete_gate_item.
revoke all on public.gate_item_exclusions from anon, authenticated;
grant select on public.gate_item_exclusions to authenticated;

create policy gate_item_exclusions_select on public.gate_item_exclusions for select to authenticated
  using ((select public.can_manage_gates()));

-- Copies active templates into a month. Safe to repeat.
create or replace function public._build_gate_month(p_month date) returns int
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
        if extract(dow from d)::int = any (t.weekdays) and public._is_workday(d)
           and not exists (select 1 from gate_item_exclusions x
                           where x.template_id = t.id and x.month = m and x.due_on = d) then
          insert into gate_items (month, track_id, template_id, kind, name_en, name_ar, starts_on, due_on, owner_id, position)
          values (m, t.track_id, t.id, t.kind, t.name_en, t.name_ar, d, d, t.owner_id, t.position)
          on conflict (template_id, month, due_on) do nothing;
          get diagnostics c = row_count;
          n := n + c;
        end if;
      end loop;
    else
      -- These templates give one item a month: keep the one that exists, wherever
      -- it was moved to, and do not bring back one that was deleted.
      continue when exists (select 1 from gate_items i where i.template_id = t.id and i.month = m)
        or exists (select 1 from gate_item_exclusions x where x.template_id = t.id and x.month = m);
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

-- Edit one month's item, or add a one-off item when p_id is null.
-- p: { month, track_id, kind, name_en, name_ar, starts_on, due_on, owner_id, status, note, position }
create or replace function public.save_gate_item(p_id uuid, p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  iid uuid := p_id;
  st gate_status := coalesce((p ->> 'status')::gate_status, 'not_started');
  prev gate_items;
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
    select * into prev from gate_items where id = iid for update;
    if not found then
      raise exception 'not found' using errcode = 'P0002';
    end if;
    update gate_items set
      name_en = trim(p ->> 'name_en'), name_ar = trim(p ->> 'name_ar'),
      starts_on = (p ->> 'starts_on')::date, due_on = (p ->> 'due_on')::date,
      owner_id = nullif(p ->> 'owner_id', '')::uuid, status = st, note = coalesce(p ->> 'note', ''),
      customised = true,
      completed_at = case when st = 'done' then coalesce(completed_at, now()) end,
      completed_by = case when st = 'done' then coalesce(completed_by, auth.uid()) end
    where id = iid;
    if prev.template_id is not null and prev.due_on <> (p ->> 'due_on')::date then
      insert into gate_item_exclusions (template_id, month, due_on)
      values (prev.template_id, prev.month, prev.due_on)
      on conflict do nothing;
    end if;
  end if;
  return iid;
end $$;

create or replace function public.delete_gate_item(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage_gates() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  insert into gate_item_exclusions (template_id, month, due_on)
  select i.template_id, i.month, i.due_on from gate_items i
  where i.id = p_id and i.template_id is not null
  on conflict do nothing;
  delete from gate_items where id = p_id;
end $$;

revoke execute on all functions in schema public from public, anon;
