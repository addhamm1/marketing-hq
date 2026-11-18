-- Real Espaces staff (supabase/staff.json), local and staging only. Password: Test1234!
-- Production accounts are created with scripts/create-staff.mts (temporary passwords, forced change).
-- DECISION: D-19 (emails follow name@e-spaces.co until confirmed), D-20 (access tiers).

create temporary table staff (id uuid, email text, full_name text, dept text, team text, roles text[]);
insert into staff values
  ('00000000-0000-4000-8000-000000000101', 'adham@e-spaces.co', 'Adham Mostafa', 'marketing', null, '{super_admin}'),
  ('00000000-0000-4000-8000-000000000102', 'omnia@e-spaces.co', 'Omnia Magdy', 'sales', null, '{super_admin}'),
  ('00000000-0000-4000-8000-000000000103', 'roaa@e-spaces.co', 'Roaa Reda', 'marketing', 'traffic', '{traffic_manager}'),
  ('00000000-0000-4000-8000-000000000104', 'ibrahem@e-spaces.co', 'Ibrahem Seif', 'marketing', 'creative', '{member}'),
  ('00000000-0000-4000-8000-000000000105', 'mahmoud.hussein@e-spaces.co', 'Mahmoud Hussein', 'marketing', 'creative', '{member}'),
  ('00000000-0000-4000-8000-000000000106', 'hatem@e-spaces.co', 'Hatem Sapet', 'marketing', 'creative', '{member}'),
  ('00000000-0000-4000-8000-000000000107', 'basil@e-spaces.co', 'Basil Nabil', 'marketing', 'creative', '{member}'),
  ('00000000-0000-4000-8000-000000000108', 'omar.afify@e-spaces.co', 'Omar Afify', 'marketing', 'performance', '{member}'),
  ('00000000-0000-4000-8000-000000000117', 'yasmin@e-spaces.co', 'Yasmin Shaarawy', 'marketing', 'creative', '{member}'),
  ('00000000-0000-4000-8000-000000000118', 'omar.mansy@e-spaces.co', 'Omar Mansy', 'marketing', 'performance', '{member}'),
  ('00000000-0000-4000-8000-000000000119', 'ahmed.gad@e-spaces.co', 'Ahmed Gad', 'marketing', 'performance', '{member}'),
  ('00000000-0000-4000-8000-000000000109', 'ahmed.yassin@e-spaces.co', 'Ahmed Yassin', 'management', null, '{requester}'),
  ('00000000-0000-4000-8000-000000000110', 'asmaa@e-spaces.co', 'Asmaa Hossam', 'sales', null, '{requester,final_approver}'),
  ('00000000-0000-4000-8000-000000000111', 'hadeer@e-spaces.co', 'Hadeer Mohamed', 'daily-reservation', null, '{requester}'),
  ('00000000-0000-4000-8000-000000000112', 'sami@e-spaces.co', 'Mohamed Sami', 'business-development', null, '{requester}'),
  ('00000000-0000-4000-8000-000000000113', 'safaa@e-spaces.co', 'Safaa', 'hr', null, '{requester}'),
  ('00000000-0000-4000-8000-000000000114', 'nada@e-spaces.co', 'Nada Hossam', 'finance', null, '{requester}'),
  ('00000000-0000-4000-8000-000000000115', 'omar.abdelaziz@e-spaces.co', 'Omar Abd al-Aziz', 'logistics', null, '{requester}'),
  ('00000000-0000-4000-8000-000000000116', 'mohy@e-spaces.co', 'Mohamed Mohy', 'operations', null, '{requester}');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
select
  '00000000-0000-0000-0000-000000000000', s.id, 'authenticated', 'authenticated', s.email,
  extensions.crypt('Test1234!', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', s.full_name),
  now(), now(), '', '', '', ''
from staff s;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), s.id, s.id::text,
  jsonb_build_object('sub', s.id::text, 'email', s.email, 'email_verified', true),
  'email', now(), now(), now()
from staff s;

update public.profiles p set
  department_id = d.id,
  team_id = t.id,
  home_branch_id = case when s.dept = 'marketing' or 'super_admin' = any (s.roles)
    then '30000000-0000-4000-8000-000000000001'::uuid end,
  display_name = split_part(s.full_name, ' ', 1),
  must_change_password = false,
  avatar_seen = false
from staff s
left join public.departments d on d.slug = s.dept
left join public.teams t on t.slug = s.team
where p.id = s.id;

insert into public.user_roles (user_id, role, team_id)
select s.id, r.role::public.app_role, null
from staff s cross join lateral unnest(s.roles) as r(role);

drop table staff;

-- Sample allowances so leave requests can be tried locally (HR sets the real ones in /admin/leave).
insert into public.leave_balances (user_id, type_id, year, allowance)
select p.id, t.id, y.year,
  case t.key when 'annual_leave' then 21 when 'casual_leave' then 6 when 'sick_leave' then 15 else 30 end
from public.profiles p
cross join public.request_types t
cross join (values (2026), (2027)) as y(year)
where t.is_leave and p.email like '%@e-spaces.co';

-- Local tests use the strict geofence at the home branch (production branches start unconfirmed, D-18).
update public.branches set location_confirmed_at = now() where slug = 'hq';
