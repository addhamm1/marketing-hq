import { createTranslator } from "next-intl";
import { clock, lateSince, longDate, pick, shortDay } from "@/features/my-day/format";
import { gateDue } from "@/features/my-day/summary";
import type { MyDay } from "@/features/my-day/types";
import { cairoDateString, cairoHour, isWorkingDay } from "@/lib/dates";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";

export const DEFAULT_DIGEST_HOUR = 8;
/** Each section of the email stays short; the page holds the rest. */
const MAX_LINES = 5;

/** The `digest_hour` setting as a Cairo hour, or the default when it is unusable. */
export function parseDigestHour(value: unknown): number {
  const usable = typeof value === "number" || (typeof value === "string" && value.trim() !== "");
  const hour = usable ? Number(value) : NaN;
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : DEFAULT_DIGEST_HOUR;
}

/**
 * Vercel Cron runs in UTC and calls the route every hour of the morning window.
 * Comparing Cairo's wall clock means summer time needs no change here.
 */
export function digestDue(now: Date, digestHour: number, holidays: ReadonlySet<string> = new Set()): boolean {
  return cairoHour(now) === digestHour && isWorkingDay(cairoDateString(now), holidays);
}

type Line = { main: string; detail?: string };
type Block = { title: string; lines: Line[]; more: number };

function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function buildBlocks(day: MyDay, locale: "en" | "ar", now: Date, userId: string): Block[] {
  const messages = locale === "ar" ? ar : en;
  const t = createTranslator({ locale, messages, namespace: "myDay" });
  const parts = (...values: (string | null | undefined)[]) => values.filter(Boolean).join(" · ");

  const sections: [string, Line[]][] = [
    [
      t("sections.meetings"),
      day.meetings.items.map((m) => ({
        main: `${clock(m.startsAt)}  ${pick(m.title, locale)}`,
        detail: parts(
          m.room ? pick(m.room, locale) : m.online ? t("meeting.online") : null,
          m.response === "pending" ? t("meeting.awaiting") : null,
        ),
      })),
    ],
    [
      t("sections.cards"),
      day.cards.items.map((c) => ({
        main: c.title,
        detail: c.overdue ? t("card.overdue", { when: lateSince(c.dueAt, now, locale) }) : t("card.due", { time: clock(c.dueAt) }),
      })),
    ],
    [
      t("sections.approvals"),
      day.approvals.items.map((a) => ({
        main: pick(a.title, locale),
        detail: t(a.kind === "card" ? "approval.card" : "approval.request"),
      })),
    ],
    [
      t("sections.gates"),
      day.gates.items.map((g) => {
        const due = gateDue(g);
        return { main: pick(g.name, locale), detail: t(`gate.${due.key}`, { days: due.days }) };
      }),
    ],
    [
      t("sections.shoots"),
      day.shoots.items.map((s) => ({
        main: s.title,
        detail: parts(t(`shoot.${s.when}`, { time: s.callTime }), s.place ? pick(s.place, locale) : null),
      })),
    ],
    [
      t("sections.actions"),
      day.actions.items.map((a) => ({
        main: a.title,
        detail: a.dueOn ? t(a.overdue ? "action.overdue" : "action.due", { date: shortDay(a.dueOn, locale) }) : undefined,
      })),
    ],
    [
      t("sections.celebrations"),
      day.celebrations.items
        .filter((c) => c.userId !== userId)
        .map((c) => ({
          main:
            c.kind === "birthday"
              ? t("celebration.birthday", { name: c.name })
              : t("celebration.anniversary", { name: c.name, years: c.years ?? 1 }),
        })),
    ],
  ];

  return sections
    .filter(([, lines]) => lines.length > 0)
    .map(([title, lines]) => ({ title, lines: lines.slice(0, MAX_LINES), more: Math.max(0, lines.length - MAX_LINES) }));
}

type Input = { day: MyDay; locale: "en" | "ar"; name: string; userId: string; now: Date; appUrl: string };

/** Subject, HTML and plain text of one person's morning email, in their language. */
export function renderDigest({ day, locale, name, userId, now, appUrl }: Input) {
  const messages = locale === "ar" ? ar : en;
  const t = createTranslator({ locale, messages, namespace: "digest" });
  const blocks = buildBlocks(day, locale, now, userId);
  const date = longDate(now, locale);
  const dir = locale === "ar" ? "rtl" : "ltr";
  const homeUrl = `${appUrl}/${locale}`;
  const settingsUrl = `${appUrl}/${locale}/me/account`;
  const align = locale === "ar" ? "right" : "left";

  const blockHtml = blocks
    .map(
      (b) => `<tr><td style="padding:14px 28px 0">
    <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#6b7a85">${escape(b.title)}</p>
    ${b.lines
      .map(
        (l) => `<p style="margin:0 0 8px;font-size:14px;line-height:1.45;color:#1f2a33">${escape(l.main)}${
          l.detail ? `<br><span style="font-size:12px;color:#6b7a85">${escape(l.detail)}</span>` : ""
        }</p>`,
      )
      .join("")}
    ${b.more ? `<p style="margin:0 0 8px;font-size:12px;color:#6b7a85">${escape(t("more", { count: b.more }))}</p>` : ""}
  </td></tr>`,
    )
    .join("");

  const html = `<!doctype html><html lang="${locale}" dir="${dir}"><body style="margin:0;background:#f5f7f8;font-family:Inter,'IBM Plex Sans Arabic',Arial,sans-serif;color:#1f2a33">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
  <table role="presentation" dir="${dir}" width="100%" style="max-width:520px;background:#fff;border-radius:12px;border:1px solid #e3e8eb;text-align:${align}" cellpadding="0" cellspacing="0">
  <tr><td style="padding:24px 28px 0;font-size:12px;color:#6b7a85">${escape(date)}</td></tr>
  <tr><td style="padding:4px 28px 4px;font-size:20px;font-weight:700;color:#1f3b45">${escape(t("greeting", { name }))}</td></tr>
  <tr><td style="padding:0 28px;font-size:14px;line-height:1.5;color:#44525c">${escape(t("intro"))}</td></tr>
  ${blockHtml}
  <tr><td style="padding:18px 28px 4px"><a href="${escape(homeUrl)}" style="display:inline-block;background:#1f4f5a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;font-size:14px">${escape(t("cta"))}</a></td></tr>
  <tr><td style="padding:16px 28px 24px;font-size:12px;line-height:1.5;color:#6b7a85">${escape(t("footer"))} <a href="${escape(settingsUrl)}" style="color:#1f4f5a">${escape(t("manage"))}</a></td></tr>
  </table></td></tr></table></body></html>`;

  const textBlocks = blocks
    .map((b) => {
      const lines = b.lines.map((l) => `- ${l.main}${l.detail ? ` (${l.detail})` : ""}`);
      if (b.more) lines.push(t("more", { count: b.more }));
      return `${b.title}\n${lines.join("\n")}`;
    })
    .join("\n\n");
  const text = `${t("greeting", { name })}\n${date}\n\n${t("intro")}\n\n${textBlocks}\n\n${homeUrl}\n\n${t("footer")} ${settingsUrl}`;

  return { subject: t("subject", { date }), html, text };
}
