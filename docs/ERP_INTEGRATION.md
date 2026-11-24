# Integrating Marketing HQ with the Espaces ERP

A practical guide for the developer who will connect Marketing HQ to the company ERP. Read `docs/TECHNICAL_GUIDE.md` first, especially section 5 (data model), section 6 (security model), section 7 (database functions) and section 9 (business rules). This document builds on them.

Status of what follows:

- Marketing HQ has **no integration with the ERP today**, and no external identifiers (such as an employee number) on its people, departments or branches.
- Everything marked **proposed** is a design, not code in the repository. Any change to Marketing HQ must follow `CLAUDE.md`: a written plan first, one migration per change with row-level security and access tests, both languages for any screen, and the full check list before merging.
- Code samples are sketches to adapt and test, not drop-in files. They contain no real addresses, keys or passwords.

## Contents

1. [What we know about the ERP](#1-what-we-know-about-the-erp)
2. [Where the two systems overlap](#2-where-the-two-systems-overlap)
3. [Integration patterns](#3-integration-patterns)
4. [Recommended first integrations](#4-recommended-first-integrations)
5. [Rules the integration must respect](#5-rules-the-integration-must-respect)
6. [Questions for the ERP team](#6-questions-for-the-erp-team)
7. [Step-by-step plan](#7-step-by-step-plan)
8. [Appendix: the signature scheme](#8-appendix-the-signature-scheme)

---

## 1. What we know about the ERP

### 1.1 Observations

These were observed from outside, without signing in. None is confirmed by the ERP team.

| Observation | What it suggests |
| --- | --- |
| The leads module is at `https://espaces.atwdemo.com/admin/leads` | The ERP has a **leads** module under an `/admin` area |
| Responses come through **Cloudflare** | A proxy and firewall sit in front of the ERP. Server-to-server calls may be challenged by bot protection |
| An unauthenticated visit **redirects to `/admin/login`** | Session-based admin login; no public API at that path |
| It sets an `XSRF-TOKEN` cookie and an `espaces-erp-session` cookie | `XSRF-TOKEN` is the default CSRF cookie of **Laravel**. An `/admin` panel with `/admin/login` is the default layout of **Filament**, a Laravel admin panel. Laravel's default session cookie name uses underscores, so a hyphenated name means a custom setting or a different framework |
| The host name contains "demo" | This may be a vendor's demo or staging environment rather than production |

### 1.2 What to assume until confirmed

- Treat the ERP as a Laravel application that may have no API yet. Laravel can expose one easily (API routes with token authentication such as Sanctum), receive signed webhooks, call HTTP endpoints from queued jobs, and run scheduled tasks.
- A Filament panel is only a user interface. Data exchange needs API routes or database access, not the panel.
- Cloudflare must be told about machine traffic: a firewall rule that skips challenges for the integration paths, limited to known source addresses or protected with a service token.
- The ERP's database engine (MySQL, MariaDB or Postgres), hosting location and time zone are unknown. Laravel's default `APP_TIMEZONE` is UTC; Marketing HQ's business dates are Cairo dates (section 5).

The full list of questions is in section 6.

---

## 2. Where the two systems overlap

| Area | Marketing HQ today | ERP (to confirm) | Proposed system of record | Direction |
| --- | --- | --- | --- | --- |
| People (HR roster) | `profiles` (name, email, department, team, home branch, title, phone, status, joining date, birth month and day), `schedules`, `user_roles`. Accounts are created by a super admin or a script. No employee number | Probably an employee master | **ERP** for identity and organisation fields; **Marketing HQ** for app roles (super_admin, traffic_manager, team_lead and so on) and for marketing teams | ERP → Marketing HQ |
| Departments | `departments` (`slug`, names, `is_marketing`, `default_approver_id`) | Probably an org chart | **ERP** for the list and names; **Marketing HQ** for `is_marketing` and the default approver | ERP → Marketing HQ, through a code mapping |
| Teams | Four marketing teams (traffic, creative, performance, community) | Unknown | **Marketing HQ** | none |
| Branches | `branches` (`slug`, names, area, active flag) plus check-in settings: coordinates, geofence, office IP ranges, allowed methods, map | Probably a locations list | **ERP** for the list, names and active flag; **Marketing HQ** for check-in settings | ERP → Marketing HQ, through a code mapping |
| Leads and lead sources | None. Marketing HQ handles **marketing requests** from departments (cards with vertical, brand, format and platforms), not leads | Leads module with sources (to confirm) | **ERP** | ERP → Marketing HQ, **aggregated numbers only** |
| Campaigns and the MQL review | The monthly rhythm has an "MQL review" track with checkpoints on days 10, 20 and 30, and a fixed "MQL review" meeting. Each checkpoint has a status and a note. **No lead or MQL numbers are stored** (`TECHNICAL_GUIDE.md` 9.9). No campaign or spend table | Leads per source and campaign (to confirm) | **ERP** for the numbers | ERP → Marketing HQ |
| Marketing request status | Cards on the Content Pipeline with ten stages and a simple status for requesters (`TECHNICAL_GUIDE.md` 9.3) | Unknown; Sales and Business Development may want it beside their leads | **Marketing HQ** | Marketing HQ → ERP |
| Attendance | `attendance_sessions` with method, branch, times, lateness, recorded location. D-04: **not used for payroll** | Probably payroll | **Marketing HQ** for marketing attendance, only if D-04 changes | Marketing HQ → ERP |
| Leave | `requests` with approval chains, `leave_balances` per person, type and year, `holidays` | Possibly an HR leave module | **One** system must own leave; decide which (section 6) | either |
| Approvals | One engine for leave, special requests (equipment, purchase, training, overtime) and creative work. Finance approval of purchases happens outside Marketing HQ (`docs/SEED_DATA.md`) | Possibly purchase orders and finance approvals | Each system keeps its own approvals; outcomes can flow | Marketing HQ → ERP (for example, an approved purchase request) |
| Holidays | `holidays`, maintained by HR in Marketing HQ | Possibly a company calendar | **ERP** if it has one | ERP → Marketing HQ |

Leads also contain customer personal data. Marketing HQ should never store individual leads; it needs counts.

---

## 3. Integration patterns

Five patterns, from least to most change to Marketing HQ. Most real integrations combine (a) or (b) for data leaving Marketing HQ with (c) for data entering it.

### 3.1 Pattern (a): the ERP reads Marketing HQ data

**How it works.** The ERP reads a small, stable set of views. Two ways to reach them:

- **a1. Direct database connection** with a dedicated, read-only Postgres role.
- **a2. Through PostgREST** (the Supabase data API) with a token whose `role` claim is that same read-only role.

Either way the role gets **column grants** (only the columns it needs), **row policies** for itself (row-level security is on for every table) and **`security_invoker` views** in a separate `erp` schema that form the contract. This uses the same mechanisms as the rest of the database (`TECHNICAL_GUIDE.md` 6.2).

**Do not** give the ERP the `postgres` password or the Supabase service role key: both bypass every rule, including the privacy of location data.

**Worked example (proposed migration).**

```sql
-- Proposed: read access for the ERP. Not in the repository.
-- The role is created without login here; a DBA enables login and sets the
-- password outside the repository:  alter role erp_reader with login password '...';
create role erp_reader nologin noinherit;
alter role erp_reader set statement_timeout = '30s';

create schema erp;
revoke all on schema erp from public;
grant usage on schema erp to erp_reader;
grant usage on schema public to erp_reader;

-- Column grants: only what the ERP needs. Never coordinates, accuracy, distance,
-- notes, verify data, birthdays or phone numbers.
grant select (id, email, full_name, display_name, department_id, team_id, home_branch_id,
              title, status, joined_on, updated_at) on public.profiles to erp_reader;
grant select (id, slug, name_en, name_ar) on public.departments to erp_reader;
grant select (id, slug, name_en, name_ar, area, is_active) on public.branches to erp_reader;
grant select (id, key, name_en, name_ar, is_leave) on public.request_types to erp_reader;
grant select (id, type_id, requester_id, status, starts_on, ends_on, days, decided_at)
  on public.requests to erp_reader;
grant select (id, user_id, branch_id, method, checked_in_at, checked_out_at, is_late,
              auto_closed, confirmed_at) on public.attendance_sessions to erp_reader;
grant select (id, title, stage, request_kind, requesting_department_id, requester_id, due_at,
              delivered_at, published_at, returned_reason, revision_count, archived_at,
              created_at, updated_at) on public.cards to erp_reader;

-- Row policies for this role only (they do not change what app users see).
create policy erp_reader_select on public.profiles for select to erp_reader using (true);
create policy erp_reader_select on public.departments for select to erp_reader using (true);
create policy erp_reader_select on public.branches for select to erp_reader using (true);
create policy erp_reader_select on public.request_types for select to erp_reader using (true);
create policy erp_reader_select on public.requests for select to erp_reader
  using (status in ('approved', 'cancelled'));
create policy erp_reader_select on public.attendance_sessions for select to erp_reader using (true);
create policy erp_reader_select on public.cards for select to erp_reader
  using (stage is not null and requesting_department_id is not null);

-- The contract: views the ERP queries. security_invoker keeps the grants and policies in force.
create view erp.staff with (security_invoker = true) as
select p.id as mhq_user_id, p.email, p.full_name,
       coalesce(nullif(p.display_name, ''), p.full_name) as display_name,
       d.slug as department, b.slug as home_branch, p.title, p.status, p.joined_on, p.updated_at
from public.profiles p
left join public.departments d on d.id = p.department_id
left join public.branches b on b.id = p.home_branch_id;

create view erp.marketing_requests with (security_invoker = true) as
select c.id as card_id, c.title, c.request_kind, d.slug as requesting_department,
       c.stage,
       case
         when c.stage = 'request' and c.returned_reason is not null then 'returned'
         when c.stage in ('request', 'performance_input', 'intake', 'brief_schedule') then 'received'
         when c.stage in ('production', 'creative_review') then 'in_production'
         when c.stage = 'confirmation' then 'awaiting_approval'
         else 'delivered'
       end as portal_status,
       c.due_at, c.delivered_at, c.published_at, c.revision_count, c.archived_at, c.updated_at
from public.cards c
left join public.departments d on d.id = c.requesting_department_id;

grant select on erp.staff, erp.marketing_requests to erp_reader;
```

The `portal_status` expression is the SQL version of `portalStatus()` in `src/features/portal/status.ts`; keep them in step.

**a1, from Laravel.** Add a second connection in `config/database.php` (driver `pgsql`, `sslmode` `require`, the `erp_reader` credentials from the ERP's secret store), then:

```php
$changed = DB::connection('marketing_hq')
    ->table('erp.staff')
    ->where('updated_at', '>', $lastSync)
    ->orderBy('updated_at')
    ->get();
```

On Supabase's cloud service, connections usually go through its connection pooler, whose user name includes the project reference; copy the format from the project's connection settings. On a self-hosted stack, open port 5432 only to the ERP server's address (firewall and `pg_hba.conf`).

**a2, through PostgREST.** Let PostgREST switch to the role (`grant erp_reader to authenticator;`), add `erp` to the exposed schemas (`[api] schemas` locally, `PGRST_DB_SCHEMAS` self-hosted, API settings on the cloud), and give the ERP a long-lived JWT whose payload contains `"role": "erp_reader"`, signed with the stack's JWT secret. Self-hosted, you hold that secret. On the cloud service, check whether your project's signing keys let you issue such a token. Then:

```http
GET /rest/v1/staff?updated_at=gt.2026-11-01T00:00:00Z&order=updated_at HTTP/1.1
Host: <supabase api host>
apikey: <anon or publishable key>
Authorization: Bearer <erp_reader JWT>
Accept-Profile: erp
```

PostgREST returns at most 1,000 rows per request (`supabase/config.toml`, `[api] max_rows`); page with `limit`, `offset` or the `Range` header.

| Pros | Cons |
| --- | --- |
| No change to the Next.js app; one migration | The ERP polls; there is no push |
| The database enforces exactly what the ERP may see | The views become a contract: schema changes must keep them working |
| Full SQL power for reports and reconciliation | a1 exposes Postgres on the network; a2 needs a token you can mint and rotate |

**Security notes.** Least-privilege columns only; TLS required; restrict source addresses; a statement timeout and a connection limit on the role; rotate the password or token at least yearly and when people leave; run the Supabase advisors after the migration (an always-true policy for a dedicated read-only role is intended here, so record why); add access tests in `supabase/tests/` that sign in as `erp_reader` and prove it cannot read coordinates or write anything.

### 3.2 Pattern (b): Marketing HQ pushes events to the ERP

**How it works.** A trigger writes each event into an **outbox table** in the same transaction as the change, so an event is never lost and never sent for a change that rolled back. A dispatcher sends pending events to the ERP over HTTPS, signs them with HMAC-SHA256, records the result and retries with back-off. The ERP deduplicates by event id. This follows the existing `notifications` pattern: rows written by the database, delivered by a job, claimed so they are sent once (`TECHNICAL_GUIDE.md` 10).

Two dispatchers are possible:

- **b1. In the database:** `pg_cron` runs a function every minute that posts with `pg_net` and signs with `pgcrypto`'s `hmac`. No app code; works on any host.
- **b2. In the app:** `pg_cron` calls a new route `/api/cron/erp-outbox` through the existing `_cron_call_app` (its path rule `^/api/cron/[a-z-]+$` already allows it). Node.js signs and sends. Easier to log and test; depends on the app being up.

**Worked example (proposed, b1).**

```sql
-- Proposed outbox. No client access: row-level security on, no policies, grants revoked.
create table public.integration_outbox (
  id bigint generated always as identity primary key,
  event_id uuid not null default gen_random_uuid() unique,
  event_type text not null,
  subject_id uuid not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_request_id bigint,
  last_status int,
  delivered_at timestamptz
);
create index integration_outbox_due_idx on public.integration_outbox (next_attempt_at) where delivered_at is null;
alter table public.integration_outbox enable row level security;
revoke all on public.integration_outbox from anon, authenticated;

-- Event source: every stage change of a department request.
-- _set_card_stage updates the card before it writes the stage_change event,
-- so the card row already holds the new stage (and, for a return, the reason).
create function public._outbox_card_stage() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  c cards;
begin
  if new.kind <> 'stage_change' then return new; end if;
  select * into c from cards where id = new.card_id;
  if c.stage is null or c.requesting_department_id is null then return new; end if;
  insert into integration_outbox (event_type, subject_id, payload)
  values ('marketing_request.stage_changed', c.id, jsonb_build_object(
    'card_id', c.id,
    'title', c.title,
    'request_kind', c.request_kind,
    'requesting_department', (select slug from departments where id = c.requesting_department_id),
    'requester_email', (select email from profiles where id = c.requester_id),
    'previous_stage', new.from_stage,
    'stage', new.to_stage,
    'portal_status', case
       when c.stage = 'request' and c.returned_reason is not null then 'returned'
       when c.stage in ('request', 'performance_input', 'intake', 'brief_schedule') then 'received'
       when c.stage in ('production', 'creative_review') then 'in_production'
       when c.stage = 'confirmation' then 'awaiting_approval'
       else 'delivered' end,
    'returned_reason', c.returned_reason,
    'missing_items', to_jsonb(c.missing_items),
    'due_at', c.due_at,
    'delivered_at', c.delivered_at,
    'published_at', c.published_at,
    'revision_count', c.revision_count,
    'changed_at', new.created_at));
  return new;
end $$;
create trigger card_events_outbox after insert on public.card_events
  for each row execute function public._outbox_card_stage();

-- Dispatcher: run every minute by pg_cron. URL and secret live in Vault.
create function public._erp_outbox_dispatch() returns int
language plpgsql security definer set search_path = public as $$
declare
  url text := (select decrypted_secret from vault.decrypted_secrets where name = 'erp_webhook_url');
  key text := (select decrypted_secret from vault.decrypted_secrets where name = 'erp_webhook_secret');
  r integration_outbox;
  body jsonb;
  ts text;
  n int := 0;
begin
  if url is null or key is null then return 0; end if;

  -- 1. Record the outcome of earlier attempts (pg_net stores responses asynchronously).
  update integration_outbox o set
    last_status = coalesce(resp.status_code, 0),
    delivered_at = case when resp.status_code between 200 and 299 then now() end,
    next_attempt_at = case when resp.status_code between 200 and 299 then o.next_attempt_at
      else now() + make_interval(mins => least(power(2, o.attempts)::int, 360)) end
  from net._http_response resp
  where resp.id = o.last_request_id and o.delivered_at is null and o.last_status is null;

  -- 2. Send what is due. The 5-minute hold stops a resend before the response is recorded.
  for r in
    select * from integration_outbox
    where delivered_at is null and next_attempt_at <= now() and attempts < 20
    order by id limit 50
    for update skip locked
  loop
    body := jsonb_build_object('id', r.event_id, 'type', r.event_type,
                               'occurred_at', r.created_at, 'data', r.payload);
    ts := extract(epoch from now())::bigint::text;
    update integration_outbox set
      attempts = attempts + 1,
      last_status = null,
      next_attempt_at = now() + interval '5 minutes',
      last_request_id = net.http_post(
        url := url,
        body := body,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'X-MHQ-Event-Id', r.event_id::text,
          'X-MHQ-Timestamp', ts,
          'X-MHQ-Signature', 'sha256=' || encode(extensions.hmac(ts || '.' || body::text, key, 'sha256'), 'hex')),
        timeout_milliseconds := 10000)
    where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;

revoke execute on function public._outbox_card_stage(), public._erp_outbox_dispatch() from authenticated;
revoke execute on all functions in schema public from public, anon;

-- Schedule (run once per environment, like supabase/production-cron.sql):
--   select vault.create_secret('<erp webhook url>', 'erp_webhook_url');
--   select vault.create_secret('<shared secret>', 'erp_webhook_secret');
--   select cron.schedule('hq-erp-outbox', '* * * * *', $$select public._erp_outbox_dispatch()$$);
```

The signature covers `body::text`, the text form of the JSON. Test once that the bytes the ERP receives are exactly that text; if your `pg_net` version serialises differently, use dispatcher b2, which signs the exact string it sends.

**Receiving it in Laravel (sketch).** Put the route outside the CSRF-protected `web` group (for example in `routes/api.php`).

```php
public function __invoke(Request $request)
{
    $secret = config('services.marketing_hq.webhook_secret');
    $timestamp = (string) $request->header('X-MHQ-Timestamp');
    $signature = (string) $request->header('X-MHQ-Signature');
    $body = $request->getContent();

    if (! ctype_digit($timestamp) || abs(time() - (int) $timestamp) > 300) {
        abort(401);
    }
    $expected = 'sha256=' . hash_hmac('sha256', $timestamp . '.' . $body, $secret);
    if (! hash_equals($expected, $signature)) {
        abort(401);
    }

    $event = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
    // Idempotency: an event id is processed once; repeats are acknowledged.
    $fresh = DB::table('mhq_events')->insertOrIgnore([
        'id' => $event['id'],
        'type' => $event['type'],
        'received_at' => now(),
    ]);
    if ($fresh === 0) {
        return response()->noContent();
    }
    ProcessMarketingHqEvent::dispatch($event);   // queued job does the work
    return response()->noContent();
}
```

| Pros | Cons |
| --- | --- |
| Near real time (about a minute) | New tables, triggers and a job to operate |
| Never loses an event; survives ERP downtime with retries | Delivery is at least once: the ERP must deduplicate |
| The ERP needs no access to Marketing HQ | Ordering is per send batch; the ERP should compare `changed_at` and ignore older events |

**Security notes.** Separate secret per direction; rotate it (keep the old one valid for a day while both sides switch); HTTPS only; the payload carries only what the ERP needs (no coordinates, no comments); a Cloudflare rule that lets this path through only from Marketing HQ's outbound addresses (Supabase cloud, or your servers) or with a Cloudflare Access service token; prune delivered rows after 30 days.

### 3.3 Pattern (c): the ERP pushes into Marketing HQ

**How it works.** A new route handler in the app, for example `src/app/api/integrations/erp/staff/route.ts`, receives signed JSON from the ERP, validates it with Zod, records the idempotency key, and calls a new `security definer` function that applies the same rules as the existing admin functions.

Why new functions are needed: `admin_update_profile`, `admin_set_roles` and the other admin functions check that `auth.uid()` holds `super_admin`. A call with the service role has no `auth.uid()`, so they refuse it with `42501 not allowed`. Do not work around this by writing tables directly. Add `integration_*` functions, executable by the service role only (the `check_in` pattern), that repeat the rules and write an audit trail.

`src/proxy.ts` skips every `/api` path, so the route does its own authentication, exactly like `/api/cron/*`.

**Worked example (proposed route).**

```ts
// src/app/api/integrations/erp/staff/route.ts  (proposed, not in the repository)
import { createHmac } from "node:crypto";
import { z } from "zod";
import { safeEqual } from "@/lib/crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const code = z.string().trim().regex(/^[a-z0-9-]+$/).max(60);
const employee = z.object({
  erp_employee_id: z.string().trim().min(1).max(64),
  email: z.string().trim().toLowerCase().email().max(254),
  full_name: z.string().trim().min(1).max(120),
  display_name: z.string().trim().max(60).nullable().optional(),
  title: z.string().trim().max(120).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  department_code: code,
  team_code: code.nullable().optional(),
  home_branch_code: code.nullable().optional(),
  status: z.enum(["active", "inactive"]),
  joined_on: z.iso.date().nullable().optional(),
  updated_at: z.iso.datetime({ offset: true }),
});
const batchSchema = z.object({
  batch_id: z.string().min(8).max(120),
  mode: z.enum(["delta", "full"]),
  employees: z.array(employee).min(1).max(500),
});

function signed(raw: string, headers: Headers): boolean {
  const secret = process.env.ERP_INBOUND_SECRET;
  const ts = headers.get("x-erp-timestamp") ?? "";
  const sig = headers.get("x-erp-signature") ?? "";
  if (!secret || !/^\d{10}$/.test(ts) || Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(`${ts}.${raw}`).digest("hex");
  return safeEqual(sig, expected);
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 2_000_000 || !signed(raw, request.headers)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = batchSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "invalid", fields: parsed.error.issues.map((i) => i.path.join(".")) }, { status: 422 });
  }
  const admin = createAdminClient();
  // 1. Create auth users for new people (no password is handed out; see section 4.1).
  // 2. Apply every field and status change in one database call that enforces the rules.
  const { data, error } = await admin.rpc("integration_upsert_staff" as never, {
    p_batch_id: parsed.data.batch_id,
    p_payload: parsed.data,
  } as never);
  if (error) return Response.json({ error: "failed" }, { status: 500 });
  // 3. Ban and sign out people the batch deactivated; unban reactivated ones (as setActive does).
  return Response.json(data);
}
```

(`as never` stands in for the generated types until `pnpm db:types` is re-run after the migration.)

**Worked example (proposed function skeleton).**

```sql
-- Proposed. Idempotency for everything the ERP sends.
create table public.integration_inbox (
  key text primary key,
  source text not null,
  received_at timestamptz not null default now(),
  result jsonb
);
alter table public.integration_inbox enable row level security;
revoke all on public.integration_inbox from anon, authenticated;

create function public.integration_upsert_staff(p_batch_id text, p_payload jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  prior jsonb;
  e jsonb;
  pid uuid;
  result jsonb := '[]';
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  insert into integration_inbox (key, source) values (p_batch_id, 'erp:staff') on conflict (key) do nothing;
  if not found then
    select i.result into prior from integration_inbox i where i.key = p_batch_id;
    return coalesce(prior, '{"status":"in_progress"}');
  end if;

  for e in select * from jsonb_array_elements(p_payload -> 'employees') loop
    select id into pid from profiles
    where erp_employee_id = e ->> 'erp_employee_id' or lower(email) = e ->> 'email'
    limit 1;
    if pid is null then
      result := result || jsonb_build_object('erp_employee_id', e ->> 'erp_employee_id', 'outcome', 'no_account');
      continue;
    end if;
    -- Same fields and rules as admin_update_profile, resolved from codes.
    -- Unknown department, team or branch codes are reported, never guessed.
    update profiles set
      erp_employee_id = e ->> 'erp_employee_id',
      full_name = e ->> 'full_name',
      title = nullif(e ->> 'title', ''),
      phone = nullif(e ->> 'phone', ''),
      department_id = (select id from departments where erp_code = e ->> 'department_code'),
      team_id = (select id from teams where slug = e ->> 'team_code'),
      home_branch_id = (select id from branches where erp_code = e ->> 'home_branch_code'),
      joined_on = nullif(e ->> 'joined_on', '')::date,
      status = (e ->> 'status')::profile_status
    where id = pid;
    -- A person with no roles gets the baseline role; existing roles are never replaced.
    insert into user_roles (user_id, role)
    select pid, case when d.is_marketing then 'member'::app_role else 'requester'::app_role end
    from profiles p join departments d on d.id = p.department_id
    where p.id = pid and not exists (select 1 from user_roles where user_id = pid);
    insert into audit_log (actor_id, table_name, row_id, action, new_data)
    values (null, 'integration', pid::text, 'update', jsonb_build_object('source', 'erp', 'batch', p_batch_id));
    result := result || jsonb_build_object('erp_employee_id', e ->> 'erp_employee_id', 'outcome', 'updated', 'user_id', pid);
  end loop;

  update integration_inbox set result = jsonb_build_object('status', 'done', 'employees', result)
  where key = p_batch_id;
  return jsonb_build_object('status', 'done', 'employees', result);
end $$;

revoke execute on function public.integration_upsert_staff(text, jsonb) from authenticated;
grant execute on function public.integration_upsert_staff(text, jsonb) to service_role;
revoke execute on all functions in schema public from public, anon;
```

A production version must also: skip an employee whose `updated_at` is older than the last applied one, refuse unknown codes instead of setting nulls, leave `display_name` and `locale` to the person, never touch `must_change_password` or the person's own fields (`birth_*`, `celebrate`, `presence`), and return which accounts changed status so the route can ban or unban them.

**Sending from Laravel (sketch).**

```php
$body = json_encode($batch, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
$ts = (string) time();
$signature = 'sha256=' . hash_hmac('sha256', $ts . '.' . $body, config('services.marketing_hq.inbound_secret'));

Http::withHeaders([
        'X-ERP-Timestamp' => $ts,
        'X-ERP-Signature' => $signature,
        'Idempotency-Key' => $batch['batch_id'],
    ])
    ->withBody($body, 'application/json')
    ->timeout(15)
    ->retry(3, 2000)
    ->post(config('services.marketing_hq.url') . '/api/integrations/erp/staff');
```

| Pros | Cons |
| --- | --- |
| Changes arrive when they happen in the ERP | New code in Marketing HQ: route, functions, tests, a new secret |
| All rules stay in Marketing HQ's database | The ERP must retry on failure and keep its idempotency keys |
| Works whatever database the ERP uses | Needs an agreed contract and versioning |

**Security notes.** A new server-only variable (for example `ERP_INBOUND_SECRET`), compared in constant time; timestamps older than five minutes refused; body size capped; the endpoint never returns personal data beyond ids and outcomes; Zod first, then the database function as the second check; rate-limit the path at the reverse proxy; access tests that a signed-in user cannot call `integration_*` functions.

**Alternative for (c): signed JWT.** Instead of HMAC, the ERP can send a short-lived JWT signed with a private key (RS256 or ES256) whose public key Marketing HQ holds. It avoids a shared secret but adds key management. HMAC is simpler for two systems owned by one company.

### 3.4 Pattern (d): single sign-on and account provisioning

Today people sign in with an email and a password created by an admin (D-01, D-17). Single sign-on would let them use one company login.

**Options.**

| Option | How | Notes |
| --- | --- | --- |
| d1. SAML 2.0 to a company identity provider | Supabase Auth supports SAML SSO; on the cloud service it depends on the plan, self-hosted it is configured in the Auth service | Best if the company already has Microsoft Entra ID or Google Workspace; the ERP could use the same provider |
| d2. The ERP as an OpenID Connect provider | Laravel can issue OAuth 2.0 tokens (Passport); OpenID Connect needs an extra package. Supabase Auth would consume it through a supported provider or a broker such as Keycloak | Check which providers your Supabase Auth version accepts before choosing |
| d3. Marketing HQ's Supabase Auth as the provider for the ERP | Supabase CLI configuration has an `[auth.oauth_server]` section (disabled in `supabase/config.toml`); check that your Supabase version supports it | Only if the ERP should sign in with Marketing HQ accounts, which is unlikely |

**What has to change in Marketing HQ for any option.**

1. A sign-in button and a callback route that exchanges the code for a session. Today there is only `signIn` with a password (`src/features/auth/actions.ts`).
2. `handle_new_user()` creates every profile with `must_change_password = true`, and the route guard then sends the person to `/change-password`. SSO users have no password, so they would be stuck. The trigger, or the provisioning step, must set it to false for SSO accounts.
3. Public sign-up is disabled. Check whether your Supabase Auth version creates users on first SSO sign-in while sign-up is disabled. The safer path is to **provision accounts first** (roster sync, section 4.1) and let SSO only authenticate them.
4. Roles still come from Marketing HQ. A new SSO user with no roles sees "No access yet" until a role is set.
5. Deactivation must happen on both sides: disabling someone in the identity provider stops new sign-ins, and Marketing HQ must also mark the profile inactive and revoke sessions (`setActive` behaviour).

| Pros | Cons |
| --- | --- |
| One password; leavers lose access centrally | Code changes in auth, the most sensitive part of the app |
| No temporary passwords to hand over | Depends on an identity provider with high availability |

Recommendation: do roster sync (4.1) first; add SSO later if the company adopts a central identity provider.

### 3.5 Pattern (e): the existing HR CSV export

`GET /api/export/hr?from=YYYY-MM-DD&to=YYYY-MM-DD` (`src/app/api/export/hr/route.ts`) already exists.

- **Who:** a signed-in user with `hr` or `super_admin`, using the browser session cookie. It runs as that user, so row policies apply.
- **What:** one CSV with a byte-order mark and CRLF lines. `attendance` rows for sessions that started in the Cairo date range (up to 20,000) and `leave` rows for approved leave overlapping the range (up to 5,000).
- **Columns:** `type, name, email, date, check_in, check_out, hours, method, branch, place, checkin_location, accuracy_m, distance_m, checkout_location, late, auto_closed, leave_type, leave_from, leave_to, days`. Dates and times are Cairo local time; locations are `lat,lng` text with five decimals; cells that could be read as formulas are prefixed with `'`.
- **Limits for integration:** it authenticates with a browser session (an access token of about an hour, renewed with a refresh token), so a machine would have to sign in with an hr user's password, which it should never hold; there is no employee number column; it **includes coordinates**, which the ERP and payroll staff are not allowed to see (section 5).

Use it for a manual pilot of the payroll mapping (HR downloads, removes the location columns, hands over the file). For automation use pattern (a) or a token-protected variant of this route that leaves out coordinates.

---

## 4. Recommended first integrations

In priority order. Each needs the identifiers in 4.0.

### 4.0 Prerequisite: shared identifiers (proposed migration)

```sql
alter table public.profiles add column erp_employee_id text unique;
alter table public.departments add column erp_code text unique;
alter table public.branches add column erp_code text unique;
```

`erp_employee_id` must not be writable by users: the existing `profiles` update grant lists columns explicitly, so a new column is protected by default; set it only in the integration function and in `admin_update_profile` (add it to the super_admin keys). Show it read-only in `/admin/users`. Back-fill once by matching emails, and review mismatches by hand.

### 4.1 Staff roster sync (ERP → Marketing HQ)

**Why first.** People, departments and branches underpin everything: approvals, the portal, attendance, celebrations. Today accounts and departments are typed in by hand, and leavers stay active until someone deactivates them.

**Pattern.** (c) for pushes on change, plus a nightly `full` batch as a safety net. Pattern (a) lets the ERP check the result.

**Request** `POST /api/integrations/erp/staff`:

```json
{
  "batch_id": "erp-staff-2026-11-24T04:00:00Z-0001",
  "mode": "delta",
  "employees": [
    {
      "erp_employee_id": "EMP-000123",
      "email": "first.last@example.com",
      "full_name": "First Last",
      "display_name": null,
      "title": "Designer",
      "phone": "+20 100 000 0000",
      "department_code": "marketing",
      "team_code": "creative",
      "home_branch_code": "nozha",
      "status": "active",
      "joined_on": "2025-03-01",
      "updated_at": "2026-11-23T17:20:00+02:00"
    },
    {
      "erp_employee_id": "EMP-000456",
      "email": "leaver@example.com",
      "full_name": "Someone Leaving",
      "department_code": "sales",
      "status": "inactive",
      "updated_at": "2026-11-23T18:05:00+02:00"
    }
  ]
}
```

**Field mapping**, following `admin_update_profile` (`TECHNICAL_GUIDE.md` 7.2):

| ERP field | Marketing HQ column | Rule |
| --- | --- | --- |
| `erp_employee_id` | `profiles.erp_employee_id` (proposed) | Stable key; never reused |
| `email` | `auth.users.email` → `profiles.email` | Used to create the account and to match on first sync. Changing it changes the sign-in address: do it through the Auth admin API, never in `profiles` |
| `full_name`, `title`, `phone` | same names | super_admin-level fields in `admin_update_profile` |
| `display_name` | `display_name` | Optional; the person can change it, so send it only on creation |
| `department_code` | `department_id` via `departments.erp_code` | Unknown code: refuse that employee and report it |
| `team_code` | `team_id` via `teams.slug` | Marketing teams only; null outside marketing |
| `home_branch_code` | `home_branch_id` via `branches.erp_code` | |
| `status` | `status` | `inactive` also bans the auth user and revokes sessions; never delete a profile |
| `joined_on` | `joined_on` | Work anniversaries |
| `schedule` (optional) | `schedules.workdays`, `start_time`, `end_time` | Days 0 = Sunday … 6 = Saturday; times are Cairo wall-clock |
| (not sent) | `birth_month`, `birth_day`, `celebrate`, `locale`, `presence`, `avatar_seen` | The person's own fields |
| (not sent) | `must_change_password`, passwords | Never from the ERP |

**Roles.** `admin_set_roles` replaces the full set of roles. The ERP does not know Marketing HQ's access model (super_admin, traffic_manager, team_lead, final_approver, hr), so the integration **never replaces roles**. It only adds the baseline role to a person who has none: `member` in a marketing department, `requester` elsewhere. Super admins keep managing roles in `/admin/users`. If the company later wants the ERP to drive team leads or HR, agree a mapping and send the full role set, accepting `admin_set_roles` semantics.

**New people.** The route creates the auth user (`auth.admin.createUser`, confirmed email, a long random password nobody sees). The person then needs a way in: either a super admin uses **Reset password** in `/admin/users` and hands over the temporary password in person (today's process, D-17), or single sign-on (3.4). The ERP never receives or sends passwords.

**Response:**

```json
{
  "status": "done",
  "employees": [
    { "erp_employee_id": "EMP-000123", "outcome": "updated", "user_id": "6b1f...-uuid" },
    { "erp_employee_id": "EMP-000456", "outcome": "deactivated", "user_id": "93c0...-uuid" },
    { "erp_employee_id": "EMP-000789", "outcome": "rejected", "reason": "unknown_department_code" }
  ]
}
```

**Ordering and replays.** The same `batch_id` returns the stored result without applying it again. An employee whose `updated_at` is older than the last applied update is skipped. A `full` batch lists everyone; people missing from it are reported, not deactivated automatically, until both teams trust the feed.

### 4.2 Leads and MQL numbers for the monthly MQL review (ERP → Marketing HQ)

**Why.** The monthly rhythm reviews marketing-qualified leads on days 10, 20 and 30 (rolled back to a working day, D-25), but the numbers live in the ERP and are not in Marketing HQ.

**Proposed storage** (aggregates only, no individual leads):

```sql
create table public.lead_stats (
  id uuid primary key default gen_random_uuid(),
  period_from date not null,                 -- Cairo dates, inclusive
  period_to date not null,
  brand_id uuid references public.brands (id),
  branch_id uuid references public.branches (id),
  source text not null,                      -- agreed source code
  vertical text,                             -- one of settings.verticals
  leads int not null check (leads >= 0),
  mqls int not null check (mqls >= 0),
  sqls int check (sqls >= 0),
  won int check (won >= 0),
  erp_batch_id text not null,
  received_at timestamptz not null default now(),
  unique (period_from, period_to, brand_id, branch_id, source, vertical)
);
alter table public.lead_stats enable row level security;
revoke insert, update, delete on public.lead_stats from authenticated;
create policy lead_stats_select on public.lead_stats for select to authenticated
  using ((select public.is_marketing()));
-- Written only by a service-role function, integration_upsert_lead_stats(p_batch_id, p_payload).
```

The unique key on nullable columns needs `nulls not distinct` (as `user_roles` does) if branch or vertical can be empty.

**Request** `POST /api/integrations/erp/lead-stats`:

```json
{
  "batch_id": "erp-mql-2026-11-01_2026-11-10-v2",
  "period": { "from": "2026-11-01", "to": "2026-11-10" },
  "checkpoint": "day-10",
  "generated_at": "2026-11-10T08:00:00+02:00",
  "definitions_version": "2026-11",
  "rows": [
    { "brand": "espaces", "branch_code": "nozha", "source": "facebook_ads", "vertical": "Offices",
      "leads": 120, "mqls": 45, "sqls": 12, "won": 3 },
    { "brand": "cocafe", "branch_code": null, "source": "instagram_organic", "vertical": "Cocafe",
      "leads": 40, "mqls": 9, "sqls": null, "won": null }
  ]
}
```

A later batch for the same period replaces the earlier rows (upsert on the unique key), so the ERP can send month-to-date figures daily and final figures on review days.

**To agree first:** the definitions of lead, MQL, SQL and won; the source list and how it maps to Marketing HQ's platform labels (`settings.platforms`: facebook, instagram, linkedin, tiktok, snapchat, google_ads, website, print, internal); verticals (`settings.verticals`); brands (`espaces`, `cocafe`, `spaces-planner`); whether numbers are by lead creation date or qualification date.

**Display (proposed):** the figures on the MQL review checkpoints in `/gates` and on the fixed MQL review meeting, plus a reports tab. That is new UI with both languages and empty, loading and error states.

### 4.3 Marketing request status back to the ERP (Marketing HQ → ERP)

**Why.** Sales, Daily Reservation and Business Development submit marketing requests in the portal. If they work in the ERP all day, they can see the status there. Confirm this need with them first.

**Pattern.** (b) for events, with (a) `erp.marketing_requests` for reconciliation.

**Event:**

```json
{
  "id": "1d6f7a0e-2b7c-4f5e-9a39-0c1b9d7e3f21",
  "type": "marketing_request.stage_changed",
  "occurred_at": "2026-11-24T10:15:03.120Z",
  "data": {
    "card_id": "8a2c...-uuid",
    "title": "Ramadan offer reel for Nozha",
    "request_kind": "urgent",
    "requesting_department": "sales",
    "requester_email": "requester@example.com",
    "previous_stage": "production",
    "stage": "creative_review",
    "portal_status": "in_production",
    "returned_reason": null,
    "missing_items": [],
    "due_at": "2026-11-28T16:00:00Z",
    "delivered_at": null,
    "published_at": null,
    "revision_count": 1,
    "changed_at": "2026-11-24T10:15:03.120Z"
  }
}
```

`portal_status` values: `received`, `in_production`, `awaiting_approval`, `delivered`, `returned` (`TECHNICAL_GUIDE.md` 9.3). A link for people is `<app url>/<locale>/portal/requests/<card_id>`; access is still checked by Marketing HQ.

**Optional link back:** if a request relates to an ERP record (a campaign, a lead batch, a branch opening), add a proposed `cards.erp_ref text` set through the portal form, and include it in the event.

### 4.4 Attendance and leave export for payroll (Marketing HQ → ERP)

**Blocked by a decision.** D-04 says attendance is **not** used for payroll or deductions. Using it for payroll changes the purpose of the data. Adham, HR and, if needed, legal must change D-04 first, and the team must be told.

**If D-04 changes:**

- Use pattern (a) with views such as `erp.attendance_daily` and `erp.approved_leave`, or a token-protected export. Never the cookie-based export with coordinates.
- Send per Cairo day: first check-in, last check-out, hours, method, branch, `is_late`, `auto_closed`, and whether the session was corrected. No coordinates, accuracy, distance or notes.
- Leave: approved and cancelled requests with type key, dates and working days (`working_days`, so half-day holidays count 0.5).
- Corrections happen after the fact: a person confirms an automatic check-out the next day, hr edits a session, hr cancels an approved leave. Re-export the whole open period and replace by `session_id` and `request_id`, then lock the period in the ERP after the payroll cut-off.

```json
{
  "period": { "from": "2026-11-01", "to": "2026-11-30" },
  "timezone": "Africa/Cairo",
  "generated_at": "2026-12-01T07:00:00+02:00",
  "attendance": [
    {
      "session_id": "c3f0...-uuid",
      "erp_employee_id": "EMP-000123",
      "date": "2026-11-03",
      "check_in": "2026-11-03T10:07:00+02:00",
      "check_out": "2026-11-03T18:12:00+02:00",
      "hours": 8.08,
      "method": "gps",
      "branch_code": "nozha",
      "is_late": false,
      "auto_closed": false,
      "corrected": false
    }
  ],
  "leave": [
    {
      "request_id": "5e2a...-uuid",
      "erp_employee_id": "EMP-000123",
      "type": "annual_leave",
      "status": "approved",
      "starts_on": "2026-11-10",
      "ends_on": "2026-11-12",
      "working_days": 3,
      "decided_at": "2026-11-05T12:30:00+02:00"
    }
  ]
}
```

Leave can only have one owner. If the ERP already runs leave and balances, either Marketing HQ sends approved leave to it (and stops managing balances) or the ERP sends balances to Marketing HQ. Do not let both systems approve the same leave.

---

## 5. Rules the integration must respect

1. **Never write tables around the `security definer` functions.** Stage moves, approvals, requests, attendance, leave usage, roles and post status go through functions that hold the rules (`TECHNICAL_GUIDE.md` 6.14). If no function fits, add a new `integration_*` function with the same checks, executable by the service role only.
2. **Keep the service role on the server.** It stays in `src/lib/supabase/admin.ts` and server-only code. The ERP never receives it. The ERP gets a narrow database role (3.1) or a signed endpoint (3.3).
3. **Use Cairo time.** Business dates (`date`, `starts_on`, `period_from`) are Cairo calendar dates (`YYYY-MM-DD`). Instants are ISO 8601 with an offset. The week is Saturday to Thursday; Friday is off; holidays come from `holidays`; deadlines on a day off roll back to the working day before (D-25). Do not hardcode an offset: Egypt observes summer time.
4. **Make every message idempotent.** Inbound batches carry a key stored in `integration_inbox`; outbound events carry an `id` the ERP stores. Replays must be harmless. Compare `updated_at` or `changed_at` and ignore older data.
5. **Keep an audit trail.** Changes made with the service role are recorded by the existing triggers with no actor. Integration functions also write an `audit_log` row with the source and batch id, and keep inbox and outbox rows for at least 30 days. The ERP logs what it sent and received, without personal data in plain logs.
6. **Protect location data.** Check-in and check-out coordinates, accuracy and distance may be seen only by the person, their team lead, hr, super_admin and leadership (`TECHNICAL_GUIDE.md` 9.7). No ERP view, event or export includes them. Work-from-home locations are recorded too (D-23) and follow the same rule.
7. **Minimise personal data.** Marketing HQ stores lead counts, never leads. The ERP receives requester emails only where it needs them. Birthdays (month and day only) never leave Marketing HQ.
8. **Separate secrets per direction and per environment.** Store them in a secret store and in Vault, never in the repository. Rotate them with an overlap period.
9. **Respect the decisions.** D-04 (no payroll use), D-20 (access tiers), D-23 (home location) and D-01 (admin-created accounts) stay in force until Adham changes them in `docs/DECISIONS.md`. Integration choices become new decisions there.
10. **Test like the rest of the app.** Access tests for every new table and role, both languages for any new screen, the full check list, and the Supabase advisors after each migration.

---

## 6. Questions for the ERP team

**Platform and hosting**

- [ ] Is the ERP built on Laravel? Which version? Is the admin area Filament?
- [ ] Which database engine and version? Where is it hosted (company servers, a cloud, the vendor)?
- [ ] Is `espaces.atwdemo.com` production, staging or a vendor demo? What are the production and staging addresses?
- [ ] Who maintains the ERP (in house or a vendor)? Who approves changes and deploys them?
- [ ] What is the ERP's time zone setting, and are stored timestamps UTC or local?

**API and connectivity**

- [ ] Does the ERP have an API today? REST or GraphQL, and with what authentication (Sanctum tokens, Passport OAuth, API keys)?
- [ ] Can it receive webhooks? Does it have queues (for example Horizon) and a scheduler for retries?
- [ ] What Cloudflare protections are on (bot fight mode, WAF rules, rate limits)? Can we add a rule for integration paths, with an IP allowlist or a Cloudflare Access service token?
- [ ] What outbound addresses does the ERP use, so Marketing HQ can allowlist them?
- [ ] Is direct database access possible in either direction, and is it allowed by policy?

**People and organisation**

- [ ] Is there an employee master with a stable employee number that is never reused?
- [ ] Are work email addresses unique and always present? Do they match the `name@` addresses used in Marketing HQ (D-19)?
- [ ] What is the department list and its codes? Is there a "management" department (Marketing HQ has one)?
- [ ] What is the branch list and its codes? Are coordinates stored?
- [ ] How are joiners, leavers and transfers recorded, and how fast?
- [ ] Is there a manager or team-lead relationship we could use for approval chains later?
- [ ] Does the company have, or plan, a central login (Microsoft Entra ID, Google Workspace, Keycloak)? Can the ERP act as an OpenID Connect provider?

**Leads and the MQL review**

- [ ] What does the leads module store: fields, statuses, sources, campaigns, brand, branch, vertical?
- [ ] How are lead, MQL, SQL and won defined, and who owns those definitions?
- [ ] What is the source list, and can it map to Marketing HQ's platform labels?
- [ ] Should figures count by lead creation date or qualification date?
- [ ] Are there privacy or consent rules on lead data we must follow?

**Leave, attendance and payroll**

- [ ] Does the ERP manage leave and balances today? If so, which system should own them?
- [ ] Is payroll in the ERP? Would it use attendance (this needs D-04 to change)? What is the payroll cut-off and how are late corrections handled?
- [ ] Which holiday calendar is official?

**Approvals and finance**

- [ ] Does the ERP have purchase or equipment approvals that Marketing HQ's "purchase" and "equipment" requests should feed?

**Operations**

- [ ] Which environments can we test against, and with what test data?
- [ ] Who is on call for the ERP, and how do we report integration failures?
- [ ] Data retention rules for integration logs and payloads?

---

## 7. Step-by-step plan

Each step follows `CLAUDE.md`: a short written plan for anything touching more than three files, a migration with row-level security and access tests, both languages for screens, `pnpm typecheck && pnpm lint && pnpm test && pnpm build`, the Supabase advisors, and a commit per task. New decisions go into `docs/DECISIONS.md` with the next free ids.

| Step | What | Acceptance check |
| --- | --- | --- |
| 0. Discovery | Answer section 6. Get access to an ERP staging environment and a Marketing HQ staging stack (cloud or self-hosted). Record decisions: system of record for people, leave owner, MQL definitions, payroll use (D-04), SSO yes or no | Decisions written down; both teams agree the contracts in section 4 |
| 1. Identifiers | Migration for `erp_employee_id`, `departments.erp_code`, `branches.erp_code`; admin screens show and edit the codes; back-fill by email | Every active person, department and branch has a code or a reviewed exception; a user cannot set their own `erp_employee_id` (access test) |
| 2. Read access (a) | `erp_reader` role, column grants, policies, `erp` views (`staff`, `marketing_requests`); connection from the ERP | The ERP reads the views; tests prove `erp_reader` cannot read coordinates or write anything |
| 3. Roster sync (c) | `integration_inbox`, `integration_upsert_staff`, the route and its secret, ban and unban on status change; a dry-run mode that reports without changing anything | A dry run on staging matches expectations; a replayed batch changes nothing; a leaver is signed out within minutes; signed-in users cannot call the function |
| 4. Request status (b) | Outbox, trigger, dispatcher, Vault secrets, the ERP receiver | Every stage change arrives once after deduplication; ERP downtime of an hour causes delay, not loss |
| 5. MQL numbers (c) | `lead_stats`, its function and route, display on the MQL review checkpoints | Figures for a test period match the ERP's own report |
| 6. Payroll (only if D-04 changes) | Views or a token-protected export without coordinates; period re-export and locking | One month reconciled by HR against the ERP; corrections after the cut-off handled as agreed |
| 7. Single sign-on (optional) | Identity provider setup, sign-in button and callback, `must_change_password` handling for SSO accounts | Provisioned users sign in with the company login; a disabled user cannot sign in |
| 8. Operate | Monitoring of inbox and outbox (pending counts, failures), secret rotation calendar, runbook | Alerts fire on a stuck outbox; the runbook has been used once in a drill |

---

## 8. Appendix: the signature scheme

Used in both directions, with a different secret for each.

| Item | Marketing HQ → ERP | ERP → Marketing HQ |
| --- | --- | --- |
| Timestamp header | `X-MHQ-Timestamp` (Unix seconds) | `X-ERP-Timestamp` |
| Signature header | `X-MHQ-Signature: sha256=<hex>` | `X-ERP-Signature: sha256=<hex>` |
| Id header | `X-MHQ-Event-Id` (also `id` in the body) | `Idempotency-Key` (also `batch_id` in the body) |
| Signed string | `<timestamp>.<raw request body>` | same |
| Algorithm | HMAC-SHA256 with the shared secret, hex encoded | same |

The receiver must:

1. Read the raw body before parsing it.
2. Refuse a timestamp more than 300 seconds from its own clock.
3. Compute the signature and compare in constant time (`hash_equals` in PHP, `safeEqual` in `src/lib/crypto.ts`).
4. Refuse bodies over the agreed size.
5. Store the id and acknowledge repeats without processing them again.
6. Answer quickly (2xx) and do the work in a queue; non-2xx answers are retried with back-off.
