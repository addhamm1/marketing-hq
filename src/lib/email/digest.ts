import "server-only";
import { Resend } from "resend";
import { getMyDay } from "@/features/my-day/queries";
import { agendaCount, celebrationsOn } from "@/features/my-day/summary";
import { cairoDateString } from "@/lib/dates";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { digestDue, parseDigestHour, renderDigest } from "./digest-content";

type AppRole = Database["public"]["Enums"]["app_role"];

/** The same roles as the is_staff() database function: employees, not freelance guests. */
const STAFF_ROLES: AppRole[] = ["super_admin", "leadership", "team_lead", "traffic_manager", "member", "requester", "final_approver", "hr"];
/** Keeps a run under Resend's default limit of two requests a second. */
const SEND_SPACING_MS = 600;

export type DigestRun = { due: boolean; sent: number; skipped: number; repeated: number; failed: number };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sends the morning email once per person and working day. Each person's key is
 * claimed before anything is sent, so overlapping or repeated runs never send
 * twice; a send that fails is counted and not retried.
 */
export async function runDailyDigest(now: Date = new Date()): Promise<DigestRun> {
  const run: DigestRun = { due: false, sent: 0, skipped: 0, repeated: 0, failed: 0 };
  const admin = createAdminClient();
  const date = cairoDateString(now);

  const [setting, holiday] = await Promise.all([
    admin.from("settings").select("value").eq("key", "digest_hour").maybeSingle(),
    admin.from("holidays").select("is_half_day").eq("day", date).maybeSingle(),
  ]);
  if (setting.error || holiday.error) throw new Error("digest_config_unavailable");
  const holidays = new Set(holiday.data && !holiday.data.is_half_day ? [date] : []);
  if (!digestDue(now, parseDigestHour(setting.data?.value), holidays)) return run;
  run.due = true;

  const [people, roles, optedOut] = await Promise.all([
    admin
      .from("profiles")
      .select("id, email, full_name, display_name, locale, birth_month, birth_day, joined_on, celebrate")
      .eq("status", "active"),
    admin.from("user_roles").select("user_id").in("role", STAFF_ROLES),
    admin.from("notification_preferences").select("user_id").eq("digest_email", false),
  ]);
  if (people.error || roles.error || optedOut.error) throw new Error("digest_recipients_unavailable");

  const staff = new Set(roles.data.map((r) => r.user_id));
  const off = new Set(optedOut.data.map((p) => p.user_id));
  const celebrations = celebrationsOn(people.data.filter((p) => staff.has(p.id)), date);
  const key = process.env.RESEND_API_KEY;
  const resend = key ? new Resend(key) : null;
  const from = process.env.EMAIL_FROM ?? "Marketing HQ <marketinghq@e-spaces.co>";

  for (const person of people.data) {
    if (!staff.has(person.id) || off.has(person.id) || !person.email) continue;

    const claim = await admin.rpc("claim_once", { p_key: `digest:${person.id}:${date}` });
    if (claim.error) {
      run.failed++;
      continue;
    }
    if (!claim.data) {
      run.repeated++;
      continue;
    }

    const day = await getMyDay(admin, person.id, date, { now, celebrations });
    const items = agendaCount(day);
    if (items === 0) {
      run.skipped++;
      continue;
    }

    const locale = person.locale === "ar" ? "ar" : "en";
    const email = renderDigest({
      day,
      locale,
      name: (person.display_name || person.full_name).trim().split(/\s+/)[0],
      userId: person.id,
      now,
      appUrl: env.appUrl,
    });
    if (!resend) {
      console.info(`[digest preview] locale=${locale} items=${items}`);
      run.sent++;
      continue;
    }
    const { error } = await resend.emails.send({ from, to: person.email, subject: email.subject, html: email.html, text: email.text });
    if (error) {
      console.error(`[digest] send failed: ${error.name}`);
      run.failed++;
    } else {
      run.sent++;
    }
    await sleep(SEND_SPACING_MS);
  }
  return run;
}
