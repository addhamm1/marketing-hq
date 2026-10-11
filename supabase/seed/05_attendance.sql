-- Day 4 seed: desks at the hq branch, a few assigned to the marketing test users.
insert into public.desks (branch_id, zone_name, assigned_user_id)
select '30000000-0000-4000-8000-000000000001', 'desk-' || g.n,
  case g.n
    when 1 then '00000000-0000-4000-8000-000000000003'::uuid  -- traffic
    when 2 then '00000000-0000-4000-8000-000000000004'::uuid  -- lead.creative
    when 3 then '00000000-0000-4000-8000-000000000006'::uuid  -- member
    when 4 then '00000000-0000-4000-8000-000000000007'::uuid  -- member2
    when 5 then '00000000-0000-4000-8000-000000000005'::uuid  -- lead.performance
    when 6 then '00000000-0000-4000-8000-000000000008'::uuid  -- community
    when 7 then '00000000-0000-4000-8000-000000000001'::uuid  -- admin
  end
from generate_series(1, 16) as g(n);
