"use client";

import { useTranslations } from "next-intl";
import { usePersonName } from "@/components/people-context";
import { formatCairo } from "@/lib/dates";
import type { Stage } from "../types";
import type { CardDetail } from "./detail-query";

export function ActivityFeed({ events }: { events: CardDetail["events"] }) {
  const t = useTranslations("card");
  const ts = useTranslations("stages");
  const tr = useTranslations("assigneeRole");
  const trr = useTranslations("revisionReason");
  const name = usePersonName();

  function describe(e: CardDetail["events"][number]) {
    const d = (e.data ?? {}) as Record<string, unknown>;
    switch (e.kind) {
      case "stage_change":
        return t("event.stage_change", { from: e.from_stage ? ts(e.from_stage as Stage) : "—", to: e.to_stage ? ts(e.to_stage as Stage) : "—" });
      case "assign":
      case "unassign":
        return t(`event.${e.kind}`, { name: name(d.user_id as string), role: tr(d.role as never) });
      case "revision":
        return t("event.revision", { reason: d.reason ? trr(d.reason as never) : "" });
      case "returned":
        return t("event.returned", { reason: String(d.reason ?? "") });
      case "update": {
        const fields = ((d.fields as string[]) ?? []).map((f) => (t.has(`fields.${f}` as never) ? t(`fields.${f}` as never) : f));
        return t("event.update", { fields: fields.join(", ") });
      }
      case "approval":
        return t("event.approval", { decision: String(d.decision ?? "other") });
      case "attachment":
        return t("event.attachment", { name: String(d.name ?? "") });
      default:
        return t.has(`event.${e.kind}` as never) ? t(`event.${e.kind}` as never) : e.kind;
    }
  }

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">{t("activity")}</h3>
      {events.length === 0 ? <p className="text-muted-foreground text-xs">{t("noActivity")}</p> : null}
      <ol className="space-y-2.5 border-s ps-3">
        {events.map((e) => (
          <li key={e.id} className="text-xs leading-relaxed">
            <span className="font-medium">{e.actor_id ? name(e.actor_id) : "Marketing HQ"}</span>{" "}
            <span className="text-muted-foreground">{describe(e)}</span>
            <div className="text-muted-foreground/80 mt-0.5" dir="ltr">{formatCairo(e.created_at, "d MMM, HH:mm")}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}
