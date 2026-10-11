# Pixel HQ: 7-day build plan

Goal: a working MVP the marketing team uses from day 8. Work through tasks in order. Each task lists what to build and how to check it. Tick the box when the task meets the definition of done in `CLAUDE.md`.

Priority: **P0** must ship in the sprint. **P1** ships if time allows; if a day runs late, move its P1 tasks to the backlog at the bottom instead of pushing P0 work to the next day.

If the sprint falls behind, cut in this order: Trello import, dashboards beyond Workflow, content calendar Feed preview view, character layers beyond body, hair, top and headwear, Home and Field maps.

No integrations with outside platforms (see `PRODUCT_SPEC.md`). No task below connects to a social network, ads platform, Google Calendar or Trello.

Each migration seeds only the tables it creates. Seed files are split per migration day in `supabase/seed/` and concatenated by `supabase/seed.sql`.

---

## Day 0: before the sprint (Adham, not Claude Code)

- [ ] Install Node 20 or newer, pnpm, Git, Docker Desktop and the Supabase CLI
- [ ] Create a private GitHub repository, under an Espaces-owned organisation if possible
- [ ] Create two Supabase cloud projects in the Frankfurt region: **staging** (free plan is fine; it pauses after a week without use) and **production** (Pro plan)
- [ ] Create a Vercel project (Pro) linked to the repository. Preview deployments use the staging Supabase project; production uses production. Add a subdomain of e-spaces.co for production
- [ ] In both Supabase projects' Auth settings: keep only the Email provider, turn off "Allow new users to sign up", turn off email confirmation, set the minimum password length to 10, and (production, Pro) turn on leaked password protection. Set the site URL to the production URL
- [ ] Create a Resend account and verify the sending domain; create a Sentry project
- [ ] Answer as many items in `docs/DECISIONS.md` as possible
- [ ] Choose the pixel art asset pack (commercial licence) if decided; otherwise placeholders are used
- [ ] The kit sits in the repository folder; D1-01 scaffolds in a temporary folder and moves it in

---

## Day 1: foundation

- [x] **D1-01 (P0) Scaffold the app.** Scaffold Next.js (latest stable, App Router, TypeScript strict, Tailwind, ESLint, pnpm) in a temporary folder, then move it into the repository root without overwriting the kit files already there. Add `!.env.example` to `.gitignore` (the generated file ignores `.env*`). Add Prettier and shadcn/ui (button, input, textarea, select, dialog, sheet, dropdown-menu, popover, tabs, table, badge, avatar, sonner, calendar, form, command, tooltip, skeleton). Record the installed versions of Next.js, React, next-intl, Supabase packages, Phaser and Tailwind in `docs/PROGRESS.md`. Folder layout and scripts as in `CLAUDE.md`.
  - Check: on a fresh clone, `pnpm install && pnpm dev`, `pnpm build`, `pnpm typecheck` and `pnpm lint` pass.
- [x] **D1-02 (P0) Languages and right-to-left.** next-intl with `en` and `ar`, locale prefix in the URL, `dir="rtl"` and an Arabic-friendly font (for example IBM Plex Sans Arabic) for `ar`. One request-interception file (`middleware.ts`, or `proxy.ts` if the installed Next.js uses that name) chains next-intl's locale handling and the Supabase session refresh. Language switcher saves `profiles.locale` once sign-in exists.
  - Check: `/ar` renders right-to-left with Arabic text; `/en` left-to-right; no hardcoded strings.
- [x] **D1-03 (P0) Local Supabase and migration workflow.** `supabase init`, `pnpm db:start`, server, browser and admin clients in `src/lib/supabase/`, `pnpm db:types`. In `supabase/config.toml`: `[auth] enable_signup = false`, `[auth.email] enable_confirmations = false`, `minimum_password_length = 10`, and no external providers.
  - Check: `pnpm db:reset` runs cleanly; generated types compile.
- [x] **D1-04 (P0) Core schema.** Migration for the enums, `departments`, `teams`, `branches`, `branch_secrets`, `profiles` (with column grants), `user_roles`, `schedules`, `settings`, `audit_log`, the read helpers `is_active_user`, `has_role`, `has_any_role`, `is_marketing`, `in_team`, `is_team_lead_of` (not the card helpers yet), `public_profiles()`, `admin_update_profile`, `admin_set_roles`, the `auth.users` insert trigger, `require_password_change()`, the generic audit trigger, and all their policies. Seed those tables from `SEED_DATA.md` and the test users from `DATA_MODEL.md` section 13.
  - Check: access tests for these tables pass for every test user, including the escalation tests on profiles; an inactive user reads only their own profile; a user cannot clear their own `must_change_password`.
- [x] **D1-05 (P0) Sign-in and password change.** Email and password sign-in through Supabase (`signInWithPassword` in a server action, generic "email or password is incorrect" error, no account-exists hints). No sign-up page and no "forgot password" self-service (DECISIONS D-17: the page says "Forgot your password? Ask your admin"). A user with `must_change_password` is sent to `/change-password` before any other route and cannot leave it until they set a new password. `/me/account` lets every signed-in user change their password at any time. The change-password server action checks the current password with a separate cookie-less client, validates the new one with Zod (10 or more characters, not equal to the current one), calls `auth.updateUser`, clears `must_change_password` with the admin client, and signs out the user's other sessions. Inactive users are signed out with a message; signed-in users with no roles see a "No access yet, contact your admin" page. Route guards per `DATA_MODEL.md` section 2. Public routes: sign-in, `/[locale]/kiosk/*`, `/api/kiosk/*`, `/api/cron/*` (cron and kiosk routes check their own secrets).
  - Check: a new account is forced to change its temporary password and then lands on its home; a wrong current password is refused; inactive and no-role paths behave as described; a portal-only user cannot open team app routes.
- [x] **D1-06 (P0) App shell.** Sidebar (desktop) and bottom bar (mobile), top bar with branch name, presence status picker, notification bell placeholder, language switcher, user menu. Navigation entries depend on roles. Landing: team app users go to `/map` (placeholder for now), portal-only users to `/portal`.
  - Check: each test user sees the right navigation at 375px and 1440px.
- [x] **D1-07 (P0) Admin: users and organisation.** `/admin/users`: list with filters; "Create account" (email, full name, department, team, home branch, title, roles, schedule; the server generates a temporary password, shows it once to copy, and sets `must_change_password`); "Reset password" (new temporary password shown once, `must_change_password` set, all the user's sessions signed out); deactivate (bans the auth user and signs out every session) and reactivate; edit department, team, home branch, roles (team-scoped for team_lead), schedule. Account creation and password resets run in a server action that first checks the caller is super_admin, then uses the admin client; if any step after `auth.admin.createUser` fails, the new auth user is deleted. `/admin/branches`: name, area, public IPs, allowed check-in methods, "Generate kiosk key" (shown once, hash stored) and "Rotate QR secret". `/admin/settings`: the keys in `settings`. All writes through the admin functions.
  - Check: super_admin creates an account and the new user signs in with the temporary password; a password reset signs the user out everywhere; a deactivated user cannot sign in; others cannot reach `/admin` or call the account actions; changes appear in `audit_log` (never the password).
- [x] **D1-08 (P0) Quality pipeline.** Vitest with a helper that signs in as a test user; Playwright smoke test (sign in as `member@test.local`, see the shell). GitHub Actions on every push: install, `supabase start`, `supabase db reset`, typecheck, lint, all Vitest suites including access tests, build. On `main`: `supabase db push` to staging, then seed staging with the test users. Sentry wired. Vercel deploys previews and production.
  - Check: CI green; a preview URL works against staging and you can sign in there as a test user; a thrown test error appears in Sentry.

## Day 2: boards and the content cycle

- [x] **D2-01 (P0) Boards, approvals and notifications schema.** One migration for `workspaces`, `boards`, `board_members`, `lists`, `cards` (with column grants and the pipeline list trigger), `card_assignees`, `card_events`, `card_stage_periods`, `labels`, `card_labels`, `checklists`, `checklist_items`, `comments`, `attachments`, `strategic_plans`, `brands`, plus `request_types`, `requests`, `approval_steps`, `notifications` (Day 2 and 3 tasks need them). Card helpers `can_view_card`, `can_edit_card`, `can_edit_board`, `can_add_to_board`. Storage bucket `card-attachments` with policies. Realtime publication for `cards`, `lists`, `card_assignees`, `comments`, `notifications`. Seed workspaces, the Content Pipeline board with its ten stage lists, brands, and request types.
  - Check: access tests cover marketing member, traffic, requester (own department pipeline cards only, comment allowed, edit refused), guest (member boards only, cannot rename boards), and the escalation tests on cards.
- [x] **D2-02 (P0) Boards list and Kanban view.** `/boards` grouped by workspace; create, rename and archive boards and lists (not pipeline lists). `/boards/[id]` Kanban with dnd-kit: drag cards within and between lists and reorder lists, with fractional positions, optimistic updates and rollback on error. Quick-add at the bottom of each list (on the pipeline board: Traffic only, creating an `internal` card in intake). Live updates for other viewers through Postgres Changes on that board.
  - Check: two browsers on one board see each other's moves within 2 seconds; 300 seeded cards scroll and drag smoothly; works with touch.
- [x] **D2-03 (P0) Card detail.** A side sheet (full screen on mobile) opened from a card and addressable by URL (`?card=<id>`). Edit the card fields from `PRODUCT_SPEC.md` section 3, assignees with roles, labels, checklists with progress, comments with @mentions, attachments (upload to storage or add a link), activity feed from `card_events`.
  - Check: every field saves and appears in the activity feed; a mention creates one notification row; attachments open through signed URLs.
- [x] **D2-04 (P0) Content cycle logic.** `move_card_stage` with the transition table, required-field checks, permission checks, `stage_due_at`, `card_stage_periods`, and approval-step creation on entering `creative_review` and `confirmation` (refused if no reviewer or approver). `decide_step` for card steps (approve, changes requested with reason). Dragging on the pipeline board calls `move_card_stage`; invalid drops snap back with the reason. Stage timer colours from `stage_targets_hours`.
  - Check: unit tests for every allowed and forbidden transition; manual moves out of review stages are refused; changes requested increments `revision_count` with the reason; a card cannot leave intake without required fields.
- [x] **D2-05 (P0) Table view and My work.** Table view on any board with sortable columns and filters (assignee, stage, brand, department, due). `/my-work`: my open cards grouped as Overdue, Today, This week, Later, No date; and cards waiting for my review.
  - Check: filters combine correctly; My work shows only cards where I am an assignee or reviewer.
- [x] **D2-06 (P1) Workload view.** For traffic and leads: open cards per person by stage, with the WIP limit highlighted; the assign dialog warns above the limit.

## Day 3: department portal, approvals and notifications

- [x] **D3-01 (P0) Department portal.** `/portal` home with my department's requests in the simplified statuses; `/portal/requests/new` with Strategic plan (next month, many lines, deadline on the 25th, late flag) and Urgent request (one line, reason required), through `submit_strategic_plan` and `submit_urgent_request` (which set reviewer and approver defaults). `/portal/requests/[id]`: status, dates, comments, attachments and delivered files.
  - Check: a requester submits a 3-line strategic plan and an urgent request; cards appear in `performance_input`; a submission on the 26th is flagged late (mocked date).
- [x] **D3-02 (P0) Performance input and intake.** Performance lead's actions in `performance_input`: add visual suggestions (`performance_notes`) or "No input", both moving the card to `intake`. Traffic's actions in `intake`: Accept (to `brief_schedule`) or Return with missing items and a note (to `request`, shown as Returned in the portal, requester notified). `resubmit_request` from the portal.
  - Check: the full return and resubmit loop works for a test requester.
- [x] **D3-03 (P0) Approval engine and inbox.** Chain resolution exactly as `DATA_MODEL.md` section 6, `submit_request`, `decide_step` for requests, `cancel_request`. `/approvals` and `/portal/approvals`: one inbox of active steps across requests and cards with approve, reject and request changes (cards only), comment required on reject and changes. Card steps preview attachments inline (images and video).
  - Check: unit tests for each resolver, the no-self-approval rule (a team lead's own leave skips them), fallbacks, multi-candidate steps (first decision wins, siblings skipped) and same-approver merging; creative review then confirmation works end to end.
- [x] **D3-04 (P0) Notifications.** The events in `PRODUCT_SPEC.md` section 10 that exist so far; bell with live unread count and dropdown; mark one or all read; links open the right card or request. Email through Resend for approval waiting, request decided and card returned, in the recipient's language.
  - Check: each event creates exactly one notification for the right person; emails arrive (Resend test mode or a logged preview locally).
- [x] **D3-05 (P0) Cron jobs, part 1.** Route handlers in `src/app/api/cron/`, protected by `CRON_SECRET`, scheduled in `vercel.json` in UTC: `due-soon` (hourly: cards due within 24 hours not yet in review; uses `due_notified_for` so each due date notifies once) and `daily` (once a day: move cards published 7 or more days ago to `reported`).
  - Check: calling each route twice produces no duplicates.
- [x] **D3-06 (P1) Trello import.** `/admin/import`: upload a Trello board JSON export file, choose the target board, preview counts, import as the spec says. File only; no Trello connection.

## Day 4: the map, check-in and presence

- [x] **D4-01 (P0) Placeholder art and the first map.** `scripts/make-placeholders.ts` generates a 32 by 32 pixel placeholder tileset and character layer sheets. A Tiled map for the home branch with layers `floor`, `walls`, `furniture` and an object layer `zones` with the zone names from the spec and at least 12 desks. Small Field and Home maps.
  - Check: the maps open in Tiled and load in the game.
- [x] **D4-02 (P0) Map page.** `/map` renders a `"use client"` `MapLoader` component that loads Phaser with `next/dynamic` and `ssr: false` (that option is not allowed in a server component). Fit to screen, pan and zoom on touch and mouse, branch switcher, clickable zones as in the spec, hover and tap highlights. Destroy the game on unmount; cap the idle frame rate at 30.
  - Check: smooth on a mid-range Android phone over 4G; no errors after navigating away and back five times.
- [x] **D4-03 (P0) Check-in and check-out.** `desks`, `attendance_sessions`, `attendance_edits` and their policies; `who_is_in()`, `check_in` (service role only), `check_out`, `confirm_auto_checkout`, `admin_edit_session`. `/checkin` page and the reception zone. Server action: read the request IP or validate the QR token per the spec, then call `check_in` with the admin client and the verified result. Kiosk: `/kiosk/[branchId]?key=` validates the kiosk key hash and polls `/api/kiosk/[branchId]/token` (same key) every 60 seconds for a new QR. Field check-in with optional card and note; Home check-in only with an approved `work_from_home` request today.
  - Check: tests for token windows (current and previous accepted, older rejected), constant-time compare, CIDR IP match, one open session per user, lateness at the boundary minute in Cairo time, an authenticated user calling `check_in` directly is refused.
- [x] **D4-04 (P0) Characters on the map and live presence.** Checked-in users appear at their desk (or the first free desk) with a default avatar until Day 5. Name tag in team colour, status bubble. Private Realtime channel per branch with the `realtime.messages` policies and the database triggers from `DATA_MODEL.md` section 11. Tap a character: name, role, status, check-in time and current card.
  - Check: one browser checks in and changes status, another sees both within 2 seconds; a requester test user cannot subscribe to the channel.
- [x] **D4-05 (P0) Auto check-out.** Cron `auto-checkout`, hourly in UTC; the handler computes Cairo time and from 23:00 Cairo closes sessions as the spec says (`greatest(scheduled end, checked_in_at)`), sets `auto_closed`, notifies the user. On their next visit the user confirms or corrects the time (`confirm_auto_checkout`).
  - Check: tests with a session from yesterday, a session started after 18:00, and the date on both sides of Egypt's summer-time change.
- [x] **D4-06 (P1) Installable app.** Web app manifest, icons, theme colour; standalone display on Android and iPhone.

## Day 5: characters, leaves and special requests

- [x] **D5-01 (P0) Sprite manifest and compositor.** `public/sprites/manifest.json` per the spec; `src/game/avatar/` compositor that draws tinted layers into a canvas, used by Phaser (a generated texture per user) and by an `<Avatar>` React component (data URL cached by config hash).
  - Check: the same config looks identical on the map and in the people list.
- [x] **D5-02 (P0) Character creator.** `/me/character` with live rotating preview, a picker per layer, colour swatches, randomise, save to `avatars`. Redirect there once after the first password change. Map characters update live after saving.
  - Check: works one-handed on a phone; other viewers see the change on the map.
- [x] **D5-03 (P0) Requests and leave balances.** `leave_balances` and `holidays` with policies; bucket `request-files` with policies (sick-leave notes). Generic JSON-schema form renderer. `/requests/new`: choose a type, fill the form, see balance before and after, attach files where required, submit. `/requests`: my requests with status and steps, cancel while pending. Working-day counting that skips Fridays and holidays; final approval deducts the balance in the same transaction.
  - Check: unit tests for day counting across a weekend and a holiday; a request above the balance shows a clear error; approve and cancel adjust `used` correctly.
- [x] **D5-04 (P0) HR admin.** `/admin/leave`: allowances per user, type and year (bulk set for everyone); holidays list. HR export: CSV of attendance sessions and approved leaves for a date range.
  - Check: hr can do all of this; a member cannot reach it.
- [x] **D5-05 (P0) Team calendar and leave on the map.** `team_absences()`; `/calendar` month view with overlap warnings for leads and traffic; a sign on the desk of anyone on approved leave today; approved work from home enables Home check-in.
  - Check: a member sees a teammate's leave dates but not the reason; two overlapping leaves in one team show a warning to the team lead.
- [x] **D5-06 (P1) Desk assignment** in admin, or by clicking a free desk on the map as super_admin or traffic.

## Day 6: content calendar and dashboards

- [x] **D6-01 (P0) Content calendar data and editor.** `posts`, `post_media` with column grants and policies, bucket `post-media`, the status trigger, `decide_post`, `create_post_from_card`, `mark_post_published`; Realtime publication for `posts`. Post editor panel per `PRODUCT_SPEC.md` section 9: all fields, resumable media upload, browser-made thumbnails (image resize, video first-second frame), width, height and duration, reorderable carousel items, caption counters, aspect-ratio warnings.
  - Check: upload a 50 MB video and a 10-image carousel on a phone; thumbnails appear; a member's post goes to review and a lead approves it; dates show in Cairo time.
- [x] **D6-02 (P0) Month and week views.** `/content` month grid with thumbnail tiles, time, brand stripe, platform badges, status dot, "+N", highlighted empty days; week view with larger cards and caption preview; drag to reschedule in both; filters; per-brand counter against the monthly target; pillar mix bar. "Ready to schedule" side panel: drag a `ready_to_publish` card onto a day to create its post.
  - Check: a post created from a card links both ways; rescheduling by drag updates other viewers live; the counter changes when a post is marked published.
- [x] **D6-03 (P0) Post preview and publishing by hand.** Format-aware preview (feed, carousel with swipe, reel and story 9:16 with caption overlay, playable video, Arabic right-to-left); copy caption per language, copy hashtags, download all media, mark as published with optional links. Cron `post-reminders` every 5 minutes: 30-minute reminder (once per post time, via `reminded_for`) and the 2-hour "not marked as published" alert (once, via `overdue_notified_at`).
  - Check: marking published moves the linked card to `published`; each reminder fires exactly once, and again after a reschedule.
- [x] **D6-04 (P0) Dashboards.** The `security_invoker` views from `DATA_MODEL.md` section 12 with tests that a member sees only their own attendance rows. `/reports/workflow` with the measures in the spec, filters, and each number linking to its card list. `/reports/attendance` for the allowed roles and `/reports/me` for everyone.
  - Check: workflow numbers match a hand count on seeded data.
- [x] **D6-05 (P1) Feed preview and list views** of the content calendar, and print to PDF.
- [x] **D6-06 (P1) Department service dashboard.**

## Day 7: hardening and pilot

- [x] **D7-01 (P0) Access audit.** Run the full access-test matrix including every escalation test; run the Supabase security and performance advisors on staging and fix every finding; confirm the service role key is imported only in `src/lib/supabase/admin.ts`; confirm storage and Realtime policies by trying as the wrong role.
- [x] **D7-02 (P0) Mobile and right-to-left pass.** Every route at 375px in Arabic and English; fix overflow, mirrored icons, date and number formats (Latin digits, DECISIONS D-09).
- [x] **D7-03 (P0) Performance pass.** Lighthouse on `/map`, `/boards/[id]`, `/my-work` and `/content` with a mobile profile; fix the worst offenders; test the map on a real mid-range Android phone.
- [x] **D7-04 (P0) End-to-end tests.** Playwright golden paths: (1) `sales@` submits an urgent request, `lead.performance@` adds input, `traffic@` accepts and briefs, `member@` submits, `lead.creative@` approves, `approver@` confirms, `community@` schedules the post from the card and marks it published; (2) `member@` checks in by QR and appears on the map for `member2@`; (3) `member@` requests annual leave and `lead.creative@`, `admin@` and `hr@` approve in turn (the seeded chain).
- [ ] **D7-05 (P0) Production setup.** _Prepared (production seed, first-admin script, `docs/DEPLOYMENT.md`); runs once the cloud accounts exist._ `supabase db push` to production; production seed (departments, teams, branches, request and leave types, settings, brands, no test users); Vercel environment variables and `CRON_SECRET`; each pilot branch's public IPs and kiosk key; HR sets leave allowances; create the pilot users' accounts and hand each person their temporary password in person or by a private message.
- [x] **D7-06 (P0) Pilot kit.** `docs/USER_GUIDE.md` (one page each in English and Arabic: sign in and change your temporary password, create your character, check in, find your cards, plan a post on the content calendar, request leave) and `docs/PILOT_CHECKLIST.md` (what to try, how to report problems). Sprint summary in `docs/PROGRESS.md`.
- [x] **D7-07 (P0) Bug bash.** Fix every bug from D7-01 to D7-04 that blocks the pilot.

---

## Backlog: weeks 2 to 4 (not in this sprint)

Week 2
- Meetings inside Pixel HQ (requests, accept and decline, room, status "In a meeting"), without calendar sync
- KPI scorecards per role with auto-filled measures and monthly acknowledgement
- Department service dashboard; monthly snapshot and executive PDF emailed on the 1st
- Delegation of approvals; daily digest email; push notifications

Week 3
- More branch maps with real art; asset pack integration
- Asset library with tags and versions; announcements on the notice board
- Content calendar extras: duplicate posts, recurring slots, print views

Week 4
- Gamification: XP, coins, levels, badges, kudos, cosmetic shop, desk decoration, seasonal items, team leaderboards with anti-gaming caps
- Free walking on the map
- Polish: speed, accessibility, Arabic copy review
- Onboarding and offboarding checklists, one-to-one notes, training records

Later, only if Adham decides to integrate with outside platforms: publishing to social networks, social and ads analytics, Google Calendar sync.
