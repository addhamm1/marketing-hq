-- Day 3 seed: holidays and leave allowances.
-- Production: allowances start at 0 and HR sets them (DECISIONS D-05). Locally the test users get some.

insert into public.holidays (day, name_en, name_ar, is_half_day) values
  ('2026-10-06', 'Armed Forces Day', 'عيد القوات المسلحة', false),
  ('2027-01-07', 'Coptic Christmas', 'عيد الميلاد المجيد', false),
  ('2027-01-25', 'Revolution Day', 'عيد ثورة 25 يناير', false),
  -- Expected dates: Eid al-Fitr, Arafat Day, Eid al-Adha, Islamic New Year and the Prophet's Birthday
  -- depend on the moon, and Sham El Nessim follows Coptic Easter. Confirm each one in Admin when announced.
  ('2027-03-10', 'Eid al-Fitr', 'عيد الفطر', false),       -- expected (moon)
  ('2027-03-11', 'Eid al-Fitr', 'عيد الفطر', false),       -- expected (moon)
  ('2027-03-12', 'Eid al-Fitr', 'عيد الفطر', false),       -- expected (moon)
  ('2027-04-25', 'Sinai Liberation Day', 'عيد تحرير سيناء', false),
  ('2027-05-01', 'Labour Day', 'عيد العمال', false),
  ('2027-05-03', 'Sham El Nessim', 'شم النسيم', false),    -- expected (Coptic Easter)
  ('2027-05-15', 'Arafat Day', 'وقفة عرفات', false),       -- expected (moon)
  ('2027-05-16', 'Eid al-Adha', 'عيد الأضحى', false),      -- expected (moon)
  ('2027-05-17', 'Eid al-Adha', 'عيد الأضحى', false),      -- expected (moon)
  ('2027-05-18', 'Eid al-Adha', 'عيد الأضحى', false),      -- expected (moon)
  ('2027-06-06', 'Islamic New Year', 'رأس السنة الهجرية', false), -- expected (moon)
  ('2027-06-30', 'June 30 Revolution', 'ذكرى ثورة 30 يونيو', false),
  ('2027-07-23', 'Revolution Day', 'عيد ثورة 23 يوليو', false),
  ('2027-08-15', 'Prophet''s Birthday', 'المولد النبوي الشريف', false), -- expected (moon)
  ('2027-10-06', 'Armed Forces Day', 'عيد القوات المسلحة', false)
on conflict (day) do nothing;

insert into public.leave_balances (user_id, type_id, year, allowance)
select p.id, t.id, y.year,
  case t.key when 'annual_leave' then 21 when 'casual_leave' then 6 when 'sick_leave' then 15 else 30 end
from public.profiles p
cross join public.request_types t
cross join (values (2026), (2027)) as y(year)
where t.is_leave and p.email like '%@test.local';
