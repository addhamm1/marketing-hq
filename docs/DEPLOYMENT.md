# Deployment

Two Supabase projects in Frankfurt (staging for previews and CI, production for the live app) and one Vercel project. Nothing connects to social networks, ads platforms, Google or Trello.

## 1. Supabase (do this for staging, then production)

1. Create the project (Frankfurt). Production on the Pro plan (daily backups).
2. **Auth → Providers:** keep only **Email**. Turn **off** "Allow new users to sign up" and "Confirm email". Minimum password length **10**. Production: turn on leaked-password protection.
3. **Auth → URL configuration:** site URL = the app URL; redirect URLs = the app URL, `http://localhost:3000/**`, and a wildcard for Vercel preview URLs (staging only).
4. **Storage → Settings:** global file size limit at least **500 MB** (videos up to 50 MB+ are uploaded resumably).
5. Link and push the schema:
   ```bash
   pnpm supabase link --project-ref <ref>
   pnpm supabase db push
   ```
6. Seed:
   - **Staging:** `pnpm supabase db push --include-seed` (test users and demo data from `supabase/seed/`). Never on production.
   - **Production:** `psql "<production connection string>" -v ON_ERROR_STOP=1 -f supabase/seed-production.sql` (departments, teams, branches, settings, brands, workspaces, the Content Pipeline, request types, holidays; no users).
7. Run the advisors and fix anything new: `pnpm supabase db advisors --linked --type all --level warn`.
8. **First admin (production):** sign-up is disabled, so create the first super admin with the service role key, then sign in and change the temporary password:
   ```bash
   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<key> \
     pnpm tsx scripts/create-admin.mts adham@e-spaces.co "Adham Mostafa"
   ```

## 2. Vercel

1. Import the repository. Framework: Next.js. Install: `pnpm install`.
2. Environment variables (Production = production project; Preview = staging project):

   | Variable | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the project's publishable (anon) key |
   | `SUPABASE_SERVICE_ROLE_KEY` | the project's secret (service role) key, server only |
   | `NEXT_PUBLIC_APP_URL` | the public URL (production: the e-spaces.co subdomain) |
   | `CRON_SECRET` | a long random string (Vercel sends it to cron routes) |
   | `RESEND_API_KEY` | Resend key (verified e-spaces.co domain) |
   | `EMAIL_FROM` | `Marketing HQ <marketinghq@e-spaces.co>` |
   | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` | Sentry project (optional) |

3. Cron jobs are declared in `vercel.json` (UTC; the code works out Cairo time itself):
   `due-soon` hourly, `daily` 03:30, `emails` every 10 minutes, `auto-checkout` hourly at :05, `post-reminders` every 5 minutes. Sub-hourly schedules need Vercel Pro.
4. Add the production domain (a subdomain of e-spaces.co).

## 3. GitHub Actions

`.github/workflows/ci.yml` runs on every push: local Supabase, reset, types up to date, typecheck, lint, Vitest (unit + access tests), build, advisors, Playwright. On `main` it pushes migrations and the seed to staging when these repository secrets exist: `SUPABASE_ACCESS_TOKEN`, `STAGING_DB_PASSWORD`, `STAGING_PROJECT_REF`.

## 4. Before the pilot

- In `/admin/branches`, for each pilot branch: stand at the branch and tap **Use my current location** (or enter latitude and longitude), check the check-in radius (150 m by default), office public IPs (CIDR) for the Wi-Fi fallback, allowed check-in methods, desks. The seeded coordinates are approximate (DECISIONS D-18).
- HR sets leave allowances in `/admin/leave` (they start at 0) and adds the year's holidays.
- Create the pilot users' accounts in `/admin/users` and hand each person their temporary password in person or by private message (`docs/SEED_DATA.md` lists names and roles).
- Set each requesting department's default approver (Sales: the Sales team lead).
