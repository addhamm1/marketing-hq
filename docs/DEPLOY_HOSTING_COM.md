# Going live on Hosting.com

Marketing HQ has two parts:

| Part | Where it runs | Why |
| --- | --- | --- |
| The website (Next.js) | Hosting.com, cPanel **Setup Node.js App** | Pages, server actions, emails, phone notifications |
| Database, sign-in, files, live map | Supabase (Frankfurt) | Hosting.com has no Postgres, Supabase Auth, Realtime or Storage |

Scheduled jobs (meeting reminders, "In a meeting", gates, check-out, digest) run in Supabase Cron, not in cPanel, because shared hosting allows cron jobs every 15 minutes at most and may stop idle Node.js processes.

Requirements on Hosting.com: a plan with **Setup Node.js App** and a Node.js version of **20.9 or newer** (pick the newest offered). A VPS also works with the same package.

## 1. Supabase production project

1. Create the project in the Frankfurt region and follow `docs/DEPLOYMENT.md` section 1 (Auth settings, storage limit, `db push`, production seed, advisors).
2. Note three values from **Project Settings → API**: the project URL, the publishable (anon) key, and the secret (service role) key. The secret key never leaves the server.

## 2. The public settings for the build

Public values are written into the website when it is built. On the computer that builds the package, create `.env.production.local` in the project folder with only these lines:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key>
NEXT_PUBLIC_APP_URL=https://hq.e-spaces.co
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public key from: pnpm dlx web-push generate-vapid-keys>
```

Keep the VAPID private key for step 4. The packaging script refuses to run if this file contains a secret.

## 3. Build the package

Commit your work, then:

```bash
node scripts/package-hosting.mjs
```

It builds the last commit in a clean copy and writes `dist/marketing-hq-<commit>.zip` (about 20 MB) with `server.js` at its root, no symlinks and no secrets.

## 4. Hosting.com (cPanel)

1. **Address.** Domains: add the subdomain (for example `hq.e-spaces.co`). If e-spaces.co's DNS is managed elsewhere, add an `A` record for `hq` pointing to the Hosting.com server IP shown in cPanel. Turn on SSL (AutoSSL or Let's Encrypt) and wait until `https://` works.
2. **Create the app.** Software → **Setup Node.js App** → Create application:
   - Node.js version: the newest offered (20.9 or newer)
   - Application mode: Production
   - Application root: `marketing-hq`
   - Application URL: the subdomain from step 1
   - Application startup file: `server.js`
3. **Environment variables** (same screen, "Add variable"):

   | Name | Value |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | the same values as step 2 |
   | `SUPABASE_SERVICE_ROLE_KEY` | the secret key from step 1 |
   | `CRON_SECRET` | a long random string (`openssl rand -hex 32`); keep it for step 5 |
   | `RESEND_API_KEY`, `EMAIL_FROM` | Resend key and `Marketing HQ <marketinghq@e-spaces.co>` |
   | `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | the private key from step 2, and `https://hq.e-spaces.co` |

   Save, then **Stop** the app.
4. **Upload.** Files → File Manager → open the `marketing-hq` folder → Upload the zip → select it → **Extract** into this folder → delete the zip. Do not press "Run NPM Install": everything the app needs is already in the package.
5. **Start.** Back in Setup Node.js App, **Start** (or Restart) the app and open the address. The first visit after a restart can take a few seconds.

## 5. Scheduled jobs

In Supabase: **SQL Editor** → paste `supabase/production-cron.sql` → replace `https://REPLACE-WITH-APP-URL` with the address and `REPLACE-WITH-CRON-SECRET` with the `CRON_SECRET` from step 4 → Run. The last result lists nine `hq-` jobs. **Integrations → Cron** shows each run.

## 6. People and launch checks

1. First admin, then everyone in `supabase/staff.json` (run on your computer; the scripts print each temporary password once):
   ```bash
   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<secret key> pnpm tsx scripts/create-admin.mts adham@e-spaces.co "Adham Mostafa"
   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<secret key> pnpm tsx scripts/create-staff.mts
   ```
2. Sign in, change the temporary password, open `/admin/launch` and work through what it lists.

## Updating later

Build a new package (step 3), Stop the app, upload and extract over the old files (replace all), Start. Database changes: `pnpm supabase db push` to production before starting the new version.

## If something goes wrong

- **Blank page or 503:** Setup Node.js App → open the app's log file (path shown on the app's page), or check that `server.js` is directly inside the application root, not in a subfolder.
- **"Application failed to start: memory":** the plan's limits are too small; ask Hosting.com to raise them or move to a VPS.
- **Sign-in works but nothing loads:** the `NEXT_PUBLIC_` values in the package and in cPanel do not match the Supabase project. Rebuild the package after fixing `.env.production.local`.
