-- W-20 Ahmed Gad's confirmed address is gad@e-spaces.co (D-19): the default
-- members of the Spending gate and MQL review meetings now include him.

create or replace function public.workflow_assign_default_owners() returns void
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
  join profiles u on u.email in ('adham@e-spaces.co', 'omar.afify@e-spaces.co', 'omar.mansy@e-spaces.co', 'gad@e-spaces.co')
  where s.title in ('Spending gate', 'MQL review')
  on conflict do nothing;
end $$;

select public.workflow_assign_default_owners();

revoke execute on function public.workflow_assign_default_owners() from authenticated;
grant execute on function public.workflow_assign_default_owners() to service_role;
revoke execute on all functions in schema public from public, anon;
