# Progress log

One entry per sprint day, newest first. Claude Code writes it at the end of each day.

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
