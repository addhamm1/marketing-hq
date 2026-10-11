import { createTranslator } from "next-intl";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";

export type EmailKind = "approval_waiting" | "request_decided" | "card_returned";
export const EMAIL_KINDS: EmailKind[] = ["approval_waiting", "request_decided", "card_returned"];

type Input = {
  kind: EmailKind;
  locale: "en" | "ar";
  name: string;
  link: string;
  data: Record<string, unknown>;
  appUrl: string;
};

function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Subject and HTML for a notification email, in the recipient's language. */
export function renderEmail({ kind, locale, name, link, data, appUrl }: Input) {
  const t = createTranslator({ locale, messages: locale === "ar" ? ar : en, namespace: "email" });
  const status = String(data.status ?? "");
  const statusLabel = createTranslator({ locale, messages: locale === "ar" ? ar : en, namespace: "requestStatus" });
  const statusText = ["pending", "approved", "rejected", "cancelled"].includes(status)
    ? statusLabel(status as "approved").toLowerCase()
    : status;
  const type = String((locale === "ar" ? data.type_ar : data.type_en) ?? data.type ?? "");

  let subject: string;
  let body: string;
  if (kind === "approval_waiting") {
    subject = t("approvalWaitingSubject");
    body = t("approvalWaitingBody");
  } else if (kind === "request_decided") {
    subject = t("requestDecidedSubject", { status: statusText });
    body = t("requestDecidedBody", { status: statusText, type });
  } else {
    subject = t("cardReturnedSubject");
    body = t("cardReturnedBody", { title: String(data.title ?? ""), reason: String(data.reason ?? "") });
  }
  const url = `${appUrl}/${locale}${link.startsWith("/") ? link : "/"}`;
  const dir = locale === "ar" ? "rtl" : "ltr";
  const html = `<!doctype html><html lang="${locale}" dir="${dir}"><body style="margin:0;background:#f5f7f8;font-family:Inter,'IBM Plex Sans Arabic',Arial,sans-serif;color:#1f2a33">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
  <table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:12px;border:1px solid #e3e8eb" cellpadding="0" cellspacing="0">
  <tr><td style="padding:24px 28px 8px;font-weight:600;font-size:15px;color:#1f3b45">Pixel HQ</td></tr>
  <tr><td style="padding:8px 28px;font-size:15px;line-height:1.6">
    <p style="margin:0 0 12px">${escape(t("greeting", { name }))}</p>
    <p style="margin:0 0 20px">${escape(body)}</p>
    <a href="${escape(url)}" style="display:inline-block;background:#1f4f5a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">${escape(t("open"))}</a>
  </td></tr>
  <tr><td style="padding:20px 28px 24px;font-size:12px;color:#6b7a85">${escape(t("footer"))}</td></tr>
  </table></td></tr></table></body></html>`;
  return { subject, html, text: `${t("greeting", { name })}\n\n${body}\n\n${url}` };
}
