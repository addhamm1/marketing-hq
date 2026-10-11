"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePersonName } from "@/components/people-context";

export type NotificationRow = {
  id: string;
  kind: string;
  link: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

/** Notification text is rendered from kind + data in the reader's language. */
export function useNotificationText() {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const name = usePersonName();
  return (n: NotificationRow) => {
    const d = n.data ?? {};
    const title = String(d.title ?? "");
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
      case "mentioned":
        return t("mentioned", { title });
      case "assigned":
        return d.by ? t("assigned", { title, actor: name(String(d.by)) }) : t("assignedNoActor", { title });
      case "post_decided":
        return t("post_decided", { approved: String(d.approved ?? false) });
      default:
        return t.has(n.kind as never) ? t(n.kind as never, { title } as never) : t("fallback");
    }
  };
}
