-- D6-01..D6-04 Content calendar (posts, media, approvals, reminders) and dashboard views.

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete restrict,
  card_id uuid unique references public.cards (id) on delete set null,
  branch_id uuid references public.branches (id) on delete set null,
  platforms text[] not null default '{}',
  scheduled_at timestamptz,
  format text not null default 'feed' check (format in ('feed', 'carousel', 'reel', 'story', 'text')),
  caption_ar text not null default '' check (length(caption_ar) <= 5000),
  caption_en text not null default '' check (length(caption_en) <= 5000),
  hashtags text[] not null default '{}',
  first_comment text not null default '' check (length(first_comment) <= 2000),
  pillar public.content_pillar,
  notes text not null default '' check (length(notes) <= 2000),
  status public.post_status not null default 'draft',
  owner_id uuid references public.profiles (id) on delete set null default auth.uid(),
  publisher_id uuid references public.profiles (id) on delete set null,
  approved_by uuid references public.profiles (id) on delete set null,
  review_comment text,
  reminded_for timestamptz,
  overdue_notified_at timestamptz,
  published_at timestamptz,
  published_links jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_scheduled_at_idx on public.posts (scheduled_at);
create index posts_brand_id_idx on public.posts (brand_id);
create index posts_branch_id_idx on public.posts (branch_id);
create index posts_owner_id_idx on public.posts (owner_id);
create index posts_publisher_id_idx on public.posts (publisher_id);
create index posts_approved_by_idx on public.posts (approved_by);
create trigger posts_updated_at before update on public.posts
  for each row execute function public.set_updated_at();

create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  attachment_id uuid references public.attachments (id) on delete set null,
  storage_path text not null,
  thumbnail_path text,
  media_type text not null check (media_type in ('image', 'video')),
  width int,
  height int,
  duration_seconds numeric,
  position text not null collate "C" default 'a0',
  created_at timestamptz not null default now()
);
create index post_media_post_id_idx on public.post_media (post_id, position);
create index post_media_attachment_id_idx on public.post_media (attachment_id);

-- Approved posts become scheduled when they get a time, and back when it is cleared.
-- A new time also resets the overdue alert so it can fire again.
create function public.posts_status_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.status in ('approved', 'scheduled') then
    new.status := case when new.scheduled_at is not null then 'scheduled' else 'approved' end;
  end if;
  if tg_op = 'UPDATE' and new.scheduled_at is distinct from old.scheduled_at then
    new.overdue_notified_at := null;
  end if;
  return new;
end $$;

create trigger posts_status_guard before insert or update on public.posts
  for each row execute function public.posts_status_guard();

-- ---------------------------------------------------------------------------
-- Access helpers
-- ---------------------------------------------------------------------------
create function public.can_view_post(p_post_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_active_user() and exists (
    select 1 from posts p
    left join cards c on c.id = p.card_id
    where p.id = p_post_id and (
      public.is_marketing()
      or (c.id is not null and c.requesting_department_id = public.my_department_id())
    )
  );
$$;

-- Row-level check from the post's own columns (works for the row being inserted).
create function public.post_visible(p_card_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_active_user() and (
    public.is_marketing()
    or (p_card_id is not null and exists (
      select 1 from cards c where c.id = p_card_id and c.requesting_department_id = public.my_department_id()))
  );
$$;

create function public.can_approve_posts() returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_any_role('{team_lead,super_admin}');
$$;

-- draft -> in_review by the owner or any marketing writer.
create function public.submit_post(p_post_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_marketing_writer() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update posts set status = 'in_review', review_comment = null where id = p_post_id and status = 'draft';
  if not found then
    raise exception 'transition_not_allowed' using errcode = 'P0001';
  end if;
  perform public.notify(ur.user_id, 'approval_waiting', '/content?post=' || p_post_id, jsonb_build_object('post_id', p_post_id))
  from user_roles ur join profiles pr on pr.id = ur.user_id and pr.status = 'active'
  join teams t on t.id = ur.team_id
  where ur.role = 'team_lead' and t.slug = 'community';
end $$;

create function public.decide_post(p_post_id uuid, p_approve boolean, p_comment text default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  p posts;
begin
  if not public.can_approve_posts() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select * into p from posts where id = p_post_id for update;
  if p.id is null or p.status <> 'in_review' then
    raise exception 'transition_not_allowed' using errcode = 'P0001';
  end if;
  if not p_approve and nullif(trim(coalesce(p_comment, '')), '') is null then
    raise exception 'missing_fields:comment' using errcode = 'P0001';
  end if;
  update posts set
    status = case when p_approve then 'approved' else 'draft' end::post_status,
    approved_by = case when p_approve then auth.uid() else null end,
    review_comment = nullif(trim(coalesce(p_comment, '')), '')
  where id = p.id;
  perform public.notify(p.owner_id, 'post_decided', '/content?post=' || p.id,
    jsonb_build_object('post_id', p.id, 'approved', p_approve));
end $$;

-- A ready card becomes an approved post (it already passed review and confirmation).
create function public.create_post_from_card(p_card_id uuid, p_scheduled_at timestamptz) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  c cards;
  new_id uuid;
  pos int := 0;
  a record;
  post_platforms text[] := array['facebook', 'instagram', 'linkedin', 'tiktok', 'snapchat'];
  images int;
  videos int;
begin
  if not public.is_marketing_writer() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select * into c from cards where id = p_card_id for update;
  if c.id is null or c.stage <> 'ready_to_publish' then
    raise exception 'transition_not_allowed' using errcode = 'P0001';
  end if;
  if exists (select 1 from posts where card_id = c.id) then
    raise exception 'post_exists' using errcode = 'P0001';
  end if;
  select count(*) filter (where mime like 'image/%'), count(*) filter (where mime like 'video/%')
    into images, videos
  from attachments where card_id = c.id and kind = 'file';

  insert into posts (brand_id, card_id, branch_id, platforms, scheduled_at, format, caption_en, notes, status, owner_id, approved_by)
  values (
    coalesce(c.brand_id, (select id from brands order by created_at limit 1)),
    c.id, c.branch_id,
    array(select unnest(c.platforms) intersect select unnest(post_platforms)),
    p_scheduled_at,
    case when videos > 0 and images = 0 then 'reel' when images > 1 then 'carousel' when images + videos = 0 then 'text' else 'feed' end,
    coalesce(c.key_message, ''),
    left(coalesce(c.description, ''), 2000),
    'approved', auth.uid(), c.approver_id
  ) returning id into new_id;

  for a in
    select id, storage_path, mime from attachments
    where card_id = c.id and kind = 'file' and (mime like 'image/%' or mime like 'video/%')
    order by created_at limit 10
  loop
    insert into post_media (post_id, attachment_id, storage_path, media_type, position)
    values (new_id, a.id, a.storage_path, case when a.mime like 'video/%' then 'video' else 'image' end, 'a' || pos);
    pos := pos + 1;
  end loop;
  return new_id;
end $$;

create function public.mark_post_published(p_post_id uuid, p_links jsonb default '{}') returns void
language plpgsql security definer set search_path = public as $$
declare
  p posts;
begin
  select * into p from posts where id = p_post_id for update;
  if p.id is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  -- coalesce: a NULL publisher must not turn the check into NULL (which IF treats as false).
  if not coalesce(p.publisher_id = auth.uid() or public.in_team('community') or public.has_any_role('{team_lead,super_admin}'), false)
     or not public.is_marketing_writer() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p.status not in ('approved', 'scheduled') then
    raise exception 'transition_not_allowed' using errcode = 'P0001';
  end if;
  update posts set status = 'published', published_at = now(), published_links = coalesce(p_links, '{}') where id = p.id;
  if p.card_id is not null and exists (select 1 from cards where id = p.card_id and stage = 'ready_to_publish') then
    perform public._set_card_stage(p.card_id, 'published', jsonb_build_object('post_id', p.id), null);
  end if;
end $$;

-- Every 5 minutes: 30-minute reminder (once per post time) and the 2-hour
-- "not marked as published" alert (once until the time changes).
create function public.cron_post_reminders(p_now timestamptz default now()) returns int
language plpgsql security definer set search_path = public as $$
declare
  p record;
  n int := 0;
  title text;
begin
  for p in
    select * from posts
    where status = 'scheduled' and scheduled_at > p_now and scheduled_at <= p_now + interval '30 minutes'
      and reminded_for is distinct from scheduled_at
    for update skip locked
  loop
    title := left(coalesce(nullif(p.caption_en, ''), nullif(p.caption_ar, ''), ''), 80);
    perform public.notify(coalesce(p.publisher_id, p.owner_id), 'post_reminder', '/content?post=' || p.id,
      jsonb_build_object('post_id', p.id, 'title', title, 'scheduled_at', p.scheduled_at));
    update posts set reminded_for = p.scheduled_at where id = p.id;
    n := n + 1;
  end loop;

  for p in
    select * from posts
    where status in ('scheduled', 'approved') and scheduled_at is not null
      and scheduled_at < p_now - interval '2 hours' and overdue_notified_at is null
    for update skip locked
  loop
    title := left(coalesce(nullif(p.caption_en, ''), nullif(p.caption_ar, ''), ''), 80);
    perform public.notify(coalesce(p.publisher_id, p.owner_id), 'post_overdue', '/content?post=' || p.id,
      jsonb_build_object('post_id', p.id, 'title', title));
    perform public.notify(ur.user_id, 'post_overdue', '/content?post=' || p.id, jsonb_build_object('post_id', p.id, 'title', title))
    from user_roles ur join teams t on t.id = ur.team_id
    where ur.role = 'team_lead' and t.slug = 'community' and ur.user_id is distinct from coalesce(p.publisher_id, p.owner_id);
    update posts set overdue_notified_at = p_now where id = p.id;
    n := n + 1;
  end loop;
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- Privileges and policies
-- ---------------------------------------------------------------------------
revoke update on public.posts from authenticated;
grant update (brand_id, branch_id, platforms, scheduled_at, format, caption_ar, caption_en, hashtags,
  first_comment, pillar, notes, publisher_id)
  on public.posts to authenticated;

alter table public.posts enable row level security;
alter table public.post_media enable row level security;

create policy posts_select on public.posts for select to authenticated using (public.post_visible(card_id));
create policy posts_insert on public.posts for insert to authenticated
  with check ((select public.is_marketing_writer()) and status in ('draft') and owner_id = (select auth.uid()));
create policy posts_update on public.posts for update to authenticated
  using ((select public.is_marketing_writer()) and status <> 'published')
  with check ((select public.is_marketing_writer()));
create policy posts_delete on public.posts for delete to authenticated
  using ((select public.is_marketing_writer()) and status in ('draft', 'in_review')
    and (owner_id = (select auth.uid()) or (select public.can_approve_posts())));

create policy post_media_select on public.post_media for select to authenticated using (public.can_view_post(post_id));
create policy post_media_write on public.post_media for all to authenticated
  using ((select public.is_marketing_writer())) with check ((select public.is_marketing_writer()));

insert into storage.buckets (id, name, public, file_size_limit)
values ('post-media', 'post-media', false, 524288000)
on conflict (id) do nothing;

create policy post_media_read on storage.objects for select to authenticated
  using (bucket_id = 'post-media' and (storage.foldername(name))[1] = 'posts'
    and public.can_view_post(public.try_uuid((storage.foldername(name))[2])));
create policy post_media_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'post-media' and (storage.foldername(name))[1] = 'posts' and (select public.is_marketing_writer()));
create policy post_media_update on storage.objects for update to authenticated
  using (bucket_id = 'post-media' and (select public.is_marketing_writer()));
create policy post_media_remove on storage.objects for delete to authenticated
  using (bucket_id = 'post-media' and (select public.is_marketing_writer()));

alter publication supabase_realtime add table public.posts;

-- ---------------------------------------------------------------------------
-- Dashboard views (security_invoker: row policies of the reader apply)
-- ---------------------------------------------------------------------------
create function public.pipeline_board_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from boards where is_pipeline;
$$;

create view public.v_card_flow with (security_invoker = true) as
select c.id as card_id, c.title, c.created_at, c.delivered_at, c.due_at,
  (c.delivered_at is not null and c.due_at is not null and c.delivered_at <= c.due_at) as on_time,
  round((extract(epoch from (c.delivered_at - c.created_at)) / 86400)::numeric, 2) as days_to_deliver,
  c.revision_count, c.requesting_department_id, c.vertical, c.brand_id, c.request_kind, c.is_late_submission,
  c.stage, c.board_id
from cards c
where c.board_id = public.pipeline_board_id() and c.archived_at is null;

create view public.v_stage_durations with (security_invoker = true) as
select sp.card_id, sp.stage,
  round((extract(epoch from (coalesce(sp.left_at, now()) - sp.entered_at)) / 3600)::numeric, 2) as hours,
  sp.entered_at, sp.left_at
from card_stage_periods sp;

create view public.v_workload with (security_invoker = true) as
select a.user_id, c.stage, count(*)::int as open_cards
from card_assignees a
join cards c on c.id = a.card_id
where c.archived_at is null and c.stage in ('brief_schedule', 'production', 'creative_review', 'confirmation')
group by a.user_id, c.stage;

create view public.v_attendance_daily with (security_invoker = true) as
select s.user_id,
  (s.checked_in_at at time zone 'Africa/Cairo')::date as day,
  true as checked_in,
  min(s.checked_in_at) as first_arrival,
  bool_or(s.is_late) as is_late,
  (array_agg(s.method order by s.checked_in_at))[1] as method,
  round(sum(extract(epoch from (coalesce(s.checked_out_at, least(now(), s.checked_in_at + interval '12 hours')) - s.checked_in_at)) / 3600)::numeric, 2) as hours
from attendance_sessions s
group by s.user_id, (s.checked_in_at at time zone 'Africa/Cairo')::date;

create view public.v_leave_usage with (security_invoker = true) as
select lb.user_id, lb.type_id, lb.year, lb.allowance, lb.used, lb.allowance - lb.used as remaining
from leave_balances lb;

create view public.v_posts_monthly with (security_invoker = true) as
select p.brand_id,
  date_trunc('month', coalesce(p.published_at, p.scheduled_at) at time zone 'Africa/Cairo')::date as month,
  count(*) filter (where p.status = 'published')::int as published,
  count(*) filter (where p.status = 'scheduled')::int as scheduled,
  coalesce((select (value #>> '{}')::int from settings where key = 'monthly_post_target'), 12) as target
from posts p
where coalesce(p.published_at, p.scheduled_at) is not null
group by p.brand_id, date_trunc('month', coalesce(p.published_at, p.scheduled_at) at time zone 'Africa/Cairo');

revoke all on public.v_card_flow, public.v_stage_durations, public.v_workload, public.v_attendance_daily,
  public.v_leave_usage, public.v_posts_monthly from anon;
grant select on public.v_card_flow, public.v_stage_durations, public.v_workload, public.v_attendance_daily,
  public.v_leave_usage, public.v_posts_monthly to authenticated;

grant execute on function public.pipeline_board_id(), public.can_view_post(uuid), public.post_visible(uuid), public.can_approve_posts(), public.submit_post(uuid),
  public.decide_post(uuid, boolean, text), public.create_post_from_card(uuid, timestamptz),
  public.mark_post_published(uuid, jsonb)
  to authenticated;
revoke execute on function public.cron_post_reminders(timestamptz), public.posts_status_guard() from authenticated;
grant execute on function public.cron_post_reminders(timestamptz) to service_role;

revoke execute on all functions in schema public from public, anon;
