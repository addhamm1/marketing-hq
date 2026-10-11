# Progress log

One entry per sprint day, newest first. Claude Code writes it at the end of each day.

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
