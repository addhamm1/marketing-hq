-- W-18 Overdue gate alerts only for gates missed in the last three days.
-- Without this, the first run after launch alerts owners, traffic and super admins
-- about every gate earlier in the month. The Gates page still shows them as overdue.

create or replace function public.cron_gates(p_now timestamptz default now()) returns int
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
    -- Only gates missed in the last three days: going live mid-month must not send an alert for every earlier gate.
    elsif left_days between -3 and -1 and public._once('gate:' || r.id || ':overdue') then
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

revoke execute on function public.cron_gates(timestamptz) from authenticated;
grant execute on function public.cron_gates(timestamptz) to service_role;
revoke execute on all functions in schema public from public, anon;
