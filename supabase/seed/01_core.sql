-- Day 1 seed: organisation and settings (SEED_DATA.md). Arabic names are drafts.

insert into public.departments (id, slug, name_en, name_ar, is_marketing) values
  ('10000000-0000-4000-8000-000000000001', 'marketing', 'Marketing', 'التسويق', true),
  ('10000000-0000-4000-8000-000000000002', 'sales', 'Sales', 'المبيعات', false),
  ('10000000-0000-4000-8000-000000000003', 'daily-reservation', 'Daily Reservation', 'الحجوزات اليومية', false),
  ('10000000-0000-4000-8000-000000000004', 'business-development', 'Business Development', 'تطوير الأعمال', false),
  ('10000000-0000-4000-8000-000000000005', 'operations', 'Operations', 'العمليات', false),
  ('10000000-0000-4000-8000-000000000006', 'hr', 'Human Resources', 'الموارد البشرية', false),
  ('10000000-0000-4000-8000-000000000007', 'finance', 'Finance', 'المالية', false),
  ('10000000-0000-4000-8000-000000000008', 'logistics', 'Logistics', 'اللوجستيات', false);

insert into public.teams (id, department_id, slug, name_en, name_ar, color) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'traffic', 'Traffic', 'التنسيق', '#F59E0B'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'creative', 'Creative', 'الإبداع', '#8B5CF6'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'performance', 'Performance', 'الأداء', '#10B981'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'community', 'Digital Community Management', 'إدارة المجتمع الرقمي', '#3B82F6');

-- DECISION: D-02 (placeholder home branch "hq" until the real branch is named)
insert into public.branches (id, slug, name_en, name_ar, area, map_key, public_ips) values
  ('30000000-0000-4000-8000-000000000001', 'hq', 'Marketing HQ', 'مقر التسويق', 'Heliopolis', 'hq', '{127.0.0.1/32,::1/128}'),
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

insert into public.branch_secrets (branch_id) select id from public.branches;

-- Local only: a fixed QR secret for hq so tests can compute tokens.
update public.branch_secrets
  set hmac_secret = 'local-test-hmac-secret-0123456789abcdef'
  where branch_id = '30000000-0000-4000-8000-000000000001';

insert into public.settings (key, value) values
  ('lateness_grace_minutes', '15'),
  ('wip_limit', '6'),
  ('monthly_post_target', '12'),                       -- DECISION: D-15
  ('strategic_deadline_day', '25'),
  ('stage_targets_hours', '{"request":0,"performance_input":24,"intake":8,"brief_schedule":16,"production":40,"creative_review":8,"confirmation":24,"ready_to_publish":24,"published":0}'), -- DECISION: D-13
  ('verticals', '["Virtual Offices","Offices","Daily Reservation","Cocafe","Documents and Proposals"]'),
  ('formats', '["static","carousel","reel","long video","story","copy only","landing page","print","presentation or proposal"]'),
  ('platforms', '["facebook","instagram","linkedin","tiktok","snapchat","google_ads","website","print","internal"]'),
  ('post_platforms', '["facebook","instagram","linkedin","tiktok","snapchat"]');
