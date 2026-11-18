import { createTranslator } from "next-intl";
import { safeNext } from "@/lib/actions";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";

export type PushSource = {
  id: string;
  kind: string;
  link: string | null;
  data: Record<string, unknown>;
};

export type PushMessage = {
  title: string;
  body: string;
  link: string;
  tag: string;
  lang: "en" | "ar";
  dir: "ltr" | "rtl";
};

/** Push services reject large payloads; a notification only needs the first lines. */
const MAX_BODY = 240;

function notificationText(n: PushSource, locale: "en" | "ar", actor: string | null): string {
  const t = createTranslator({ locale, messages: locale === "ar" ? ar : en, namespace: "notifications" });
  const d = n.data ?? {};
  const title = String((locale === "ar" ? d.title_ar : null) ?? d.title ?? "");
  switch (n.kind) {
    case "approval_waiting":
      return d.title ? t("approval_waiting_card", { title }) : t("approval_waiting");
    case "request_decided":
      return t("request_decided", {
        type: String((locale === "ar" ? d.type_ar : d.type_en) ?? d.type ?? ""),
        status: String(d.status ?? "other"),
      });
    case "card_returned":
      return t("card_returned", { title, reason: String(d.reason ?? "") });
    case "strategic_submitted":
      return t("strategic_submitted", { count: Number(d.count ?? 0) });
    case "assigned":
      return actor ? t("assigned", { title, actor }) : t("assignedNoActor", { title });
    case "post_decided":
      return t("post_decided", { approved: String(d.approved ?? false) });
    default:
      return t.has(n.kind as never) ? t(n.kind as never, { title } as never) : t("fallback");
  }
}

/** What the phone shows for a notification, in the recipient's language. */
export function renderPush(n: PushSource, locale: "en" | "ar", actor: string | null = null): PushMessage {
  const messages = locale === "ar" ? ar : en;
  let body: string;
  try {
    body = notificationText(n, locale, actor);
  } catch {
    body = messages.notifications.fallback;
  }
  const path = safeNext(n.link) ?? "/";
  return {
    title: messages.common.appName,
    body: body.length > MAX_BODY ? `${body.slice(0, MAX_BODY - 1)}…` : body,
    link: path === "/" ? `/${locale}` : `/${locale}${path}`,
    tag: n.id,
    lang: locale,
    dir: locale === "ar" ? "rtl" : "ltr",
  };
}
