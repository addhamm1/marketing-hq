-- Day 6 seed: content calendar posts around today (local and staging only).
insert into public.posts (brand_id, platforms, scheduled_at, format, caption_en, caption_ar, hashtags, pillar, status, owner_id, publisher_id, approved_by, published_at)
select
  (array['40000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000003'])[1 + g.n % 4]::uuid,
  (array['{instagram,facebook}', '{linkedin}', '{instagram}', '{tiktok,instagram}'])[1 + g.n % 4]::text[],
  date_trunc('day', now() at time zone 'Africa/Cairo') at time zone 'Africa/Cairo' + (g.n - 8) * interval '1 day' + interval '13 hours' + (g.n % 3) * interval '3 hours',
  (array['feed', 'carousel', 'reel', 'story', 'text'])[1 + g.n % 5],
  (array['Your next big idea deserves a space that works as hard as you do.',
         'Five trends shaping how Egyptian teams work in 2026.',
         'Meet the founders building from our Saraya branch.',
         'Fresh menu, same focus. Your table is ready at Cocafe.',
         'Book a meeting room in two taps.'])[1 + g.n % 5],
  (array['فكرتك الجاية محتاجة مكان يشتغل زيك.', 'خمس اتجاهات بتغيّر شغل الفرق في مصر.', 'تعرّف على رواد الأعمال في فرع سرايا.', 'منيو جديد وتركيز أكتر في كوكافيه.', 'احجز غرفة اجتماعات في ثانيتين.'])[1 + g.n % 5],
  '{espaces,coworking}',
  (array['awareness', 'engagement', 'insights', 'offer', 'community'])[1 + g.n % 5]::public.content_pillar,
  case when g.n < 8 then 'published' when g.n < 11 then 'scheduled' when g.n < 13 then 'in_review' else 'draft' end::public.post_status,
  '00000000-0000-4000-8000-000000000008',
  '00000000-0000-4000-8000-000000000008',
  case when g.n < 11 then '00000000-0000-4000-8000-000000000004'::uuid end,
  case when g.n < 8 then now() - (8 - g.n) * interval '1 day' end
from generate_series(1, 15) as g(n);
