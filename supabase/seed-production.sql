-- Production seed (D7-05). No test users, no demo data.
-- Run once against the production database after `supabase db push`:
--   psql "$PRODUCTION_DB_URL" -v ON_ERROR_STOP=1 -f supabase/seed-production.sql
-- The Board ids reuse the local fixed ids, but no local data is copied.
-- `created_by` on boards is left null in production (no test admin exists).

begin;
-- Day 1 seed: organisation and settings (SEED_DATA.md). Arabic names are drafts.

insert into public.departments (id, slug, name_en, name_ar, is_marketing) values
  ('10000000-0000-4000-8000-000000000001', 'marketing', 'Marketing', 'التسويق', true),
  ('10000000-0000-4000-8000-000000000002', 'sales', 'Sales', 'المبيعات', false),
  ('10000000-0000-4000-8000-000000000003', 'daily-reservation', 'Daily Reservation', 'الحجوزات اليومية', false),
  ('10000000-0000-4000-8000-000000000004', 'business-development', 'Business Development', 'تطوير الأعمال', false),
  ('10000000-0000-4000-8000-000000000005', 'operations', 'Operations', 'العمليات', false),
  ('10000000-0000-4000-8000-000000000006', 'hr', 'Human Resources', 'الموارد البشرية', false),
  ('10000000-0000-4000-8000-000000000007', 'finance', 'Finance', 'المالية', false),
  ('10000000-0000-4000-8000-000000000008', 'logistics', 'Logistics', 'اللوجستيات', false),
  ('10000000-0000-4000-8000-000000000009', 'management', 'Management', 'الإدارة', false);

insert into public.teams (id, department_id, slug, name_en, name_ar, color) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'traffic', 'Traffic', 'التنسيق', '#F59E0B'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'creative', 'Creative', 'الإبداع', '#8B5CF6'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'performance', 'Performance', 'الأداء', '#10B981'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'community', 'Digital Community Management', 'إدارة المجتمع الرقمي', '#3B82F6');

-- DECISION: D-02 (placeholder home branch "hq" until the real branch is named)
insert into public.branches (id, slug, name_en, name_ar, area, map_key, public_ips) values
  ('30000000-0000-4000-8000-000000000001', 'hq', 'Marketing HQ', 'مقر التسويق', 'Heliopolis', 'hq', '{}'),
  ('30000000-0000-4000-8000-000000000002', 'nozha', 'Nozha', 'النزهة', 'Heliopolis', 'hq', '{}'),
  ('30000000-0000-4000-8000-000000000003', 'cocafe-korba', 'Cocafe (Korba)', 'كوكافيه (الكوربة)', 'Heliopolis', 'hq', '{}'),
  ('30000000-0000-4000-8000-000000000004', 'the-hive', 'The Hive', 'ذا هايف', 'Heliopolis', 'hq', '{}'),
  ('30000000-0000-4000-8000-000000000005', 'makram', 'Makram', 'مكرم', 'Nasr City', 'hq', '{}'),
  ('30000000-0000-4000-8000-000000000006', 'mamoon', 'Mamoon', 'المأمون', 'Nasr City', 'hq', '{}'),
  ('30000000-0000-4000-8000-000000000007', 'diplo-plaza', 'Diplo Plaza', 'ديبلو بلازا', 'New Cairo', 'hq', '{}'),
  ('30000000-0000-4000-8000-000000000008', 'north-teseen', 'North Teseen', 'التسعين الشمالي', 'New Cairo', 'hq', '{}'),
  ('30000000-0000-4000-8000-000000000009', 'south-teseen', 'South Teseen', 'التسعين الجنوبي', 'New Cairo', 'hq', '{}'),
  ('30000000-0000-4000-8000-000000000010', 'mashareq', 'Mashareq', 'مشارق', '6th of October', 'hq', '{}'),
  ('30000000-0000-4000-8000-000000000011', 'palm-hills', 'Palm Hills (Izar)', 'بالم هيلز (إزار)', '6th of October', 'hq', '{}'),
  ('30000000-0000-4000-8000-000000000012', 'saraya', 'Saraya', 'سرايا', 'Sheikh Zayed', 'hq', '{}'),
  ('30000000-0000-4000-8000-000000000013', 'new-maadi', 'New Maadi', 'المعادي الجديدة', 'Maadi', 'hq', '{}'),
  ('30000000-0000-4000-8000-000000000014', 'old-maadi', 'Old Maadi', 'المعادي القديمة', 'Maadi', 'hq', '{}'),
  ('30000000-0000-4000-8000-000000000015', 'spaces-villa', 'Spaces Villa', 'سبيسز فيلا', 'Dokki', 'hq', '{}'),
  ('30000000-0000-4000-8000-000000000016', 'mosadak', 'Mosadak', 'مصدق', 'Dokki', 'hq', '{}'),
  ('30000000-0000-4000-8000-000000000017', 'alexandria', 'Alexandria', 'الإسكندرية', 'Alexandria', 'hq', '{}'),
  ('30000000-0000-4000-8000-000000000018', 'zagazig', 'Zagazig', 'الزقازيق', 'Zagazig', 'hq', '{}');

-- DECISION: D-18 approximate coordinates, confirm in /admin/branches
-- (geofence radius 150 m by default). hq is a placeholder (D-02).
update public.branches b set latitude = c.lat, longitude = c.lng
from (values
  ('hq', 30.0960, 31.3260),
  ('nozha', 30.1168, 31.3440),
  ('cocafe-korba', 30.0897, 31.3233),
  ('the-hive', 30.0870, 31.3300),
  ('makram', 30.0590, 31.3455),
  ('mamoon', 30.0625, 31.3330),
  ('diplo-plaza', 30.0262, 31.4905),
  ('north-teseen', 30.0302, 31.4700),
  ('south-teseen', 30.0150, 31.4650),
  ('mashareq', 29.9700, 30.9500),
  ('palm-hills', 29.9850, 30.9800),
  ('saraya', 30.0430, 30.9800),
  ('new-maadi', 29.9700, 31.2700),
  ('old-maadi', 29.9600, 31.2580),
  ('spaces-villa', 30.0380, 31.2100),
  ('mosadak', 30.0400, 31.2050),
  ('alexandria', 31.2156, 29.9553),
  ('zagazig', 30.5877, 31.5020)
) as c(slug, lat, lng)
where b.slug = c.slug;


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
   'Every department request flows through these stages.', true, null);

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
   'Copy this board for each new branch launch.', null);
insert into public.lists (board_id, name, position)
select '60000000-0000-4000-8000-000000000002', name, 'a' || i
from (values (0, 'Planning'), (1, 'Assets'), (2, 'Launch Content'), (3, 'Launch Day'), (4, 'Follow-up')) as l(i, name);

insert into public.labels (board_id, name, color) values
  ('60000000-0000-4000-8000-000000000001', 'Ramadan', '#16A34A'),
  ('60000000-0000-4000-8000-000000000001', 'Launch', '#DC2626'),
  ('60000000-0000-4000-8000-000000000001', 'Evergreen', '#2563EB');

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

-- Day 3 seed: holidays and leave allowances.

insert into public.holidays (day, name_en, name_ar, is_half_day) values
  ('2026-10-06', 'Armed Forces Day', 'عيد القوات المسلحة', false),
  ('2027-01-07', 'Coptic Christmas', 'عيد الميلاد المجيد', false),
  ('2027-01-25', 'Revolution Day', 'عيد ثورة 25 يناير', false),
  ('2027-04-25', 'Sinai Liberation Day', 'عيد تحرير سيناء', false),
  ('2027-05-01', 'Labour Day', 'عيد العمال', false),
  ('2027-06-30', 'June 30 Revolution', 'ذكرى ثورة 30 يونيو', false),
  ('2027-07-23', 'Revolution Day', 'عيد ثورة 23 يوليو', false);


-- Desks at the hq placeholder branch, unassigned.
insert into public.desks (branch_id, zone_name)
select '30000000-0000-4000-8000-000000000001', 'desk-' || g.n from generate_series(1, 16) as g(n);

commit;
