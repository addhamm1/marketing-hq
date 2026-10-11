-- Day 2 seed: brands, workspaces, boards, request types, demo cards (SEED_DATA.md).

insert into public.brands (id, slug, name, color) values
  ('40000000-0000-4000-8000-000000000001', 'espaces', 'Espaces', '#0F4C5C'),
  ('40000000-0000-4000-8000-000000000002', 'cocafe', 'Cocafe', '#B45309'),
  ('40000000-0000-4000-8000-000000000003', 'spaces-planner', 'Spaces Planner', '#7C3AED');

insert into public.workspaces (id, slug, name_en, name_ar, team_id, position) values
  ('50000000-0000-4000-8000-000000000001', 'traffic', 'Traffic', 'التنسيق', '20000000-0000-4000-8000-000000000001', 0),
  ('50000000-0000-4000-8000-000000000002', 'creative', 'Creative', 'الإبداع', '20000000-0000-4000-8000-000000000002', 1),
  ('50000000-0000-4000-8000-000000000003', 'performance', 'Performance', 'الأداء', '20000000-0000-4000-8000-000000000003', 2),
  ('50000000-0000-4000-8000-000000000004', 'community', 'Community', 'المجتمع', '20000000-0000-4000-8000-000000000004', 3),
  ('50000000-0000-4000-8000-000000000005', 'projects', 'Projects', 'المشروعات', null, 4);

-- The Content Pipeline: one fixed list per stage.
insert into public.boards (id, workspace_id, name, description, is_pipeline, created_by) values
  ('60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'Content Pipeline',
   'Every department request flows through these stages.', true, '00000000-0000-4000-8000-000000000001');

insert into public.lists (id, board_id, name, position, stage)
select ('70000000-0000-4000-8000-0000000000' || lpad(i::text, 2, '0'))::uuid,
  '60000000-0000-4000-8000-000000000001', s.name, 'a' || (i - 1), s.stage::public.card_stage
from (values
  (1, 'Request', 'request'), (2, 'Performance input', 'performance_input'), (3, 'Intake', 'intake'),
  (4, 'Brief and schedule', 'brief_schedule'), (5, 'Production', 'production'),
  (6, 'Creative review', 'creative_review'), (7, 'Confirmation', 'confirmation'),
  (8, 'Ready to publish', 'ready_to_publish'), (9, 'Published', 'published'), (10, 'Reported', 'reported')
) as s(i, name, stage);

-- Branch opening template board.
insert into public.boards (id, workspace_id, name, description, created_by) values
  ('60000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000005', 'Branch Opening Template',
   'Copy this board for each new branch launch.', '00000000-0000-4000-8000-000000000001');
insert into public.lists (board_id, name, position)
select '60000000-0000-4000-8000-000000000002', name, 'a' || i
from (values (0, 'Planning'), (1, 'Assets'), (2, 'Launch Content'), (3, 'Launch Day'), (4, 'Follow-up')) as l(i, name);

-- Creative sprint board (local performance check: 300 cards).
insert into public.boards (id, workspace_id, name, description, created_by) values
  ('60000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000002', 'Creative Sprint',
   'Day-to-day creative tasks.', '00000000-0000-4000-8000-000000000004');
insert into public.lists (id, board_id, name, position)
select ('71000000-0000-4000-8000-00000000000' || i)::uuid, '60000000-0000-4000-8000-000000000003', name, 'a' || i
from (values (1, 'Backlog'), (2, 'This week'), (3, 'Doing'), (4, 'Review'), (5, 'Done')) as l(i, name);

-- Base62 position helper for seeds: 'b' + two digits, valid fractional-index keys.
create temporary table seed_b62 as
select i, 'b' || substr(d, i / 62 + 1, 1) || substr(d, i % 62 + 1, 1) as pos
from generate_series(0, 400) as i,
  (select '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'::text as d) as digits;

insert into public.cards (board_id, list_id, position, title, description, priority, due_at, created_by)
select '60000000-0000-4000-8000-000000000003',
  ('71000000-0000-4000-8000-00000000000' || (1 + (g.n % 5)))::uuid,
  p.pos,
  (array['Story set', 'Carousel draft', 'Reel edit', 'Banner resize', 'Landing hero', 'Caption pass'])[1 + g.n % 6] || ' #' || g.n,
  '',
  (array['low', 'normal', 'normal', 'high'])[1 + g.n % 4]::public.card_priority,
  now() + ((g.n % 20) - 5) * interval '1 day',
  '00000000-0000-4000-8000-000000000004'
from generate_series(1, 300) as g(n)
join seed_b62 p on p.i = g.n;

insert into public.labels (board_id, name, color) values
  ('60000000-0000-4000-8000-000000000001', 'Ramadan', '#16A34A'),
  ('60000000-0000-4000-8000-000000000001', 'Launch', '#DC2626'),
  ('60000000-0000-4000-8000-000000000001', 'Evergreen', '#2563EB'),
  ('60000000-0000-4000-8000-000000000003', 'Video', '#9333EA'),
  ('60000000-0000-4000-8000-000000000003', 'Static', '#0EA5E9');

-- Demo pipeline cards across stages (Sales requests, creative team assigned).
create temporary table seed_cards (n int, stage text, title text, kind text, dept uuid, requester uuid);
insert into seed_cards values
  (1, 'performance_input', 'Virtual office: Q4 awareness carousel', 'strategic', '10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000009'),
  (2, 'performance_input', 'Private offices: testimonial reel', 'urgent', '10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000009'),
  (3, 'intake', 'Meeting rooms: weekday offer', 'strategic', '10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000010'),
  (4, 'intake', 'Cocafe: new menu launch story', 'internal', '10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003'),
  (5, 'brief_schedule', 'Saraya branch: opening teaser', 'strategic', '10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000009'),
  (6, 'production', 'Business insights: 5 trends carousel', 'internal', '10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003'),
  (7, 'production', 'Virtual office: price comparison static', 'strategic', '10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000009'),
  (8, 'creative_review', 'Client show: episode 3 cutdown', 'internal', '10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003'),
  (9, 'confirmation', 'Offices: corporate deck refresh', 'strategic', '10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000009'),
  (10, 'ready_to_publish', 'Daily reservation: event space reel', 'strategic', '10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000010'),
  (11, 'published', 'Ramadan hours announcement', 'urgent', '10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000009'),
  (12, 'reported', 'September recap carousel', 'internal', '10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003');

insert into public.cards (
  id, board_id, list_id, position, title, description, objective, key_message, stage, request_kind,
  requesting_department_id, requester_id, vertical, brand_id, format, platforms, priority,
  due_at, stage_entered_at, reviewer_id, approver_id, created_by, delivered_at, published_at, created_at
)
select
  ('80000000-0000-4000-8000-0000000000' || lpad(s.n::text, 2, '0'))::uuid,
  '60000000-0000-4000-8000-000000000001',
  l.id,
  'a' || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', s.n + 1, 1),
  s.title,
  'Demo request seeded for local development.',
  'Drive qualified leads for the vertical.',
  'Work smarter in a space built for ambitious teams.',
  s.stage::public.card_stage,
  s.kind::public.card_request_kind,
  s.dept,
  s.requester,
  (array['Virtual Offices', 'Offices', 'Daily Reservation', 'Cocafe'])[1 + s.n % 4],
  case when s.title like 'Cocafe%' then '40000000-0000-4000-8000-000000000002'::uuid else '40000000-0000-4000-8000-000000000001'::uuid end,
  (array['carousel', 'reel', 'static', 'story'])[1 + s.n % 4],
  '{instagram,facebook}',
  (array['normal', 'high', 'urgent', 'normal'])[1 + s.n % 4]::public.card_priority,
  now() + (s.n - 4) * interval '1 day',
  now() - (s.n % 5) * interval '6 hours',
  '00000000-0000-4000-8000-000000000004',
  case when s.dept = '10000000-0000-4000-8000-000000000002' then '00000000-0000-4000-8000-000000000010'::uuid
       else '00000000-0000-4000-8000-000000000003'::uuid end,
  '00000000-0000-4000-8000-000000000003',
  case when s.stage in ('ready_to_publish', 'published', 'reported') then now() - interval '2 days' end,
  case when s.stage in ('published', 'reported') then now() - interval '1 day' end,
  now() - (20 - s.n) * interval '1 day'
from seed_cards s
join public.lists l on l.board_id = '60000000-0000-4000-8000-000000000001' and l.stage = s.stage::public.card_stage;

insert into public.card_assignees (card_id, user_id, role)
select ('80000000-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid,
  case when n % 2 = 0 then '00000000-0000-4000-8000-000000000006'::uuid else '00000000-0000-4000-8000-000000000007'::uuid end,
  (array['design', 'video'])[1 + n % 2]::public.assignee_role
from seed_cards where stage in ('production', 'creative_review', 'confirmation', 'ready_to_publish', 'published', 'reported');

-- Active steps for the cards waiting in review stages.
insert into public.approval_steps (subject_type, subject_id, card_stage, step_index, approver_id, status) values
  ('card', '80000000-0000-4000-8000-000000000008', 'creative_review', 0, '00000000-0000-4000-8000-000000000004', 'active'),
  ('card', '80000000-0000-4000-8000-000000000009', 'creative_review', 0, '00000000-0000-4000-8000-000000000004', 'approved'),
  ('card', '80000000-0000-4000-8000-000000000009', 'confirmation', 1, '00000000-0000-4000-8000-000000000010', 'active');

drop table seed_cards;
drop table seed_b62;

-- Request types and approval chains (DECISIONS D-05, D-06).
insert into public.request_types (key, name_en, name_ar, category, is_leave, counts_working_days, requires_attachment_after_days, approval_chain, form_schema) values
  ('annual_leave', 'Annual leave', 'إجازة سنوية', 'leave', true, true, null,
   '[{"resolve":"team_lead_of_requester"},{"resolve":"role:super_admin"},{"resolve":"role:hr"}]',
   '{"fields":[{"name":"starts_on","type":"date","required":true,"label_en":"First day","label_ar":"أول يوم"},{"name":"ends_on","type":"date","required":true,"label_en":"Last day","label_ar":"آخر يوم"},{"name":"note","type":"textarea","required":false,"label_en":"Note","label_ar":"ملاحظة"}]}'),
  ('sick_leave', 'Sick leave', 'إجازة مرضية', 'leave', true, true, 2,
   '[{"resolve":"team_lead_of_requester"},{"resolve":"role:hr"}]',
   '{"fields":[{"name":"starts_on","type":"date","required":true,"label_en":"First day","label_ar":"أول يوم"},{"name":"ends_on","type":"date","required":true,"label_en":"Last day","label_ar":"آخر يوم"},{"name":"note","type":"textarea","required":false,"label_en":"Note","label_ar":"ملاحظة"}]}'),
  ('casual_leave', 'Casual leave', 'إجازة عارضة', 'leave', true, true, null,
   '[{"resolve":"team_lead_of_requester"},{"resolve":"role:hr"}]',
   '{"fields":[{"name":"starts_on","type":"date","required":true,"label_en":"First day","label_ar":"أول يوم"},{"name":"ends_on","type":"date","required":true,"label_en":"Last day","label_ar":"آخر يوم"},{"name":"note","type":"textarea","required":false,"label_en":"Note","label_ar":"ملاحظة"}]}'),
  ('unpaid_leave', 'Unpaid leave', 'إجازة بدون أجر', 'leave', true, true, null,
   '[{"resolve":"role:super_admin"},{"resolve":"role:hr"}]',
   '{"fields":[{"name":"starts_on","type":"date","required":true,"label_en":"First day","label_ar":"أول يوم"},{"name":"ends_on","type":"date","required":true,"label_en":"Last day","label_ar":"آخر يوم"},{"name":"note","type":"textarea","required":true,"label_en":"Reason","label_ar":"السبب"}]}'),
  ('work_from_home', 'Work from home', 'العمل من المنزل', 'special', false, true, null,
   '[{"resolve":"team_lead_of_requester"}]',
   '{"fields":[{"name":"starts_on","type":"date","required":true,"label_en":"First day","label_ar":"أول يوم"},{"name":"ends_on","type":"date","required":true,"label_en":"Last day","label_ar":"آخر يوم"},{"name":"note","type":"textarea","required":false,"label_en":"Note","label_ar":"ملاحظة"}]}'),
  ('permission', 'Permission', 'إذن', 'special', false, false, null,
   '[{"resolve":"team_lead_of_requester"}]',
   '{"fields":[{"name":"starts_on","type":"date","required":true,"label_en":"Date","label_ar":"التاريخ"},{"name":"kind","type":"select","required":true,"options":["late_arrival","early_leave"],"label_en":"Type","label_ar":"النوع"},{"name":"hours","type":"number","required":true,"min":0.5,"max":4,"label_en":"Hours","label_ar":"عدد الساعات"},{"name":"note","type":"textarea","required":false,"label_en":"Note","label_ar":"ملاحظة"}]}'),
  ('overtime', 'Overtime', 'عمل إضافي', 'special', false, false, null,
   '[{"resolve":"team_lead_of_requester"},{"resolve":"role:super_admin"}]',
   '{"fields":[{"name":"starts_on","type":"date","required":true,"label_en":"Date","label_ar":"التاريخ"},{"name":"hours","type":"number","required":true,"min":0.5,"max":12,"label_en":"Hours","label_ar":"عدد الساعات"},{"name":"card_id","type":"card","required":false,"label_en":"Linked card","label_ar":"الكارت المرتبط"},{"name":"note","type":"textarea","required":false,"label_en":"Note","label_ar":"ملاحظة"}]}'),
  ('equipment', 'Equipment', 'معدات', 'special', false, false, null,
   '[{"resolve":"role:super_admin"}]',
   '{"fields":[{"name":"item","type":"text","required":true,"label_en":"Item","label_ar":"البند"},{"name":"reason","type":"textarea","required":true,"label_en":"Why it is needed","label_ar":"سبب الاحتياج"}]}'),
  ('purchase', 'Purchase', 'شراء', 'special', false, false, null,
   '[{"resolve":"role:super_admin"},{"resolve":"role:leadership"}]',
   '{"fields":[{"name":"item","type":"text","required":true,"label_en":"Item","label_ar":"البند"},{"name":"amount","type":"number","required":true,"min":0,"label_en":"Estimated amount (EGP)","label_ar":"المبلغ التقديري (جنيه)"},{"name":"reason","type":"textarea","required":true,"label_en":"Why it is needed","label_ar":"سبب الاحتياج"}]}'),
  ('training', 'Training', 'تدريب', 'special', false, false, null,
   '[{"resolve":"role:super_admin"}]',
   '{"fields":[{"name":"item","type":"text","required":true,"label_en":"Course or event","label_ar":"الدورة أو الفعالية"},{"name":"starts_on","type":"date","required":false,"label_en":"Date","label_ar":"التاريخ"},{"name":"amount","type":"number","required":false,"min":0,"label_en":"Cost (EGP)","label_ar":"التكلفة (جنيه)"},{"name":"reason","type":"textarea","required":true,"label_en":"Why it helps","label_ar":"الفائدة"}]}'),
  ('other', 'Other', 'أخرى', 'special', false, false, null,
   '[{"resolve":"role:super_admin"}]',
   '{"fields":[{"name":"item","type":"text","required":true,"label_en":"Subject","label_ar":"الموضوع"},{"name":"reason","type":"textarea","required":true,"label_en":"Details","label_ar":"التفاصيل"}]}');
