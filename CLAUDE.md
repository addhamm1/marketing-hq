# Pixel HQ

Pixel HQ is the internal portal for the Espaces marketing department (Espaces is an Egyptian coworking brand with branches across Cairo, Giza, Alexandria and Sharqia). Its home screen is a pixel-art map of a branch where each team member appears as their own character while checked in. Behind the map: Trello-style boards running the marketing content cycle, a department portal for other teams to submit requests, leaves and special requests with approvals, dashboards, and a visual content calendar showing what gets posted when, with its media and caption.

Owner: Adham Mostafa, Marketing Team Lead. He is the only developer; you are his pair programmer.

## Read these before any task

| File | What it holds |
| --- | --- |
| `docs/PRODUCT_SPEC.md` | What each module must do for the MVP, and what is out of scope |
| `docs/BUILD_PLAN.md` | The 7-day sprint, task by task, with acceptance checks. Work from here |
| `docs/DATA_MODEL.md` | Tables, enums, helper functions and the access rules per role |
| `docs/DECISIONS.md` | Open questions and the default to use until Adham answers |
| `docs/SEED_DATA.md` | Departments, teams, branches, request and leave types to seed |

If code and these docs disagree, stop and ask. If a doc is wrong or outdated, propose the edit to the doc in the same change.

## Stack (do not swap without asking)

- Next.js (App Router, latest stable at sprint start; versions recorded in `docs/PROGRESS.md` on Day 1) with React and TypeScript in strict mode, pnpm
- Tailwind CSS and shadcn/ui (use `sonner` for toasts); lucide-react icons
- next-intl for English and Arabic, with right-to-left layout for Arabic
- Supabase: Postgres, Auth (email and password; accounts are created by admins, no public sign-up), Realtime, Storage. Local development with the Supabase CLI
- `@supabase/ssr` for server and browser clients
- Phaser 3 for the pixel map, loading maps exported from the Tiled editor as JSON
- dnd-kit for drag and drop; `fractional-indexing` for list and card order
- Zod for every input boundary; React Hook Form for forms
- TanStack Query for client data that needs live updates; server components and server actions for everything else
- Recharts for dashboards
- Resend for email
- Vitest for unit and database access tests; Playwright for end-to-end tests
- Sentry for errors
- Hosting: Vercel (app and Vercel Cron, which runs in UTC), Supabase cloud in the Frankfurt region: a staging project for previews and CI, a production project for the live app

No integrations with outside platforms: nothing connects to social networks, ads platforms, Google Calendar or Trello. Publishing is done by hand.

## Local environment notes

- Next.js 16.4 with `cacheComponents` off: every route is per-user, so caching gains nothing. Read `node_modules/next/dist/docs/` before using a Next.js API you are unsure about.
- pnpm lives in `~/.local/bin` (Corepack). Docker runs in Colima (`colima start`), also in `~/.local/bin`. The Supabase CLI is a dev dependency: `pnpm supabase ...`.
- `shadcn add` writes `import { cn } from "cn"`; replace it with `@/lib/utils` after adding a component.
- Seeds load from `supabase/seed/*.sql` in name order (`[db.seed] sql_paths` in `config.toml`).

## Commands

```bash
pnpm dev                 # app on http://localhost:3000
pnpm build               # production build, must pass before any task is done
pnpm typecheck           # tsc --noEmit
pnpm lint
pnpm test                # vitest, including access-rule tests against local Supabase
pnpm test:e2e            # playwright
pnpm db:start            # supabase start (needs Docker running)
pnpm db:reset            # supabase db reset: reapplies migrations and seed
pnpm db:migration <name> # supabase migration new <name>
pnpm db:types            # regenerate src/lib/supabase/database.types.ts
```

Create these scripts on Day 1 if they do not exist.

## Folder layout

```
src/
  app/[locale]/
    (auth)/            sign-in, change password (forced on first sign-in)
    (app)/             signed-in team app: map, boards, my-work, approvals, requests, calendar, content, reports, people, admin
    (portal)/portal/   department portal: new request, my requests, approvals, files
    kiosk/[branchId]/  reception tablet showing the rotating check-in QR (no sign-in; checks the kiosk key)
  app/api/cron/        cron route handlers, protected by CRON_SECRET
  app/api/kiosk/       QR token endpoint for the kiosk page, protected by the kiosk key
  proxy.ts             (Next.js 16 name for middleware) chains next-intl, the Supabase session refresh and the coarse route guard
  components/ui/       shadcn components (generated, do not hand-edit beyond theming)
  components/          shared app components
  features/<module>/   components, server actions, queries and schemas per module
  game/                Phaser scenes, sprite and map loaders, avatar compositor
  lib/supabase/        server, browser and admin clients; generated types
  lib/                 auth guards, permissions, dates (Africa/Cairo), utils
  messages/            en.json, ar.json
supabase/
  migrations/          one file per change, never edit an applied migration
  seed/                seed files per migration day, concatenated by seed.sql
  seed.sql             local and staging seed data, including test users
  .env                 values the Supabase CLI reads for config.toml (not committed)
  tests/               access-rule tests
public/
  maps/                Tiled JSON maps and tilesets
  sprites/             character layers and sprite manifest
docs/                  the files listed above
```

## Rules that always apply

### Security
1. Every new table gets row-level security enabled and its policies in the same migration. No table ships without policies and at least one access test per role that touches it.
2. Read `DATA_MODEL.md` section 0 before any migration. Row policies alone are not enough: protect columns with column grants, put multi-step rules in `security definer` functions, and never create plain (definer) views. Use the helper functions (`has_role`, `is_team_lead_of`, and so on) inside policies instead of repeating logic.
3. Every `security definer` function sets `search_path = public`, checks the caller itself, and has its `execute` grant set explicitly (revoked from `public` and `anon`).
4. The service role key is used only in `src/lib/supabase/admin.ts`, only in server code, and only for cron jobs, check-in and admin tasks that truly need it (creating accounts, resetting passwords, banning deactivated users, clearing `must_change_password`). Never import it into a client component.
5. Validate every server action input with Zod, then check the caller's permission on the server. Hiding a button is not a permission check.
6. Storage buckets are private. Files are served through signed URLs that expire.
7. Realtime channels for the map are private and their events are sent by database triggers, never by browsers (`DATA_MODEL.md` section 11).
8. Never log tokens, keys, passwords or personal data. Secrets are compared in constant time. Temporary passwords are shown to the admin once and never stored or emailed by the app.
9. After any schema change, run the Supabase security and performance advisors and fix what they report.

### Data
1. All timestamps are `timestamptz`. Business logic about days, lateness, deadlines and "today" uses the `Africa/Cairo` time zone through `src/lib/dates.ts` (in SQL: `now() at time zone 'Africa/Cairo'`). Egypt changes clocks for summer time, so never hardcode a UTC offset. The work week is Saturday to Thursday; Friday is off.
2. Schema changes only through new migration files. Regenerate types after every migration.
3. Approval decisions, attendance edits, role changes and deletions are written to `audit_log` by database triggers.
4. Prefer soft delete (`archived_at`) for cards, boards and requests.

### Interface
1. Every user-facing string goes in both `messages/en.json` and `messages/ar.json`. No hardcoded text in components.
2. Use logical CSS properties (`ms-`, `me-`, `ps-`, `pe-`, `start`, `end`) so right-to-left works without extra code. Check every new screen in Arabic.
3. Mobile first: every screen must work at 375px wide. Boards and reports may be best on a laptop, but must not break on a phone.
4. Every list has an empty state, a loading state, and an error state.
5. Forms show errors next to the field, in the user's language.
6. Brand: Espaces is premium and professional. The pixel map is playful; the rest of the interface is clean and calm. Keep colours and fonts in Tailwind theme tokens so the brand palette can be swapped in one place.

### Code
1. Small, focused files. A component over about 200 lines gets split.
2. Server components by default. Add `"use client"` only where interaction needs it.
3. Phaser runs only in the browser: a `"use client"` loader component imports the game with `next/dynamic` and `ssr: false` (not allowed in server components), and destroys the game instance on unmount.
4. Shared types come from the generated database types plus Zod schemas. No `any`.
5. Do not add a new dependency without saying why in the task summary.

## How to work through the build plan

1. Take the next unchecked task in `docs/BUILD_PLAN.md`. Do tasks in order unless Adham says otherwise.
2. Before coding a task that touches more than three files, write a short plan (files, migrations, tests) and wait for Adham's go-ahead.
3. Build it, including its migration, access tests, translations and empty states.
4. Run `pnpm typecheck && pnpm lint && pnpm test && pnpm build`. Fix everything before moving on.
5. Check the task's acceptance criteria one by one, in the browser where they are visual.
6. Tick the task in `docs/BUILD_PLAN.md`, then commit with a message starting with the task id, for example `D2-03: card detail drawer`.
7. If a task is blocked by an open decision, use the default in `docs/DECISIONS.md`, mark the code with `// DECISION: <id>`, and say so in your summary.
8. At the end of each day, write a short entry in `docs/PROGRESS.md`: done, not done, risks, what tomorrow starts with.

## Definition of done for any task

- [ ] Acceptance criteria met and checked
- [ ] Typecheck, lint, tests and build pass
- [ ] New tables have RLS and access tests
- [ ] Strings in English and Arabic; screen checked in right-to-left
- [ ] Works at 375px wide
- [ ] Empty, loading and error states present
- [ ] Task ticked in `BUILD_PLAN.md` and committed
