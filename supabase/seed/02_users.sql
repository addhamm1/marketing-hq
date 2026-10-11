-- Day 1 seed: test users (DATA_MODEL.md section 13). Local and staging only.
-- Password for every test user: Test1234!

create temporary table seed_users (
  id uuid, email text, full_name text, dept text, team text, roles text[],
  status public.profile_status, must_change boolean
);

insert into seed_users values
  ('00000000-0000-4000-8000-000000000001', 'admin@test.local', 'Adham Admin', 'marketing', null, '{super_admin}', 'active', false),
  ('00000000-0000-4000-8000-000000000002', 'leadership@test.local', 'Laila Leadership', null, null, '{leadership}', 'active', false),
  ('00000000-0000-4000-8000-000000000003', 'traffic@test.local', 'Tarek Traffic', 'marketing', 'traffic', '{traffic_manager}', 'active', false),
  ('00000000-0000-4000-8000-000000000004', 'lead.creative@test.local', 'Celine Creative Lead', 'marketing', 'creative', '{team_lead}', 'active', false),
  ('00000000-0000-4000-8000-000000000005', 'lead.performance@test.local', 'Peter Performance Lead', 'marketing', 'performance', '{team_lead}', 'active', false),
  ('00000000-0000-4000-8000-000000000006', 'member@test.local', 'Mona Member', 'marketing', 'creative', '{member}', 'active', false),
  ('00000000-0000-4000-8000-000000000007', 'member2@test.local', 'Marwan Member', 'marketing', 'creative', '{member}', 'active', false),
  ('00000000-0000-4000-8000-000000000008', 'community@test.local', 'Karim Community', 'marketing', 'community', '{member}', 'active', false),
  ('00000000-0000-4000-8000-000000000009', 'sales@test.local', 'Sara Sales', 'sales', null, '{requester}', 'active', false),
  ('00000000-0000-4000-8000-000000000010', 'approver@test.local', 'Amira Approver', 'sales', null, '{requester,final_approver}', 'active', false),
  ('00000000-0000-4000-8000-000000000011', 'hr@test.local', 'Hana HR', 'hr', null, '{hr,requester}', 'active', false),
  ('00000000-0000-4000-8000-000000000012', 'guest@test.local', 'Gamal Guest', null, null, '{guest}', 'active', false),
  ('00000000-0000-4000-8000-000000000013', 'inactive@test.local', 'Ines Inactive', 'marketing', 'creative', '{member}', 'inactive', false),
  ('00000000-0000-4000-8000-000000000014', 'norole@test.local', 'Nader No Role', 'marketing', null, '{}', 'active', false),
  ('00000000-0000-4000-8000-000000000015', 'newhire@test.local', 'Nour New Hire', 'marketing', 'creative', '{member}', 'active', true);

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
from seed_users s;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select
  gen_random_uuid(), s.id, s.id::text,
  jsonb_build_object('sub', s.id::text, 'email', s.email, 'email_verified', true),
  'email', now(), now(), now()
from seed_users s;

-- The auth.users trigger created the profiles; fill in the rest.
update public.profiles p set
  department_id = d.id,
  team_id = t.id,
  home_branch_id = case when s.dept = 'marketing' or 'super_admin' = any (s.roles)
    then '30000000-0000-4000-8000-000000000001'::uuid end,
  status = s.status,
  must_change_password = s.must_change,
  display_name = split_part(s.full_name, ' ', 1),
  avatar_seen = not s.must_change
from seed_users s
left join public.departments d on d.slug = s.dept
left join public.teams t on t.slug = s.team
where p.id = s.id;

insert into public.user_roles (user_id, role, team_id)
select s.id, r.role::public.app_role,
  case when r.role = 'team_lead' then t.id end
from seed_users s
cross join lateral unnest(s.roles) as r(role)
left join public.teams t on t.slug = s.team;

-- Sales confirms deliverables through approver@ (DECISIONS D-12).
update public.departments set default_approver_id = '00000000-0000-4000-8000-000000000010'
where slug = 'sales';

drop table seed_users;
