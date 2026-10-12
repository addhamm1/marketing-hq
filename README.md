# Marketing HQ

The internal portal for the Espaces marketing department: a pixel-art map of the branch where checked-in teammates appear as their own characters, Trello-style boards running the content cycle, a portal for other departments, leaves and special requests with approvals, a content calendar, and dashboards. English and Arabic (right-to-left).

## Run it locally

Requirements: Node 20+, pnpm (Corepack), Docker (Docker Desktop, OrbStack or Colima).

```bash
pnpm install
pnpm db:start          # local Supabase (first run downloads images)
cp .env.example .env.local   # fill in the keys printed by `pnpm supabase status`
pnpm db:reset          # migrations + seed (test users, demo data)
pnpm dev               # http://localhost:3000
```

Test users (local and staging only) all use the password `Test1234!`: `admin@`, `traffic@`, `lead.creative@`, `lead.performance@`, `member@`, `member2@`, `community@`, `sales@`, `approver@`, `hr@`, `leadership@`, `guest@test.local`, plus `newhire@test.local` (forced password change).

## Checks

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
pnpm test:e2e          # Playwright (smoke, golden paths, 375px pass in both languages)
pnpm supabase db advisors --local --type all --level warn
node scripts/perf-check.mjs http://localhost:3100   # against `pnpm start -p 3100`
```

## Docs

- `CLAUDE.md`: conventions and rules for working on the code
- `docs/PRODUCT_SPEC.md`, `docs/DATA_MODEL.md`, `docs/BUILD_PLAN.md`, `docs/DECISIONS.md`, `docs/SEED_DATA.md`
- `docs/DEPLOYMENT.md`: staging and production setup
- `docs/USER_GUIDE.md`, `docs/PILOT_CHECKLIST.md`: for the pilot
- `docs/PROGRESS.md`: what was built each day
