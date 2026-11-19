# Free test version (a few days, before launch)

Everything here is on free plans: **Supabase Free** for the database, sign-in, files and live map, and **Netlify Free** for the website. Vercel's free plan is for personal, non-commercial use only, so it is not used for a company tool.

Limits to know for the test:
- Supabase Free pauses a project after 7 days without activity and has no daily backups. Treat test data as disposable.
- Netlify Free has a monthly usage allowance; a few days of team testing is well within it. Its server functions run in the United States, so pages are a little slower than on the final host.
- Phone notifications and emails work only once the VAPID and Resend keys are set (optional for the test).

## 1. Supabase project (free)

Organisation "addhamm1's Org", name `marketing-hq-test`, region Frankfurt (`eu-central-1`). Supabase quotes $0 a month. Then, from the project folder:

```bash
pnpm supabase login
pnpm supabase link --project-ref <project-ref>
pnpm supabase db push
psql "<session pooler connection string>" -v ON_ERROR_STOP=1 -f supabase/seed-production.sql
```

In the dashboard: Authentication → Sign In / Providers: Email only, sign-ups **off**, confirm email **off**, minimum password length 10. Copy the project URL, the publishable key and the secret key from Project Settings → API Keys.

## 2. Netlify site (free)

1. Sign in at netlify.com (any plan: Free).
2. From the project folder: `pnpm dlx netlify-cli login`, then `pnpm dlx netlify-cli init --manual` to create the site.
3. Site configuration → Environment variables: the same names as `docs/DEPLOY_HOSTING_COM.md` step 4 (the four `NEXT_PUBLIC_` values, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, and optionally `RESEND_API_KEY`, `EMAIL_FROM`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`). `NEXT_PUBLIC_APP_URL` is the site's `https://<name>.netlify.app` address.
4. Deploy: `pnpm dlx netlify-cli deploy --build --prod`.

## 3. Scheduled jobs, people, checks

- Run `supabase/production-cron.sql` in the Supabase SQL editor with the Netlify address and the `CRON_SECRET`.
- Create the accounts: `scripts/create-admin.mts`, then `scripts/create-staff.mts` (see `docs/DEPLOY_HOSTING_COM.md` step 6). Temporary passwords are printed once.
- Sign in, open `/admin/launch`, then share the address with the testers.

## After the test

Move to the chosen host (`docs/DEPLOY_HOSTING_COM.md` for a Hosting.com VPS or cPanel, or `docs/DEPLOYMENT.md`), and either upgrade this Supabase project or create the production one and re-run step 1 there.
