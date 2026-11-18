# Progress log

One entry per sprint day, newest first. Claude Code writes it at the end of each day.

## M-02 (2026-10-18): location check-in replaces QR

- Done: check-in by location (nearest branch inside its geofence: radius + accuracy capped at 100 m, readings worse than 200 m refused), Wi-Fi kept as a fallback, field days require a location and take an optional place name, check-out records a location (best effort). The reception QR kiosk, its API route, kiosk key and QR secret (`branch_secrets`), the QR crypto and the `qrcode` dependency are gone. Admin branches edit latitude, longitude and radius ("Use my current location"). HR export adds method, place, check-in and check-out "lat,lng", accuracy and distance. Field place names show in the map popover and on profiles.
- Access: coordinates follow the existing attendance row policy (person, team lead, hr, super_admin, leadership); `who_is_in()` returns branch, method and place only. Home sessions never store a location.
- Decisions used with defaults: D-03 (location + Wi-Fi), D-18 (approximate seeded coordinates; confirm per branch in `/admin/branches`).

## Sprint summary (2026-10-17)

All seven days are built and tested locally: 41 of 42 tasks are done (every P0 and P1 except D7-05, which is prepared and waits for the cloud accounts). 178 Vitest tests (unit and database access rules), 13 Playwright tests (smoke, three golden paths across ten users, every route at 375px in English and Arabic), zero Supabase advisor warnings, production build passing.

**Before the pilot (needs Adham):** create the GitHub repository, two Supabase projects, Vercel, Resend and Sentry (Day 0 list), then follow `docs/DEPLOYMENT.md` and `docs/PILOT_CHECKLIST.md`. Answer the open decisions in `docs/DECISIONS.md` (D-02 home branch, D-05 allowances, D-13 stage targets, D-17 password recovery) and review the Arabic copy.

**Known limits:** placeholder art (an asset pack drops in through `public/sprites/manifest.json` and Tiled maps); stage timers use calendar hours (working hours is P1); the week view moves posts between days, not time slots; Lighthouse itself wasn't run (a Playwright check with mobile throttling measured LCP 0.2 to 0.6 s and CLS 0 on the key routes; the map loads about 1.4 MB of JavaScript, mostly Phaser, only on `/map`).

## Day 7 (2026-10-17): hardening and pilot

- Done: D7-01 access audit (advisors: 0 warnings after splitting 16 `for all` write policies; service role key only in `src/lib/supabase/admin.ts`, admin client only in server code; storage and Realtime policies tested as the wrong role), D7-02 mobile and right-to-left pass (Playwright checks every route at 375px in both languages; fixed My work overflow), D7-03 performance pass (see summary), D7-04 golden-path e2e tests, D7-06 user guide (English and Arabic) and pilot checklist, D7-07 bug bash. Added `/admin/request-types` (chains and form fields) and `/admin/organisation` (default approvers, teams), a "Schedule on the content calendar" action on ready cards, `/cards/[id]` stable links, the production seed and the first-admin script.
- Not done: D7-05 production setup (needs the cloud accounts).

## Day 6 (2026-10-16): content calendar and dashboards

- Done: D6-01 to D6-06. Posts and media (protected status changes through `submit_post`, `decide_post`, `create_post_from_card`, `mark_post_published`; approved posts become scheduled when they get a time); post editor with resumable uploads over 6 MB (TUS, tested with a 50 MB file), browser-made thumbnails, sizes and durations, aspect-ratio warnings, carousel reorder, caption counters per platform; month view (Saturday-first, "+N", empty days highlighted, brand stripe, platform badges, status dot) and week view, drag to reschedule (keeps the time), "Ready to schedule" panel (drag a ready card onto a day to create its post), per-brand counters and pillar mix; format-aware preview with Arabic and English captions, copy caption and hashtags, download media, mark as published (moves the card); reminders cron every 5 minutes; dashboards on `security_invoker` views: workflow (numbers open the cards behind them), attendance, my numbers, department service; feed preview and list (printable).
- Tests: 178 passing; workflow numbers checked against a hand count in SQL (39 created, 5 delivered in 30 days).
- Fixes found today: select policies that look a row up by id fail on INSERT ... RETURNING (the new row is invisible to the function), so `boards` and `posts` now check their own columns; a NULL publisher made the publish permission check pass (NULL in IF); dev logs printed server action arguments, now disabled (`logging.serverFunctions: false`).
- Tomorrow starts with: D7-01 access audit.

## Day 5 (2026-10-15): characters, leaves and special requests

- Done: D5-01 to D5-06. Pixel portraits everywhere a person appears (rendered once from the sprite compositor, cached by config hash); character creator with rotating preview, per-layer pickers with live previews, colour swatches, randomise and save (first sign-in lands there once); generic request form from each type's JSON schema with live working-day count and balance before and after; sick notes in the private `request-files` bucket (required after 2 days, enforced in `submit_request`); My requests with steps and cancel; HR admin (allowances per person, type and year, bulk set, holidays, CSV export with formula-injection protection); team calendar (Saturday-first month grid, mobile list, overlap warnings for leads and traffic); leave signs on the map; desk assignment per branch; People directory and profiles.
- Tests: 161 passing (team calendar privacy, attachment rule, file access, avatars, balances; unit suite also passes under TZ=UTC as on Vercel).
- Changes from the kit: request files live under `requests/<requester>/` and are listed in `requests.data.files` (so the attachment rule is checked by the database before the request exists).
- Tomorrow starts with: D6-01 content calendar data and editor.

## Day 4 (2026-10-14): the map, check-in and presence

- Done: D4-01 to D4-06. Generated placeholder tileset, 27 character layer sheets and a manifest (`pnpm make:placeholders`); Tiled maps `hq` (16 desks and the feature zones), `field`, `home`; Phaser 3.90 map engine (fit to screen, pinch and wheel zoom, pan, zone highlights, characters with name tags and status bubbles, 30 fps cap, full cleanup on unmount); `/map` with branch switcher, live presence over the private `branch:<id>` channel (events sent by database triggers), character popover; check-in by office Wi-Fi IP (CIDR), rotating QR (kiosk page and token endpoint protected by a hashed kiosk key), field and home; auto check-out cron with confirmation; installable app (manifest and icons).
- Tests: 154 passing, including token windows, constant-time compare, CIDR matching, lateness at the boundary minute in Cairo time, Egypt's summer-time change, one open session per user, `check_in` refused for users, and a requester refused on a branch channel.
- Changes from the kit: avatars are created on Day 4 so the map can draw them; `my_open_session()` and `my_wfh_today()` support the check-in page; branch channels also exist for `branch:field` and `branch:home`.
- Tomorrow starts with: D5-01 avatar compositor in React and the character creator.

## Day 3 (2026-10-13): department portal, approvals and notifications

- Done: D3-01 to D3-06. Portal home with simplified statuses, strategic plan (many lines, deadline on the 25th, late flag) and urgent request forms, request page with progress, comments, files, confirmation step and edit-and-resubmit; performance input and intake actions; approval engine for requests (resolvers, no self-approval, fallbacks, skipped steps, same-approver merge, multi-candidate steps); one approvals inbox for requests and cards with inline image and video previews; notification bell with live unread count; emails through Resend (or a logged preview locally) in the recipient's language, sent right after the action with a 10-minute cron safety net; cron routes `due-soon` (hourly) and `daily`; Trello file import.
- Tests: 128 passing.
- Changes from the kit: `leave_balances` and `holidays` are created in this migration because `submit_request` needs them (screens on Day 5). Notifications store `kind` + `data` and are rendered in the reader's language; `emailed_at` makes email sending idempotent.
- Security fix: function EXECUTE was still granted to PUBLIC by the global default; now revoked globally and at the end of each migration, with a test that internal helpers are refused.
- Tomorrow starts with: D4-01 placeholder art and maps (in progress in parallel), then the map page and check-in.

## Day 2 (2026-10-12): boards and the content cycle

- Done: D2-01 to D2-06. Boards, lists, cards and approvals schema with policies, column grants and storage; Content Pipeline with its ten fixed stage lists; `move_card_stage` with the transition table and required fields; `decide_step` for card review and confirmation (same-approver merge); Kanban with dnd-kit (touch, keyboard, fractional positions, optimistic moves with rollback), live updates through Postgres Changes; card detail sheet addressable by `?card=` (fields, assignees, labels, checklists, comments with @mentions, attachments with signed URLs, activity); table view with sorting and combined filters; My work; workload view with the WIP limit.
- Tests: 105 passing (access tests for boards and cards, every allowed and forbidden transition, review and confirmation, revisions, mentions, notifications).
- Changes from the kit: `can_edit_card` also lets the card creator and anyone who may add cards edit cards on shared free-form boards (Trello-like); `card_events` gained `update`, `approval`, `attachment` and `created` kinds so every field change shows in the activity feed; cards carry `stage_entered_at` for the stage timer.
- Decisions used with defaults: D-13 (stage targets, calendar hours in v1), D-16 (performance input can be skipped with "No input").
- Tomorrow starts with: D3-01 department portal.

## Day 1 (2026-10-12): foundation

- Versions: Next.js 16.4.0, React 19.3.0, next-intl 4.14.9, @supabase/supabase-js 2.117.3, @supabase/ssr 0.12.7, Supabase CLI 2.120.0, Phaser 3.90.0, Tailwind CSS 4.3.3, Zod 4.6.5, Vitest 5.0.3, Playwright 1.64.0, @sentry/nextjs 11.6.0, Node 24, pnpm 12.
- Done: D1-01 to D1-08. Scaffold, English and Arabic with right-to-left, local Supabase, core schema with policies and column grants, admin-created accounts with forced password change, app shell, admin (users, branches, settings, audit), Vitest unit and access tests (77 passing), Playwright smoke tests (4 passing), CI workflow, Sentry wiring.
- Changes from the kit:
  - Google sign-in removed (D-01 answered). Accounts are created by admins; `must_change_password` forces a new password on first sign-in.
  - `branch_secrets` has no client access at all; admins change it through two functions.
  - `is_marketing()` requires at least one role; guests count as team app users limited to boards and my work.
  - `my_access()` returns everything the guards and shell need in one call.
  - `cacheComponents` is off (per-user app).
- Not done, and why: D1-08 deploy steps (staging `db push`, Vercel previews, Sentry check) wait for the cloud accounts from Day 0. The workflow has the job; it runs once `SUPABASE_ACCESS_TOKEN`, `STAGING_DB_PASSWORD` and `STAGING_PROJECT_REF` secrets exist.
- Decisions used with defaults: D-02 (hq branch), D-03 (Wi-Fi and QR), D-08 (English default), D-09 (Latin digits), D-13, D-14, D-15, D-17 (admin resets passwords).
- Risks or blockers: the Mac has little free disk space (Docker images use about 3 GB). Docker runs in Colima.
- Tomorrow starts with: D2-01 boards, approvals and notifications schema.

## 2026-11-18: workflow round (W-00 to W-18)

- Done: required location for every check-in and check-out, My Day, meetings and fixed meetings, monthly gates, shoot planner, team week, request tracker, digest and phone notifications, kudos and birthdays, tap to move and map interactions, new character art and seasonal outfits, launch checklist and admin editors.
- Security: Next.js 16.4.0 to 16.4.6 and Zod 4.6.7, closing critical and high advisories. `shadcn` moved to dev dependencies.
- Not verified with real services: Resend email, web push on a real phone, the production database.
- Waiting on Adham: staff emails (D-19), birthdays and joining dates, branch points (D-18), cloud accounts and VAPID keys.
