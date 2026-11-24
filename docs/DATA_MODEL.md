# Marketing HQ: data model and access rules

Postgres on Supabase. Every table has `id uuid primary key default gen_random_uuid()` unless noted, `created_at timestamptz default now()`, and where rows change, `updated_at timestamptz` maintained by a trigger. Columns listed here are the required ones; add indexes on every foreign key and on columns used in filters.

## 0. Four mechanisms that keep the rules enforceable

Row-level security works on rows, not columns, and plain views bypass it. So this model uses four mechanisms, and every table below says which one applies.

1. **Row policies** decide which rows a user can read, insert, update or delete.
2. **Column grants** decide which columns a user can change. Pattern for every table with protected columns:
   ```sql
   revoke update on <table> from authenticated;
   grant update (<allowed columns>) on <table> to authenticated;
   ```
   Protected columns change only inside `security definer` functions, which run as the table owner and are not limited by these grants.
3. **`security definer` functions** for every action with rules beyond "can this user write this row" (stage moves, approvals, check-in, admin changes), and for the few reads that must show a narrow slice of a table the reader cannot otherwise see (`who_is_in()`, `public_profiles()`, `team_absences()`). Each one sets `set search_path = public`, checks the caller inside, and has explicit `revoke execute ... from public, anon` then `grant execute ... to authenticated` (or `to service_role` only, where stated).
4. **`security_invoker` views** for dashboards, so row policies still apply.

Do not create plain (definer) views: the Supabase security advisor flags them, and they bypass row policies.

## 1. Enums

```sql
app_role:          super_admin, leadership, team_lead, traffic_manager, member, requester, final_approver, hr, guest
profile_status:    active, inactive
presence_status:   available, focus, meeting, shoot, break, away
checkin_method:    gps, wifi, qr, field, home, manual   -- qr retired (M-02): kept for old rows, refused by check_in
card_stage:        request, performance_input, intake, brief_schedule, production, creative_review, confirmation, ready_to_publish, published, reported
card_request_kind: strategic, urgent, internal      -- internal = created by marketing for itself, starts at intake
card_priority:     low, normal, high, urgent
assignee_role:     design, copy, video, media_buying, other
revision_reason:   brief_changed, quality, new_information, other
request_status:    pending, approved, rejected, cancelled
step_status:       waiting, active, approved, rejected, changes_requested, skipped
post_status:       draft, in_review, approved, scheduled, published
content_pillar:    awareness, engagement, insights, offer, community
```

## 2. Who counts as what

Defined once, used by routing and policies:

- **Team app user** = active and (`is_marketing()` or has any of `hr`, `leadership`, `super_admin`, `guest`). Guests only reach `/boards` and `/my-work`.
- **Portal user** = active and has `requester` or `final_approver`.
- A user who is both lands on the team app and sees a "Department portal" link in the menu.
- **Marketing user** (`is_marketing()`) = active, holds at least one role, and (department `is_marketing` or role `super_admin` or role `leadership`). An active user with no roles sees only a "No access yet" page. Leadership reads like marketing; write policies exclude `leadership` explicitly.

## 3. People and organisation

| Table | Columns | Notes |
| --- | --- | --- |
| `departments` | name_en, name_ar, slug unique, is_marketing bool, default_approver_id null | `default_approver_id` is copied to new cards from this department (DECISIONS D-12) |
| `teams` | department_id, name_en, name_ar, slug unique, color | `color` is the name-tag colour on the map |
| `branches` | name_en, name_ar, slug unique, area, map_key, public_ips cidr[], checkin_methods checkin_method[] default {gps,wifi,field,home} (never `qr`), latitude, longitude (both or neither), geofence_radius_m int default 150 (25 to 2000), is_active | Readable by every active user; written by super_admin |
| `profiles` | id = auth.users.id (primary key), email, full_name, display_name, phone, department_id, team_id, home_branch_id, title, locale ('en' or 'ar'), status profile_status default 'active', must_change_password bool default true, presence presence_status default 'available', presence_updated_at, avatar_seen bool default false | Column grants: users may update only `display_name, phone, locale, presence, presence_updated_at, avatar_seen` on their own row. `email` mirrors `auth.users.email` and changes only through admin. `must_change_password` is cleared only by the server (admin client) after a successful password change. Everything else through `admin_update_profile` |
| `user_roles` | user_id, role app_role, team_id null, unique(user_id, role, team_id) | `team_id` required when role is `team_lead` (check constraint) |
| `schedules` | user_id unique, workdays int[] default {6,0,1,2,3,4} (0 = Sunday, 6 = Saturday), start_time time default '10:00', end_time time default '18:00', timezone default 'Africa/Cairo' | |
| `settings` | key text primary key, value jsonb | Keys in `SEED_DATA.md`. HR may edit only `lateness_grace_minutes` |

Accounts are created only by a super_admin (public sign-up is disabled in Supabase Auth). A trigger on `auth.users` insert creates the `profiles` row (`active`, `must_change_password = true`, `full_name` from the user metadata, no roles) and a default `schedules` row; the create-account server action then sets the rest through `admin_update_profile` and `admin_set_roles`. Deactivating a user sets `status = 'inactive'` and bans the auth user (`ban_duration`) so no new session can be issued; reactivating lifts the ban.

## 4. Map, attendance, characters

| Table | Columns | Notes |
| --- | --- | --- |
| `desks` | branch_id, zone_name (matches the Tiled object name, for example `desk-4`), assigned_user_id null, unique(branch_id, zone_name) | |
| `attendance_sessions` | user_id, branch_id null (null for field and home), method checkin_method, checked_in_at, checked_out_at null, is_late bool, auto_closed bool default false, confirmed_at null, field_card_id null, note, verify jsonb, checkin_lat, checkin_lng, checkin_accuracy_m int, checkin_place text (field only, up to 120), checkout_lat, checkout_lng, checkout_accuracy_m int, distance_m int (from the branch at check-in) | `verify` holds the verification result, for example `{ "ipMatched": "41.x.x.0/24" }` or `{ "geofence": { "radius_m": 150, "distance_m": 40 } }`. Locations live in their own columns and are recorded at every check-in and check-out, for every method (D-03, D-23). `shoot_id` links a field check-in to its shoot. Readable only by the row policy below (the person, their team lead, hr, super_admin, leadership); `who_is_in()` never returns them. Partial unique index: one open session per user (`unique (user_id) where checked_out_at is null`). No direct writes from clients |
| `attendance_edits` | session_id, edited_by, old_in, new_in, old_out, new_out, reason | Through `confirm_auto_checkout` or `admin_edit_session` |
| `avatars` | user_id primary key, config jsonb, looks jsonb (at most three saved looks), updated_at | Own row writable |

## 5. Boards and cards

| Table | Columns | Notes |
| --- | --- | --- |
| `workspaces` | name_en, name_ar, slug, team_id null | |
| `boards` | workspace_id, name, is_pipeline bool (exactly one row true, partial unique index), visibility ('marketing', 'private'), created_by, archived_at | |
| `board_members` | board_id, user_id | For private boards and guests |
| `lists` | board_id, name, position text (fractional index), stage card_stage null (set only on the pipeline board), archived_at | Pipeline lists cannot be created, renamed, moved or archived by anyone but super_admin |
| `cards` | board_id, list_id, position text, title, description, objective, key_message, reference_links jsonb, performance_notes, stage card_stage null, request_kind, requesting_department_id, requester_id, vertical text, brand_id, branch_id, format text, platforms text[], priority, due_at, stage_due_at, due_notified_for timestamptz null, reviewer_id, approver_id, revision_count int default 0, is_late_submission bool, returned_reason text, missing_items text[], budget_note, strategic_plan_id null, delivered_at, published_at, archived_at, created_by | `stage_due_at` is the due date of the current stage, set by `move_card_stage` from its payload. Column grants: clients may update content fields only; `stage, list_id on pipeline cards, revision_count, reviewer_id, approver_id, requester_id, requesting_department_id, delivered_at, published_at, is_late_submission, returned_reason, missing_items` change only through functions. A trigger rejects any `list_id` on the pipeline board that does not match `stage` |
| `card_assignees` | card_id, user_id, role assignee_role, unique(card_id, user_id, role) | |
| `card_events` | card_id, actor_id, kind ('stage_change', 'assign', 'unassign', 'due_change', 'revision', 'returned', 'resubmitted', 'comment', 'import'), from_stage, to_stage, data jsonb | Insert by functions and triggers only |
| `card_stage_periods` | card_id, stage, entered_at, left_at null | Powers time-in-stage reports |
| `labels` | board_id, name, color | |
| `card_labels` | card_id, label_id | |
| `checklists` | card_id, title, position | |
| `checklist_items` | checklist_id, text, done bool, position, assignee_id null, due_at null | |
| `comments` | card_id, author_id, body, mentions uuid[], edited_at | |
| `attachments` | card_id, uploaded_by, kind ('file', 'link'), storage_path or url, name, mime, size | |
| `strategic_plans` | department_id, submitted_by, for_month date (first of month), submitted_at, is_late bool | |
| `brands` | name, slug, color | Readable by every active user |

## 6. Requests and approvals

| Table | Columns | Notes |
| --- | --- | --- |
| `request_types` | key unique, name_en, name_ar, category ('leave', 'special'), form_schema jsonb, approval_chain jsonb, is_leave bool, counts_working_days bool, requires_attachment_after_days int null, is_active | |
| `requests` | type_id, requester_id, status request_status, data jsonb, starts_on date null, ends_on date null, days numeric null, submitted_at, decided_at | No client updates. Cancel through `cancel_request` |
| `approval_steps` | subject_type ('request', 'card'), subject_id, card_stage null, step_index int, approver_id, status step_status, comment, revision_reason null, decided_at | One row per candidate approver. Rows with the same `subject_id` and `step_index` are siblings |
| `leave_balances` | user_id, type_id, year int, allowance numeric, used numeric default 0, unique(user_id, type_id, year) | |
| `holidays` | day date unique, name_en, name_ar, is_half_day bool | |
| `notifications` | user_id, kind, title, body, link, data jsonb, read_at null | Column grant: owner may update only `read_at` |

### Approval chains

A chain is an ordered array of step definitions:

```json
[
  { "resolve": "team_lead_of_requester" },
  { "resolve": "role:super_admin" },
  { "resolve": "role:hr" }
]
```

Resolvers: `team_lead_of_requester`, `role:<app_role>`, `user:<uuid>`. Card review and confirmation steps use the card's `reviewer_id` and `approver_id` directly (`_create_card_step`); `card_reviewer` and `card_approver` are not request-chain resolvers, so never put them in a request type's chain.

Resolution rules, applied in this order when the request or card step is created:

1. Resolve the step to a set of active users.
2. Remove the requester from the set. Nobody approves their own request.
3. If the set is empty and the resolver was `team_lead_of_requester`, fall back to `role:super_admin` minus the requester; if still empty, `role:leadership`.
4. If the set is still empty: for requests, record the step as `skipped`; for card steps, refuse the stage move with an error naming the missing reviewer or approver. Card steps are never skipped.
5. If every candidate of this step already approved the previous step, merge the two (mark this one `skipped` with comment "same approver").
6. Insert one `approval_steps` row per candidate. The first step's rows are `active`, later ones `waiting`.

`decide_step` (sections 7 and 8) marks the decided row and its siblings: the decided row gets the decision, siblings become `skipped`. Then it activates the next step's rows, or completes the request or card move.

## 7. Content calendar

| Table | Columns | Notes |
| --- | --- | --- |
No platform integrations: platforms are plain labels (`facebook`, `instagram`, `linkedin`, `tiktok`, `snapchat`) stored in `posts.platforms`.

| Table | Columns | Notes |
| --- | --- | --- |
| `posts` | brand_id, card_id null (unique when set), branch_id null, platforms text[], scheduled_at timestamptz null, format ('feed', 'carousel', 'reel', 'story', 'text'), caption_ar, caption_en, hashtags text[], first_comment, pillar content_pillar, notes, status post_status, owner_id, publisher_id, approved_by null, review_comment null, reminded_for timestamptz null, overdue_notified_at null, published_at null, published_links jsonb | Status changes to `approved` and `published` go through `decide_post` and `mark_post_published`. A trigger switches an approved post to `scheduled` when it gets a date and time, and back to `approved` if the date is cleared |
| `post_media` | post_id, attachment_id null, storage_path, thumbnail_path, media_type ('image', 'video'), width int, height int, duration_seconds numeric null, position | Thumbnail made in the browser at upload |

## 8. System

| Table | Columns | Notes |
| --- | --- | --- |
| `audit_log` | actor_id, table_name, row_id, action ('insert', 'update', 'delete'), old_data jsonb, new_data jsonb, at | Written by a generic trigger on `user_roles`, `profiles` (status, department, team changes), `attendance_sessions` (updates, deletes), `attendance_edits`, `approval_steps` (updates), `requests` (status changes), `cards` (deletes, archive), `leave_balances`. No updates or deletes allowed; super_admin reads |

## 9. Functions

### Read helpers (`security definer`, `stable`)

```sql
is_active_user()                 -- own profile status = 'active'
has_role(r app_role)             -- current user holds r (any team)
has_any_role(rs app_role[])
is_marketing()                   -- see section 2
in_team(slug text)               -- current user's team slug = slug
is_team_lead_of(target uuid)     -- target <> auth.uid() and current user is team_lead of target's team
can_view_card(card_id uuid)      -- created in the boards migration (Day 2), not Day 1
can_edit_card(card_id uuid)
can_edit_board(board_id uuid)    -- team leads, traffic, super_admin, board creator
can_add_to_board(board_id uuid)  -- marketing members on non-private non-pipeline boards, board members including guests, plus can_edit_board
```

### Narrow read functions (`security definer`, return sets)

```sql
who_is_in(branch_id uuid)        -- open sessions: user_id, branch_id, method, checked_in_at, field_card_id, note, checkin_place; marketing users only; no lateness, no coordinates
public_profiles()                -- id, display_name, title, team_id, department_id; for requesters and guests
my_access()                      -- the caller's status, flags, roles and is_marketing / is_team_app / is_portal, for guards and the shell
team_absences(from date, to date)-- user_id, category ('leave', 'wfh', 'field'), starts_on, ends_on; no reasons or form data.
                                 -- Marketing users see everyone in marketing; others see own department
```

### Actions (`security definer`, volatile; each checks the caller and writes events and audit)

```sql
admin_update_profile(user_id, patch jsonb)       -- super_admin (hr may set schedule only)
admin_set_roles(user_id, roles jsonb)            -- super_admin
require_password_change(user_id)                 -- super_admin; sets must_change_password (used by Reset password)
admin_revoke_sessions(user_id)                   -- service_role ONLY; deletes the user's auth sessions (reset password, deactivate)
move_card_stage(card_id, to_stage, payload jsonb)
  -- validates transition, permission and required fields; payload may carry stage_due_at, assignees, performance_notes, return reason and missing_items.
  -- Refuses manual moves OUT of creative_review and confirmation: only decide_step does that.
  -- Entering creative_review or confirmation creates approval steps (card_reviewer, card_approver) and refuses if nobody resolves.
submit_strategic_plan(payload jsonb)             -- creates plan and cards; copies approver_id from the department and reviewer_id from the creative team lead; cards start in performance_input
submit_urgent_request(payload jsonb)             -- same defaults, one card
resubmit_request(card_id, payload jsonb)         -- requester's department only, card in request with returned_reason set; updates allowed fields, clears missing_items, moves to performance_input
submit_request(type_key text, data jsonb)        -- leaves and special requests; validates against form_schema and balance; builds steps
decide_step(step_id, decision step_status, comment text, reason revision_reason default null)
  -- approve, reject, or changes_requested (cards only, reason required). For cards: approve moves creative_review to confirmation or
  -- confirmation to ready_to_publish; changes_requested moves back to production and adds a revision.
  -- For leave requests: final approval deducts the balance in the same transaction.
cancel_request(request_id)                       -- requester while pending; hr for approved requests (refunds balance)
check_in(p_user_id uuid, method, branch_id, verify jsonb, card_id, note, now, lat, lng, accuracy_m, place)
  -- service_role ONLY (execute revoked from authenticated). Called by the server action after it validated the input
  -- (nearest branch for gps, IP for wifi). Every method needs a location. gps: accuracy <= 200 m inside the branch geofence
  -- (branch_geofence_m + least(accuracy, 100)), via _distance_m (haversine). A branch without location_confirmed_at uses at least 1,500 m.
  -- field: place and shoot_id optional. qr and manual refused. Enforces one open session, home check-in only with approved
  -- work_from_home today, lateness from schedule and grace.
check_out(lat, lng, accuracy_m)                  -- authenticated; closes the caller's own open session; the location is required
confirm_auto_checkout(session_id, actual_out timestamptz)  -- owner of an auto-closed session; writes attendance_edits, sets confirmed_at
admin_edit_session(session_id, new_in, new_out, reason)    -- super_admin, hr
decide_post(post_id, approve bool, comment text) -- in_review to approved (or scheduled when it has a time), or back to draft with a comment
create_post_from_card(card_id, scheduled_at)     -- card in ready_to_publish with no post; copies brand, platforms, captions and attachments; status approved
mark_post_published(post_id, links jsonb)        -- links optional; sets published and moves the linked card to published
```

## 10. Access rules by table

`R` = read. `W` = insert, update or delete, limited further by the column grants above. Every rule also requires `is_active_user()`, except reading your own profile.

| Table | Rules |
| --- | --- |
| profiles | R: own row always; marketing users, hr, super_admin, leadership read all. Requesters and guests use `public_profiles()`. W: own row, granted columns only |
| user_roles | R: own; marketing users; hr. W: through `admin_set_roles` |
| teams, departments, branches, brands, request_types, holidays | R: all active. W: super_admin; hr also for leave request types and holidays |
| settings | R: all active. W: super_admin; hr for `lateness_grace_minutes` |
| schedules | R: own, team lead of the user, hr, super_admin. W: super_admin, hr |
| desks | R: marketing. W: super_admin, traffic_manager |
| attendance_sessions, attendance_edits | R: own; team lead of the user; hr; super_admin; leadership. Others see presence only through `who_is_in()`. W: through functions only |
| avatars | R: all active. W: own |
| workspaces | R: marketing. W: super_admin |
| boards | R: marketing (private boards: members and super_admin); guests: boards they are members of. W: `can_edit_board`. Guests never edit boards |
| board_members | R: same as the board. W: `can_edit_board` |
| lists | R: same as the board. W: `can_edit_board`, or marketing members on non-private non-pipeline boards. Pipeline lists: super_admin only |
| cards | R: `can_view_card` = marketing users on non-private boards; board members; requester's department colleagues and the card's approver for pipeline cards. Insert: `can_add_to_board` on non-pipeline boards; pipeline cards only through the submit functions, or traffic creating `internal` cards (they start at intake). Update: `can_edit_card` = assignees, reviewer, team leads, traffic, super_admin; content columns only |
| card_assignees, labels, card_labels, checklists, checklist_items | R: `can_view_card`. W: `can_edit_card` |
| comments, attachments | R: `can_view_card`. Insert: `can_view_card` (requesters and approvers can comment and attach). Update or delete: author only |
| card_events, card_stage_periods | R: `can_view_card`. W: functions and triggers only |
| strategic_plans | R: own department, traffic, super_admin, leadership. W: functions only |
| requests, approval_steps | R: own; holders of a step on it; team lead of the requester; hr; super_admin. W: functions only |
| leave_balances | R: own, team lead of the user, hr, super_admin. W: hr, super_admin |
| posts, post_media | R: marketing; requesters for posts linked to their department's cards. W: marketing members, excluding leadership and guests; protected columns (`status` to approved or published, `approved_by`, `published_at`) only through functions. Approving: `decide_post` by team leads, `in_team('community')` lead, super_admin. Publishing: `mark_post_published` by the post's publisher, the community team, team leads, super_admin |
| notifications | R: own. W: own, `read_at` only. Inserts by functions and server code |
| audit_log | R: super_admin. W: triggers only |

### Storage (all buckets private, served through signed URLs)

| Bucket | Path | Rules |
| --- | --- | --- |
| `card-attachments` | `cards/<card_id>/<file>`; drafts `drafts/<uid>/<file>` | R: `can_view_card`; drafts only their uploader. Upload: `can_view_card` (matches comments); drafts only into your own folder (active users). Update (= move): only your own draft, only into `cards/<card_id>/` of a card you can view; used by the portal to attach media picked before the card existed (M-03). Delete: uploader, `can_edit_card` |
| `post-media` | `posts/<post_id>/<file>` | R: same as posts. W: same as posts |
| `request-files` | `requests/<request_id>/<file>` | R: same as requests. Upload: the requester |

## 11. Realtime

- **Board and notification updates** use Postgres Changes, which respect row policies. Migration: `alter publication supabase_realtime add table cards, lists, card_assignees, comments, notifications, posts;`
- **Map presence** uses private channels only: `supabase.channel('branch:<id>', { config: { private: true } })`. Add policies on `realtime.messages` that allow `select` (receive) and `insert` (presence track) only when `is_marketing()` and the topic starts with `branch:`.
- **Check-in, check-out and status events are sent by the database, never by clients.** A trigger on `attendance_sessions` (insert, update of `checked_out_at`) and on `profiles` (update of `presence`) calls `realtime.send(payload, event, 'branch:<id>', true)` for the relevant branch (home branch for status changes when not checked in).
- Client presence tracking is limited to `{ user_id }` for "who is viewing"; positions and statuses come from the database events.

## 12. Dashboard views (`security_invoker = true`)

- `v_card_flow`: per card: created_at, delivered_at, due_at, on_time bool, days_to_deliver, revision_count, department, vertical, brand, request_kind, is_late_submission
- `v_stage_durations`: per card and stage: hours in stage
- `v_workload`: open cards per assignee by stage
- `v_attendance_daily`: per user and working day: checked in bool, first arrival, is_late, method, hours
- `v_leave_usage`: per user, type and year: allowance, used, remaining
- `v_posts_monthly`: per brand and month: published count, target

## 13. Test users and access tests

Canonical list of local test users (local seed only, password `Test1234!`). `SEED_DATA.md` repeats this list; this one wins if they differ.

| Email | Department / team | Roles |
| --- | --- | --- |
| admin@test.local | Marketing | super_admin |
| leadership@test.local | (none) | leadership |
| traffic@test.local | Marketing / Traffic | traffic_manager |
| lead.creative@test.local | Marketing / Creative | team_lead (creative) |
| lead.performance@test.local | Marketing / Performance | team_lead (performance) |
| member@test.local | Marketing / Creative | member |
| member2@test.local | Marketing / Creative | member |
| community@test.local | Marketing / Community | member |
| sales@test.local | Sales | requester |
| approver@test.local | Sales | requester, final_approver (sales default approver) |
| hr@test.local | HR | hr, requester |
| guest@test.local | (none) | guest |
| inactive@test.local | Marketing / Creative | member, status inactive |
| norole@test.local | Marketing | none (active, no roles) |

Seeding email and password users in `seed.sql` needs rows in both `auth.users` (with `crypt('Test1234!', gen_salt('bf'))`, `email_confirmed_at` set, `aud = 'authenticated'`, `role = 'authenticated'`) and `auth.identities` (provider `email`), then an update of each profile with its status, roles and `must_change_password = false` (so tests are not stopped by the forced change). Add one more user, `newhire@test.local`, left with `must_change_password = true` for the first-sign-in test.

`supabase/tests/` holds Vitest suites that sign in as these users and assert, per table, that allowed reads and writes succeed and forbidden ones return nothing or fail. Required escalation tests:

- A user cannot set their own `profiles.status`, `department_id` or `team_id`.
- An assignee cannot update `cards.stage`, `revision_count` or a pipeline card's `list_id` directly.
- A requester cannot update a request's `status`.
- A team lead cannot approve their own leave.
- An authenticated user cannot call `check_in`.
- A requester cannot receive messages on a `branch:` channel.
- An inactive user reads only their own profile (the app needs it to show the deactivated message) and nothing else.
- A user cannot update their own `must_change_password`, `email` or `status`.
- A user cannot set their own `joined_on`, and no one can store an impossible birthday.
- An authenticated user who is not super_admin cannot call `require_password_change`, `admin_update_profile` or `admin_set_roles`.

## 14. Workflow (W-00 to W-18)

Migrations `20261118*`. Every table has row-level security and access tests in `supabase/tests`.

| Area | Tables | Access |
| --- | --- | --- |
| People | `profiles.birth_month`, `birth_day` (never a year), `joined_on`, `celebrate`; `kudos`; `seasonal_events` | Own birthday and `celebrate` writable; `joined_on` through `admin_update_profile`. Kudos: staff read and send as themselves, author or super_admin deletes. Seasons: super_admin writes |
| Meetings | `meeting_rooms`, `meeting_series`, `meeting_series_members`, `meetings`, `meeting_attendees`, `meeting_guests`, `meeting_actions` | Writes through `save_meeting`, `respond_meeting`, `cancel_meeting`, `save_meeting_notes`, `save_meeting_series`, `archive_meeting_series`, `meeting_action_to_card`. Marketing reads non-private meetings; others only meetings they are in. `meeting_busy` shows when, never what |
| Gates | `gate_tracks`, `gate_templates`, `gate_items`, `gate_item_cards`, `gate_item_exclusions` | Staff read. super_admin and traffic_manager edit; the owner sets status. A deleted or moved occurrence is recorded in `gate_item_exclusions` and is not rebuilt |
| Shoots | `shoots`, `shoot_crew`, `shoot_shots`, `shoot_equipment`, `shoot_cards` | Marketing and crew read. Producer, crew, team leads, traffic and super_admin edit. Guests on a crew reach `/shoots`. A field check-in with `shoot_id` sets presence to `shoot`; checking out of it (by hand or automatically) sets it back to `available` |
| Team week | `week_plan_entries`; `team_week(from, to, department)` | People write their own plan from today onward; traffic and super_admin write any day. `team_week` returns a place only: no coordinates, leave type or reason, and colleagues cannot tell leave from a planned away day. A check-in to a shoot shows as the shoot; with several check-ins on one day the latest one wins. The API caps rows at 1,000, so large ranges are paged |
| Notifications | `push_subscriptions`, `notification_preferences`, `notifications.pushed_at`, `cron_log` | Subscriptions and preferences are private to their owner. `cron_log` has no client access; `claim_once` is service role only. `digest_hour` works between 06:00 and 09:00 Cairo all year |
| Map | `map_positions`, `map_interactions` | Moves and interactions go through `map_move` and `map_interact`, which send the realtime events. Browsers never broadcast |

Scheduled jobs: `cron_meetings` every 5 minutes; `cron_workflow_daily` (gates, shoots, strategic reminders, celebrations) daily; `/api/cron/push` every 5 minutes; `/api/cron/digest` hourly from 03:00 to 07:00 UTC.
