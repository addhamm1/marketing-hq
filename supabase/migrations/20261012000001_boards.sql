-- D2-01 Boards, cards, content cycle, approvals and notifications schema.
-- DATA_MODEL.md sections 5, 6, 9, 10, 11.

-- ---------------------------------------------------------------------------
-- Extra helpers
-- ---------------------------------------------------------------------------
create function public.my_department_id() returns uuid
language sql stable security definer set search_path = public as $$
  select department_id from profiles where id = auth.uid() and status = 'active';
$$;

-- Marketing user who does work (excludes leadership-only, which is read-only).
create function public.is_marketing_writer() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_marketing()
    and public.has_any_role('{super_admin,team_lead,traffic_manager,member}');
$$;

create function public.try_uuid(t text) returns uuid
language plpgsql immutable set search_path = public as $$
begin
  return t::uuid;
exception when others then
  return null;
end $$;

-- ---------------------------------------------------------------------------
-- Brands, workspaces, boards, lists
-- ---------------------------------------------------------------------------
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  color text not null default '#0F766E',
  created_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_ar text not null,
  slug text not null unique,
  team_id uuid references public.teams (id) on delete set null,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index workspaces_team_id_idx on public.workspaces (team_id);

create table public.boards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete restrict,
  name text not null check (length(name) between 1 and 120),
  description text not null default '',
  is_pipeline boolean not null default false,
  visibility text not null default 'marketing' check (visibility in ('marketing', 'private')),
  created_by uuid references public.profiles (id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index boards_one_pipeline on public.boards (is_pipeline) where is_pipeline;
create index boards_workspace_id_idx on public.boards (workspace_id);
create index boards_created_by_idx on public.boards (created_by);
create trigger boards_updated_at before update on public.boards
  for each row execute function public.set_updated_at();

create table public.board_members (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (board_id, user_id)
);
create index board_members_user_id_idx on public.board_members (user_id);

create table public.lists (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  position text not null collate "C",
  stage public.card_stage,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create index lists_board_id_idx on public.lists (board_id, position);
create unique index lists_board_stage_idx on public.lists (board_id, stage) where stage is not null;

-- ---------------------------------------------------------------------------
-- Strategic plans and cards
-- ---------------------------------------------------------------------------
create table public.strategic_plans (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments (id) on delete restrict,
  submitted_by uuid not null references public.profiles (id) on delete restrict,
  for_month date not null check (extract(day from for_month) = 1),
  submitted_at timestamptz not null default now(),
  is_late boolean not null default false,
  created_at timestamptz not null default now()
);
create index strategic_plans_department_id_idx on public.strategic_plans (department_id, for_month);
create index strategic_plans_submitted_by_idx on public.strategic_plans (submitted_by);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  list_id uuid not null references public.lists (id) on delete restrict,
  position text not null collate "C",
  title text not null check (length(title) between 1 and 200),
  description text not null default '',
  objective text,
  key_message text,
  reference_links jsonb not null default '[]',
  performance_notes text,
  stage public.card_stage,
  request_kind public.card_request_kind,
  requesting_department_id uuid references public.departments (id) on delete set null,
  requester_id uuid references public.profiles (id) on delete set null,
  vertical text,
  brand_id uuid references public.brands (id) on delete set null,
  branch_id uuid references public.branches (id) on delete set null,
  format text,
  platforms text[] not null default '{}',
  priority public.card_priority not null default 'normal',
  due_at timestamptz,
  stage_due_at timestamptz,
  stage_entered_at timestamptz,
  due_notified_for timestamptz,
  reviewer_id uuid references public.profiles (id) on delete set null,
  approver_id uuid references public.profiles (id) on delete set null,
  revision_count int not null default 0,
  is_late_submission boolean not null default false,
  returned_reason text,
  missing_items text[] not null default '{}',
  urgent_reason text,
  budget_note text,
  strategic_plan_id uuid references public.strategic_plans (id) on delete set null,
  delivered_at timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cards_board_list_idx on public.cards (board_id, list_id, position) where archived_at is null;
create index cards_list_id_idx on public.cards (list_id);
create index cards_stage_idx on public.cards (stage) where stage is not null and archived_at is null;
create index cards_requesting_department_id_idx on public.cards (requesting_department_id);
create index cards_requester_id_idx on public.cards (requester_id);
create index cards_brand_id_idx on public.cards (brand_id);
create index cards_branch_id_idx on public.cards (branch_id);
create index cards_reviewer_id_idx on public.cards (reviewer_id);
create index cards_approver_id_idx on public.cards (approver_id);
create index cards_strategic_plan_id_idx on public.cards (strategic_plan_id);
create index cards_created_by_idx on public.cards (created_by);
create index cards_due_at_idx on public.cards (due_at) where archived_at is null;
create trigger cards_updated_at before update on public.cards
  for each row execute function public.set_updated_at();

create table public.card_assignees (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.assignee_role not null default 'other',
  created_at timestamptz not null default now(),
  unique (card_id, user_id, role)
);
create index card_assignees_user_id_idx on public.card_assignees (user_id);

create table public.card_events (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  kind text not null check (kind in (
    'created', 'stage_change', 'assign', 'unassign', 'due_change', 'revision', 'returned',
    'resubmitted', 'comment', 'import', 'update', 'approval', 'archived', 'attachment', 'label', 'checklist'
  )),
  from_stage public.card_stage,
  to_stage public.card_stage,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index card_events_card_id_idx on public.card_events (card_id, created_at desc);
create index card_events_actor_id_idx on public.card_events (actor_id);

create table public.card_stage_periods (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  stage public.card_stage not null,
  entered_at timestamptz not null default now(),
  left_at timestamptz
);
create index card_stage_periods_card_id_idx on public.card_stage_periods (card_id, entered_at);

create table public.labels (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  name text not null check (length(name) between 1 and 40),
  color text not null default '#64748B',
  created_at timestamptz not null default now()
);
create index labels_board_id_idx on public.labels (board_id);

create table public.card_labels (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  label_id uuid not null references public.labels (id) on delete cascade,
  unique (card_id, label_id)
);
create index card_labels_label_id_idx on public.card_labels (label_id);

create table public.checklists (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  title text not null check (length(title) between 1 and 120),
  position text not null collate "C" default 'a0',
  created_at timestamptz not null default now()
);
create index checklists_card_id_idx on public.checklists (card_id);

create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.checklists (id) on delete cascade,
  text text not null check (length(text) between 1 and 300),
  done boolean not null default false,
  position text not null collate "C" default 'a0',
  assignee_id uuid references public.profiles (id) on delete set null,
  due_at timestamptz,
  created_at timestamptz not null default now()
);
create index checklist_items_checklist_id_idx on public.checklist_items (checklist_id);
create index checklist_items_assignee_id_idx on public.checklist_items (assignee_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (length(body) between 1 and 5000),
  mentions uuid[] not null default '{}',
  edited_at timestamptz,
  created_at timestamptz not null default now()
);
create index comments_card_id_idx on public.comments (card_id, created_at);
create index comments_author_id_idx on public.comments (author_id);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('file', 'link')),
  storage_path text,
  url text,
  name text not null check (length(name) between 1 and 255),
  mime text,
  size bigint,
  created_at timestamptz not null default now(),
  check ((kind = 'file' and storage_path is not null) or (kind = 'link' and url is not null))
);
create index attachments_card_id_idx on public.attachments (card_id);
create index attachments_uploaded_by_idx on public.attachments (uploaded_by);

-- ---------------------------------------------------------------------------
-- Requests, approvals, notifications
-- ---------------------------------------------------------------------------
create table public.request_types (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name_en text not null,
  name_ar text not null,
  category text not null check (category in ('leave', 'special')),
  form_schema jsonb not null default '{"fields": []}',
  approval_chain jsonb not null default '[]',
  is_leave boolean not null default false,
  counts_working_days boolean not null default false,
  requires_attachment_after_days int,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  type_id uuid not null references public.request_types (id) on delete restrict,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  status public.request_status not null default 'pending',
  data jsonb not null default '{}',
  starts_on date,
  ends_on date,
  days numeric,
  submitted_at timestamptz not null default now(),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index requests_type_id_idx on public.requests (type_id);
create index requests_requester_id_idx on public.requests (requester_id, submitted_at desc);
create index requests_dates_idx on public.requests (starts_on, ends_on) where status = 'approved';

create table public.approval_steps (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('request', 'card')),
  subject_id uuid not null,
  card_stage public.card_stage,
  step_index int not null,
  approver_id uuid not null references public.profiles (id) on delete cascade,
  status public.step_status not null,
  comment text,
  revision_reason public.revision_reason,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index approval_steps_subject_idx on public.approval_steps (subject_type, subject_id, step_index);
create index approval_steps_approver_active_idx on public.approval_steps (approver_id) where status = 'active';
create index approval_steps_approver_id_idx on public.approval_steps (approver_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  title text not null default '',
  body text not null default '',
  link text,
  data jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_unread_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Board and card access helpers
-- ---------------------------------------------------------------------------
create function public.is_board_member(p_board_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from board_members where board_id = p_board_id and user_id = auth.uid());
$$;

create function public.can_view_board(p_board_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_active_user() and exists (
    select 1 from boards b
    where b.id = p_board_id and (
      (b.visibility = 'marketing' and public.is_marketing())
      or (b.visibility = 'private' and public.has_role('super_admin'))
      or public.is_board_member(b.id)
    )
  );
$$;

-- Team leads, traffic, super_admin and the board creator (DATA_MODEL.md section 9).
create function public.can_edit_board(p_board_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_marketing_writer() and exists (
    select 1 from boards b
    where b.id = p_board_id and (
      (not b.is_pipeline and (
        public.has_any_role('{team_lead,traffic_manager,super_admin}') or b.created_by = auth.uid()
      ))
      or (b.is_pipeline and public.has_any_role('{traffic_manager,super_admin}'))
    )
  );
$$;

-- Marketing writers on shared non-pipeline boards, board members (including
-- guests) on non-pipeline boards, plus can_edit_board.
create function public.can_add_to_board(p_board_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_active_user() and exists (
    select 1 from boards b
    where b.id = p_board_id and b.archived_at is null and not b.is_pipeline and (
      (b.visibility = 'marketing' and public.is_marketing_writer())
      or public.is_board_member(b.id)
      or public.can_edit_board(b.id)
    )
  );
$$;

-- Visibility of a card from its own columns (used directly by the cards policy).
create function public.card_visible(p_board_id uuid, p_department_id uuid, p_approver_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_active_user() and exists (
    select 1 from boards b
    where b.id = p_board_id and (
      (b.visibility = 'marketing' and public.is_marketing())
      or (b.visibility = 'private' and public.has_role('super_admin'))
      or public.is_board_member(b.id)
      or (b.is_pipeline and (
        (p_department_id is not null and p_department_id = public.my_department_id())
        or p_approver_id = auth.uid()
      ))
    )
  );
$$;

create function public.can_view_card(p_card_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from cards c
    where c.id = p_card_id and public.card_visible(c.board_id, c.requesting_department_id, c.approver_id)
  );
$$;

-- Assignees, reviewer, team leads, traffic, super_admin; plus the creator and,
-- on shared free-form boards, anyone who may add cards there.
create function public.can_edit_card(p_card_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_active_user() and exists (
    select 1 from cards c
    join boards b on b.id = c.board_id
    where c.id = p_card_id
      and public.card_visible(c.board_id, c.requesting_department_id, c.approver_id)
      and (
        exists (select 1 from card_assignees a where a.card_id = c.id and a.user_id = auth.uid())
        or c.reviewer_id = auth.uid()
        or (public.has_any_role('{team_lead,traffic_manager,super_admin}') and public.is_marketing_writer())
        or (not b.is_pipeline and (c.created_by = auth.uid() or public.can_add_to_board(b.id)))
      )
  );
$$;

create function public.can_view_request(p_request_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_active_user() and exists (
    select 1 from requests r
    where r.id = p_request_id and (
      r.requester_id = auth.uid()
      or public.is_team_lead_of(r.requester_id)
      or public.has_any_role('{hr,super_admin}')
      or exists (
        select 1 from approval_steps s
        where s.subject_type = 'request' and s.subject_id = r.id and s.approver_id = auth.uid()
      )
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- Pipeline integrity
-- ---------------------------------------------------------------------------
create function public.cards_pipeline_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  b boards;
  l lists;
begin
  select * into b from boards where id = new.board_id;
  select * into l from lists where id = new.list_id;
  if l.board_id is distinct from new.board_id then
    raise exception 'list does not belong to the board' using errcode = '23514';
  end if;
  if b.is_pipeline then
    if new.stage is null or l.stage is distinct from new.stage then
      raise exception 'pipeline card list must match its stage' using errcode = '23514';
    end if;
  elsif new.stage is not null then
    raise exception 'only pipeline cards have a stage' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and new.board_id <> old.board_id then
    raise exception 'cards cannot move between boards' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger cards_pipeline_guard before insert or update of board_id, list_id, stage on public.cards
  for each row execute function public.cards_pipeline_guard();

create function public.lists_pipeline_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from boards where id = coalesce(new.board_id, old.board_id) and is_pipeline)
     and not public.has_role('super_admin')
     and current_setting('role', true) = 'authenticated' then
    raise exception 'pipeline lists are fixed' using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;

create trigger lists_pipeline_guard before insert or update or delete on public.lists
  for each row execute function public.lists_pipeline_guard();

-- ---------------------------------------------------------------------------
-- Notifications (internal; never executable by clients)
-- ---------------------------------------------------------------------------
create function public.notify(
  p_user_id uuid, p_kind text, p_link text, p_data jsonb default '{}', p_title text default '', p_body text default ''
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_user_id is null then return; end if;
  if not exists (select 1 from profiles where id = p_user_id and status = 'active') then return; end if;
  insert into notifications (user_id, kind, title, body, link, data)
  values (p_user_id, p_kind, coalesce(p_title, ''), coalesce(p_body, ''), p_link, coalesce(p_data, '{}'));
end $$;

create function public.card_link(p_card_id uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when b.is_pipeline then '/boards/' || c.board_id || '?card=' || c.id
    else '/boards/' || c.board_id || '?card=' || c.id
  end
  from cards c join boards b on b.id = c.board_id where c.id = p_card_id;
$$;

-- ---------------------------------------------------------------------------
-- Card activity triggers
-- ---------------------------------------------------------------------------
create function public.card_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  changed text[] := '{}';
  f text;
  content_fields text[] := array['title', 'description', 'objective', 'key_message', 'reference_links',
    'performance_notes', 'vertical', 'brand_id', 'branch_id', 'format', 'platforms', 'priority',
    'stage_due_at', 'budget_note', 'reviewer_id', 'approver_id'];
  o jsonb;
  n jsonb;
begin
  if tg_op = 'INSERT' then
    insert into card_events (card_id, actor_id, kind, to_stage, data)
    values (new.id, auth.uid(), 'created', new.stage, jsonb_build_object('title', new.title));
    if new.stage is not null then
      insert into card_stage_periods (card_id, stage, entered_at) values (new.id, new.stage, now());
    end if;
    return new;
  end if;

  o := to_jsonb(old);
  n := to_jsonb(new);
  foreach f in array content_fields loop
    if o -> f is distinct from n -> f then changed := array_append(changed, f); end if;
  end loop;
  -- Stage moves record their own event; skip the field diff they cause.
  if array_length(changed, 1) > 0 and old.stage is not distinct from new.stage then
    insert into card_events (card_id, actor_id, kind, data)
    values (new.id, auth.uid(), 'update', jsonb_build_object('fields', changed));
  end if;
  if old.due_at is distinct from new.due_at then
    insert into card_events (card_id, actor_id, kind, data)
    values (new.id, auth.uid(), 'due_change', jsonb_build_object('from', old.due_at, 'to', new.due_at));
  end if;
  if old.archived_at is null and new.archived_at is not null then
    insert into card_events (card_id, actor_id, kind) values (new.id, auth.uid(), 'archived');
  end if;
  if old.list_id is distinct from new.list_id and new.stage is null then
    insert into card_events (card_id, actor_id, kind, data)
    values (new.id, auth.uid(), 'update', jsonb_build_object('fields', array['list_id'], 'from', old.list_id, 'to', new.list_id));
  end if;
  return new;
end $$;

create trigger cards_activity after insert or update on public.cards
  for each row execute function public.card_activity();

create function public.assignee_activity() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into card_events (card_id, actor_id, kind, data)
    values (new.card_id, auth.uid(), 'assign', jsonb_build_object('user_id', new.user_id, 'role', new.role));
    if new.user_id is distinct from auth.uid() then
      perform public.notify(new.user_id, 'assigned', public.card_link(new.card_id),
        jsonb_build_object('card_id', new.card_id, 'title', (select title from cards where id = new.card_id)));
    end if;
    return new;
  end if;
  insert into card_events (card_id, actor_id, kind, data)
  values (old.card_id, auth.uid(), 'unassign', jsonb_build_object('user_id', old.user_id, 'role', old.role));
  return old;
end $$;

create trigger card_assignees_activity after insert or delete on public.card_assignees
  for each row execute function public.assignee_activity();

create function public.comment_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m uuid;
  t text;
begin
  select title into t from cards where id = new.card_id;
  insert into card_events (card_id, actor_id, kind, data)
  values (new.card_id, new.author_id, 'comment', jsonb_build_object('comment_id', new.id));
  foreach m in array (select array(select distinct unnest(new.mentions))) loop
    if m <> new.author_id then
      perform public.notify(m, 'mentioned', public.card_link(new.card_id),
        jsonb_build_object('card_id', new.card_id, 'title', t, 'by', new.author_id));
    end if;
  end loop;
  return new;
end $$;

create trigger comments_activity after insert on public.comments
  for each row execute function public.comment_activity();

create function public.attachment_activity() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into card_events (card_id, actor_id, kind, data)
  values (new.card_id, new.uploaded_by, 'attachment', jsonb_build_object('name', new.name, 'kind', new.kind));
  return new;
end $$;

create trigger attachments_activity after insert on public.attachments
  for each row execute function public.attachment_activity();

create trigger audit_cards after update of archived_at or delete on public.cards
  for each row execute function public.audit_row();
create trigger audit_approval_steps after update on public.approval_steps
  for each row execute function public.audit_row();
create trigger audit_requests after update of status on public.requests
  for each row when (old.status is distinct from new.status) execute function public.audit_row();

-- ---------------------------------------------------------------------------
-- Content cycle: internal stage setter
-- ---------------------------------------------------------------------------
create function public._set_card_stage(p_card_id uuid, p_to public.card_stage, p_data jsonb default '{}', p_stage_due timestamptz default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  c cards;
  target_list uuid;
begin
  select * into c from cards where id = p_card_id for update;
  select id into target_list from lists where board_id = c.board_id and stage = p_to;
  if target_list is null then
    raise exception 'no list for stage %', p_to using errcode = 'P0002';
  end if;

  update card_stage_periods set left_at = now() where card_id = c.id and left_at is null;
  insert into card_stage_periods (card_id, stage, entered_at) values (c.id, p_to, now());

  update cards set
    stage = p_to,
    list_id = target_list,
    stage_entered_at = now(),
    stage_due_at = p_stage_due,
    delivered_at = case when p_to = 'ready_to_publish' and delivered_at is null then now() else delivered_at end,
    published_at = case when p_to = 'published' and published_at is null then now() else published_at end
  where id = c.id;

  insert into card_events (card_id, actor_id, kind, from_stage, to_stage, data)
  values (c.id, auth.uid(), 'stage_change', c.stage, p_to, coalesce(p_data, '{}'));
end $$;

-- Create the review or confirmation step for a card. Refuses if nobody resolves.
create function public._create_card_step(p_card_id uuid, p_stage public.card_stage) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  c cards;
  who uuid;
  idx int;
  step uuid;
begin
  select * into c from cards where id = p_card_id;
  who := case when p_stage = 'creative_review' then c.reviewer_id else c.approver_id end;
  if who is null or not exists (select 1 from profiles where id = who and status = 'active') then
    raise exception '%', case when p_stage = 'creative_review' then 'missing_reviewer' else 'missing_approver' end
      using errcode = 'P0001';
  end if;
  select coalesce(max(step_index), -1) + 1 into idx
  from approval_steps where subject_type = 'card' and subject_id = c.id;
  insert into approval_steps (subject_type, subject_id, card_stage, step_index, approver_id, status)
  values ('card', c.id, p_stage, idx, who, 'active')
  returning id into step;
  perform public.notify(who, 'approval_waiting', '/approvals',
    jsonb_build_object('card_id', c.id, 'title', c.title, 'stage', p_stage, 'step_id', step));
  return step;
end $$;

-- ---------------------------------------------------------------------------
-- move_card_stage (D2-04)
-- payload: stage_due_at, assignees [{user_id, role}], performance_notes,
--          no_input, returned_reason, missing_items
-- ---------------------------------------------------------------------------
create function public.move_card_stage(p_card_id uuid, p_to public.card_stage, p_payload jsonb default '{}')
returns void
language plpgsql security definer set search_path = public as $$
declare
  c cards;
  me uuid := auth.uid();
  is_admin boolean := public.has_role('super_admin');
  is_traffic boolean := public.has_role('traffic_manager');
  is_perf_lead boolean := exists (
    select 1 from user_roles ur join teams t on t.id = ur.team_id
    where ur.user_id = me and ur.role = 'team_lead' and t.slug = 'performance'
  );
  is_assignee boolean;
  stage_due timestamptz := nullif(p_payload ->> 'stage_due_at', '')::timestamptz;
  a jsonb;
  missing text[] := '{}';
  allowed boolean := false;
  data jsonb := '{}';
begin
  if not public.is_active_user() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select * into c from cards where id = p_card_id for update;
  if c.id is null or c.stage is null or c.archived_at is not null then
    raise exception 'card not found' using errcode = 'P0002';
  end if;
  if not public.card_visible(c.board_id, c.requesting_department_id, c.approver_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if c.stage = p_to then return; end if;

  -- Moves out of review stages happen only through decide_step.
  if c.stage in ('creative_review', 'confirmation') then
    raise exception 'review_stage_locked' using errcode = 'P0001';
  end if;
  if p_to = 'confirmation' or p_to = 'request' and c.stage <> 'intake' then
    raise exception 'transition_not_allowed' using errcode = 'P0001';
  end if;

  is_assignee := exists (select 1 from card_assignees where card_id = c.id and user_id = me);

  -- Transition table with who may do it.
  allowed := case
    when c.stage = 'performance_input' and p_to = 'intake' then is_perf_lead or is_traffic or is_admin
    when c.stage = 'intake' and p_to in ('brief_schedule', 'request') then is_traffic or is_admin
    when c.stage = 'brief_schedule' and p_to = 'production' then is_traffic or is_admin
    when c.stage = 'brief_schedule' and p_to = 'intake' then is_traffic or is_admin
    when c.stage = 'production' and p_to = 'creative_review' then is_assignee or is_traffic or is_admin
    when c.stage = 'production' and p_to = 'brief_schedule' then is_traffic or is_admin
    when c.stage = 'ready_to_publish' and p_to = 'published' then
      is_traffic or is_admin or public.in_team('community') or public.has_role('team_lead')
    when c.stage = 'published' and p_to = 'reported' then is_traffic or is_admin
    when c.stage = 'published' and p_to = 'ready_to_publish' then is_traffic or is_admin
    else null
  end;
  if allowed is null then
    raise exception 'transition_not_allowed' using errcode = 'P0001';
  end if;
  if not allowed or not public.is_marketing_writer() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  -- Stage-specific payload and required fields.
  if c.stage = 'performance_input' then
    if coalesce((p_payload ->> 'no_input')::boolean, false) then
      data := jsonb_build_object('no_input', true);
    elsif nullif(trim(p_payload ->> 'performance_notes'), '') is not null then
      update cards set performance_notes = p_payload ->> 'performance_notes' where id = c.id;
      data := jsonb_build_object('performance_notes', true);
    elsif c.performance_notes is null then
      raise exception 'missing_fields:performance_notes' using errcode = 'P0001';
    end if;
  end if;

  if c.stage = 'intake' and p_to = 'brief_schedule' then
    if nullif(trim(c.title), '') is null then missing := array_append(missing, 'title'); end if;
    if nullif(trim(coalesce(c.objective, '')), '') is null then missing := array_append(missing, 'objective'); end if;
    if nullif(trim(coalesce(c.vertical, '')), '') is null then missing := array_append(missing, 'vertical'); end if;
    if c.brand_id is null then missing := array_append(missing, 'brand_id'); end if;
    if nullif(trim(coalesce(c.format, '')), '') is null then missing := array_append(missing, 'format'); end if;
    if coalesce(array_length(c.platforms, 1), 0) = 0 then missing := array_append(missing, 'platforms'); end if;
    if c.due_at is null then missing := array_append(missing, 'due_at'); end if;
    if c.requester_id is null then missing := array_append(missing, 'requester_id'); end if;
    if array_length(missing, 1) > 0 then
      raise exception 'missing_fields:%', array_to_string(missing, ',') using errcode = 'P0001';
    end if;
  end if;

  if c.stage = 'intake' and p_to = 'request' then
    if nullif(trim(coalesce(p_payload ->> 'returned_reason', '')), '') is null then
      raise exception 'missing_fields:returned_reason' using errcode = 'P0001';
    end if;
    update cards set
      returned_reason = p_payload ->> 'returned_reason',
      missing_items = coalesce(array(select jsonb_array_elements_text(p_payload -> 'missing_items')), '{}')
    where id = c.id;
    insert into card_events (card_id, actor_id, kind, data)
    values (c.id, me, 'returned', jsonb_build_object('reason', p_payload ->> 'returned_reason',
      'missing_items', coalesce(p_payload -> 'missing_items', '[]')));
    -- Notify the requester and the department (D3-02).
    perform public.notify(c.requester_id, 'card_returned', '/portal/requests/' || c.id,
      jsonb_build_object('card_id', c.id, 'title', c.title, 'reason', p_payload ->> 'returned_reason'));
  end if;

  if c.stage = 'brief_schedule' and p_to = 'production' then
    for a in select * from jsonb_array_elements(coalesce(p_payload -> 'assignees', '[]')) loop
      insert into card_assignees (card_id, user_id, role)
      values (c.id, (a ->> 'user_id')::uuid, coalesce(nullif(a ->> 'role', ''), 'other')::assignee_role)
      on conflict do nothing;
    end loop;
    if not exists (select 1 from card_assignees where card_id = c.id) then missing := array_append(missing, 'assignees'); end if;
    if stage_due is null then missing := array_append(missing, 'stage_due_at'); end if;
    if array_length(missing, 1) > 0 then
      raise exception 'missing_fields:%', array_to_string(missing, ',') using errcode = 'P0001';
    end if;
  end if;

  if p_to = 'creative_review' then
    perform public._set_card_stage(c.id, p_to, data, stage_due);
    perform public._create_card_step(c.id, 'creative_review');
    return;
  end if;

  if p_to = 'request' then
    stage_due := null;
  end if;
  perform public._set_card_stage(c.id, p_to, data, stage_due);
end $$;

-- ---------------------------------------------------------------------------
-- decide_step for card steps (request steps arrive in the Day 3 migration).
-- ---------------------------------------------------------------------------
create function public.decide_step(
  p_step_id uuid, p_decision public.step_status, p_comment text default null, p_reason public.revision_reason default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  s approval_steps;
  c cards;
  next_step uuid;
begin
  select * into s from approval_steps where id = p_step_id for update;
  if s.id is null or s.approver_id <> auth.uid() or s.status <> 'active' or not public.is_active_user() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if s.subject_type <> 'card' then
    raise exception 'request steps not supported yet' using errcode = 'P0001';
  end if;
  if p_decision not in ('approved', 'changes_requested') then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;
  if p_decision = 'changes_requested' and (p_reason is null or nullif(trim(coalesce(p_comment, '')), '') is null) then
    raise exception 'missing_fields:reason' using errcode = 'P0001';
  end if;

  select * into c from cards where id = s.subject_id for update;
  if c.stage is distinct from s.card_stage then
    raise exception 'stale_step' using errcode = 'P0001';
  end if;

  update approval_steps set status = p_decision, comment = p_comment, revision_reason = p_reason, decided_at = now()
  where id = s.id;
  update approval_steps set status = 'skipped', decided_at = now()
  where subject_type = s.subject_type and subject_id = s.subject_id and step_index = s.step_index
    and id <> s.id and status in ('active', 'waiting');

  insert into card_events (card_id, actor_id, kind, from_stage, data)
  values (c.id, auth.uid(), 'approval', c.stage,
    jsonb_build_object('decision', p_decision, 'comment', p_comment, 'reason', p_reason));

  if p_decision = 'changes_requested' then
    update cards set revision_count = revision_count + 1 where id = c.id;
    insert into card_events (card_id, actor_id, kind, data)
    values (c.id, auth.uid(), 'revision', jsonb_build_object('reason', p_reason, 'comment', p_comment, 'stage', c.stage));
    perform public._set_card_stage(c.id, 'production', jsonb_build_object('changes_requested', true), null);
    perform public.notify(a.user_id, 'card_changes_requested', public.card_link(c.id),
      jsonb_build_object('card_id', c.id, 'title', c.title, 'reason', p_reason))
    from card_assignees a where a.card_id = c.id;
    return;
  end if;

  if c.stage = 'creative_review' then
    -- Same approver for both steps: merge confirmation (DATA_MODEL.md section 6, rule 5).
    if c.approver_id = auth.uid() then
      insert into approval_steps (subject_type, subject_id, card_stage, step_index, approver_id, status, comment, decided_at)
      values ('card', c.id, 'confirmation', s.step_index + 1, c.approver_id, 'skipped', 'same approver', now());
      perform public._set_card_stage(c.id, 'ready_to_publish', jsonb_build_object('merged_confirmation', true), null);
      return;
    end if;
    perform public._set_card_stage(c.id, 'confirmation', '{}', null);
    next_step := public._create_card_step(c.id, 'confirmation');
    return;
  end if;

  if c.stage = 'confirmation' then
    perform public._set_card_stage(c.id, 'ready_to_publish', '{}', null);
    perform public.notify(c.requester_id, 'card_delivered', '/portal/requests/' || c.id,
      jsonb_build_object('card_id', c.id, 'title', c.title));
  end if;
end $$;

-- Traffic and super_admin change the reviewer and approver of a card.
create function public.set_card_reviewers(p_card_id uuid, p_reviewer uuid, p_approver uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (public.has_any_role('{traffic_manager,super_admin}') and public.can_view_card(p_card_id)) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update cards set reviewer_id = p_reviewer, approver_id = p_approver where id = p_card_id;
end $$;

-- Traffic quick-add on the pipeline: an internal card in intake.
create function public.create_internal_card(p_title text, p_position text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  b uuid;
  l uuid;
  new_id uuid;
  creative_lead uuid;
begin
  if not (public.has_any_role('{traffic_manager,super_admin}') and public.is_marketing_writer()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select id into b from boards where is_pipeline;
  select id into l from lists where board_id = b and stage = 'intake';
  select ur.user_id into creative_lead from user_roles ur join teams t on t.id = ur.team_id
    join profiles p on p.id = ur.user_id
    where ur.role = 'team_lead' and t.slug = 'creative' and p.status = 'active' limit 1;
  insert into cards (board_id, list_id, position, title, stage, request_kind, requester_id,
    requesting_department_id, reviewer_id, created_by, stage_entered_at)
  values (b, l, p_position, left(trim(p_title), 200), 'intake', 'internal', auth.uid(),
    public.my_department_id(), creative_lead, auth.uid(), now())
  returning id into new_id;
  return new_id;
end $$;

-- ---------------------------------------------------------------------------
-- Column grants
-- ---------------------------------------------------------------------------
revoke update on public.cards from authenticated;
grant update (title, description, objective, key_message, reference_links, performance_notes, vertical,
  brand_id, branch_id, format, platforms, priority, due_at, stage_due_at, budget_note, position, list_id,
  archived_at)
  on public.cards to authenticated;

revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;
revoke insert, delete on public.notifications from authenticated;

revoke insert, update, delete on public.card_events, public.card_stage_periods, public.strategic_plans,
  public.requests, public.approval_steps from authenticated;

revoke update on public.comments from authenticated;
grant update (body, mentions, edited_at) on public.comments to authenticated;

revoke update on public.boards from authenticated;
grant update (name, description, visibility, archived_at, workspace_id) on public.boards to authenticated;

revoke update on public.lists from authenticated;
grant update (name, position, archived_at) on public.lists to authenticated;

-- ---------------------------------------------------------------------------
-- Function grants
-- ---------------------------------------------------------------------------
grant execute on function
  public.my_department_id(), public.is_marketing_writer(), public.is_board_member(uuid),
  public.can_view_board(uuid), public.can_edit_board(uuid), public.can_add_to_board(uuid),
  public.card_visible(uuid, uuid, uuid), public.can_view_card(uuid), public.can_edit_card(uuid),
  public.can_view_request(uuid), public.move_card_stage(uuid, public.card_stage, jsonb),
  public.decide_step(uuid, public.step_status, text, public.revision_reason),
  public.set_card_reviewers(uuid, uuid, uuid), public.create_internal_card(text, text),
  public.card_link(uuid), public.try_uuid(text)
  to authenticated;
revoke execute on function public.notify(uuid, text, text, jsonb, text, text),
  public._set_card_stage(uuid, public.card_stage, jsonb, timestamptz),
  public._create_card_step(uuid, public.card_stage),
  public.cards_pipeline_guard(), public.lists_pipeline_guard(), public.card_activity(),
  public.assignee_activity(), public.comment_activity(), public.attachment_activity()
  from authenticated;
grant execute on function public.notify(uuid, text, text, jsonb, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.brands enable row level security;
alter table public.workspaces enable row level security;
alter table public.boards enable row level security;
alter table public.board_members enable row level security;
alter table public.lists enable row level security;
alter table public.strategic_plans enable row level security;
alter table public.cards enable row level security;
alter table public.card_assignees enable row level security;
alter table public.card_events enable row level security;
alter table public.card_stage_periods enable row level security;
alter table public.labels enable row level security;
alter table public.card_labels enable row level security;
alter table public.checklists enable row level security;
alter table public.checklist_items enable row level security;
alter table public.comments enable row level security;
alter table public.attachments enable row level security;
alter table public.request_types enable row level security;
alter table public.requests enable row level security;
alter table public.approval_steps enable row level security;
alter table public.notifications enable row level security;

create policy brands_select on public.brands for select to authenticated using ((select public.is_active_user()));
create policy brands_write on public.brands for all to authenticated
  using ((select public.has_role('super_admin'))) with check ((select public.has_role('super_admin')));

create policy workspaces_select on public.workspaces for select to authenticated
  using ((select public.is_marketing()) or exists (
    select 1 from boards b where b.workspace_id = workspaces.id and public.is_board_member(b.id)));
create policy workspaces_write on public.workspaces for all to authenticated
  using ((select public.has_role('super_admin'))) with check ((select public.has_role('super_admin')));

create policy boards_select on public.boards for select to authenticated using (public.can_view_board(id));
create policy boards_insert on public.boards for insert to authenticated
  with check ((select public.is_marketing_writer()) and created_by = (select auth.uid()) and not is_pipeline);
create policy boards_update on public.boards for update to authenticated
  using (public.can_edit_board(id) and (not is_pipeline or (select public.has_role('super_admin'))))
  with check (public.can_edit_board(id));

create policy board_members_select on public.board_members for select to authenticated
  using (public.can_view_board(board_id));
create policy board_members_write on public.board_members for all to authenticated
  using (public.can_edit_board(board_id)) with check (public.can_edit_board(board_id));

create policy lists_select on public.lists for select to authenticated using (public.can_view_board(board_id));
create policy lists_insert on public.lists for insert to authenticated
  with check (stage is null and (public.can_edit_board(board_id) or public.can_add_to_board(board_id)));
create policy lists_update on public.lists for update to authenticated
  using (public.can_edit_board(board_id) or public.can_add_to_board(board_id))
  with check (public.can_edit_board(board_id) or public.can_add_to_board(board_id));

create policy strategic_plans_select on public.strategic_plans for select to authenticated
  using ((select public.is_active_user()) and (
    department_id = (select public.my_department_id())
    or (select public.has_any_role('{traffic_manager,super_admin,leadership}'))));

create policy cards_select on public.cards for select to authenticated
  using (public.card_visible(board_id, requesting_department_id, approver_id));
create policy cards_insert on public.cards for insert to authenticated
  with check (public.can_add_to_board(board_id) and stage is null and created_by = (select auth.uid()));
create policy cards_update on public.cards for update to authenticated
  using (public.can_edit_card(id)) with check (public.can_edit_card(id));

create policy card_assignees_select on public.card_assignees for select to authenticated using (public.can_view_card(card_id));
create policy card_assignees_write on public.card_assignees for all to authenticated
  using (public.can_edit_card(card_id)) with check (public.can_edit_card(card_id));

create policy card_events_select on public.card_events for select to authenticated using (public.can_view_card(card_id));
create policy card_stage_periods_select on public.card_stage_periods for select to authenticated using (public.can_view_card(card_id));

create policy labels_select on public.labels for select to authenticated using (public.can_view_board(board_id));
create policy labels_write on public.labels for all to authenticated
  using (public.can_edit_board(board_id) or public.can_add_to_board(board_id))
  with check (public.can_edit_board(board_id) or public.can_add_to_board(board_id));

create policy card_labels_select on public.card_labels for select to authenticated using (public.can_view_card(card_id));
create policy card_labels_write on public.card_labels for all to authenticated
  using (public.can_edit_card(card_id)) with check (public.can_edit_card(card_id));

create policy checklists_select on public.checklists for select to authenticated using (public.can_view_card(card_id));
create policy checklists_write on public.checklists for all to authenticated
  using (public.can_edit_card(card_id)) with check (public.can_edit_card(card_id));

create policy checklist_items_select on public.checklist_items for select to authenticated
  using (exists (select 1 from checklists cl where cl.id = checklist_id and public.can_view_card(cl.card_id)));
create policy checklist_items_write on public.checklist_items for all to authenticated
  using (exists (select 1 from checklists cl where cl.id = checklist_id and public.can_edit_card(cl.card_id)))
  with check (exists (select 1 from checklists cl where cl.id = checklist_id and public.can_edit_card(cl.card_id)));

create policy comments_select on public.comments for select to authenticated using (public.can_view_card(card_id));
create policy comments_insert on public.comments for insert to authenticated
  with check (author_id = (select auth.uid()) and public.can_view_card(card_id));
create policy comments_update on public.comments for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy comments_delete on public.comments for delete to authenticated
  using (author_id = (select auth.uid()));

create policy attachments_select on public.attachments for select to authenticated using (public.can_view_card(card_id));
create policy attachments_insert on public.attachments for insert to authenticated
  with check (uploaded_by = (select auth.uid()) and public.can_view_card(card_id));
create policy attachments_delete on public.attachments for delete to authenticated
  using (uploaded_by = (select auth.uid()) or public.can_edit_card(card_id));

create policy request_types_select on public.request_types for select to authenticated
  using ((select public.is_active_user()));
create policy request_types_write on public.request_types for all to authenticated
  using ((select public.has_role('super_admin')) or ((select public.has_role('hr')) and category = 'leave'))
  with check ((select public.has_role('super_admin')) or ((select public.has_role('hr')) and category = 'leave'));

create policy requests_select on public.requests for select to authenticated using (public.can_view_request(id));

create policy approval_steps_select on public.approval_steps for select to authenticated
  using (
    approver_id = (select auth.uid())
    or (subject_type = 'request' and public.can_view_request(subject_id))
    or (subject_type = 'card' and public.can_view_card(subject_id))
  );

create policy notifications_select on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Storage: card attachments (private bucket, signed URLs).
-- Path: cards/<card_id>/<file>
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('card-attachments', 'card-attachments', false, 104857600)
on conflict (id) do nothing;

create policy card_attachments_read on storage.objects for select to authenticated
  using (bucket_id = 'card-attachments'
    and (storage.foldername(name))[1] = 'cards'
    and public.can_view_card(public.try_uuid((storage.foldername(name))[2])));
create policy card_attachments_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'card-attachments'
    and (storage.foldername(name))[1] = 'cards'
    and public.can_view_card(public.try_uuid((storage.foldername(name))[2])));
create policy card_attachments_delete on storage.objects for delete to authenticated
  using (bucket_id = 'card-attachments'
    and (owner_id = (select auth.uid())::text
      or public.can_edit_card(public.try_uuid((storage.foldername(name))[2]))));

-- ---------------------------------------------------------------------------
-- Realtime (Postgres Changes respect row policies)
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.cards, public.lists, public.card_assignees,
  public.comments, public.notifications;

-- Belt and braces: nothing in public is executable by PUBLIC or anon.
revoke execute on all functions in schema public from public, anon;
