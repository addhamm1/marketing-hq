import { createTranslator } from "next-intl";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";
import { formatLongDay, formatTimeRange } from "./time";

type Input = {
  locale: "en" | "ar";
  guestName: string;
  organizerName: string;
  title: string;
  startsAt: string;
  endsAt: string;
  place: string;
  onlineUrl: string | null;
  agenda: string;
  isUpdate: boolean;
  isCancelled?: boolean;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Subject and body of the invitation sent to someone outside the company. */
export function renderGuestInvite(input: Input) {
  const { locale, guestName, organizerName, title, startsAt, endsAt, place, onlineUrl, agenda, isUpdate, isCancelled = false } = input;
  const t = createTranslator({ locale, messages: locale === "ar" ? ar : en, namespace: "meetings.email" });
  const when = `${formatLongDay(startsAt, locale)}, ${formatTimeRange(startsAt, endsAt)} (${t("cairoTime")})`;
  const subject = isCancelled ? t("cancelledSubject", { title }) : isUpdate ? t("updatedSubject", { title }) : t("inviteSubject", { title });
  const intro = isCancelled
    ? t("cancelledBody", { name: organizerName, title })
    : isUpdate
      ? t("updatedBody", { name: organizerName, title })
      : t("inviteBody", { name: organizerName, title });
  const closing = isCancelled ? t("cancelledAttached") : t("attached");

  const rows: [string, string][] = [[t("when"), when]];
  if (place) rows.push([t("where"), place]);
  if (onlineUrl && !isCancelled) rows.push([t("online"), onlineUrl]);
  if (agenda && !isCancelled) rows.push([t("agenda"), agenda]);

  const dir = locale === "ar" ? "rtl" : "ltr";
  const rowHtml = rows
    .map(([label, value]) => `<p style="margin:0 0 12px"><strong>${escapeHtml(label)}</strong><br><span style="white-space:pre-wrap">${escapeHtml(value)}</span></p>`)
    .join("");
  const html = `<!doctype html><html lang="${locale}" dir="${dir}"><body style="margin:0;background:#f5f7f8;font-family:Inter,'IBM Plex Sans Arabic',Arial,sans-serif;color:#1f2a33">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
  <table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:12px;border:1px solid #e3e8eb" cellpadding="0" cellspacing="0">
  <tr><td style="padding:24px 28px 8px;font-weight:600;font-size:15px;color:#1f3b45">Espaces</td></tr>
  <tr><td style="padding:8px 28px;font-size:15px;line-height:1.6">
    <p style="margin:0 0 12px">${escapeHtml(t("greeting", { name: guestName }))}</p>
    <p style="margin:0 0 20px">${escapeHtml(intro)}</p>
    ${rowHtml}
    <p style="margin:8px 0 0">${escapeHtml(closing)}</p>
  </td></tr>
  <tr><td style="padding:20px 28px 24px;font-size:12px;color:#6b7a85">${escapeHtml(t("footer"))}</td></tr>
  </table></td></tr></table></body></html>`;

  const text = [t("greeting", { name: guestName }), intro, ...rows.map(([label, value]) => `${label}: ${value}`), closing].join("\n\n");
  return { subject, html, text };
}
