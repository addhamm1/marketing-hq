"use client";

import { Check, Clock, Paperclip, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { usePersonName } from "@/components/people-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMessage } from "@/hooks/use-message";
import { useRouter } from "@/i18n/navigation";
import { formatCairo } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { cancelRequest, requestFileUrl } from "./actions";

export type MyRequest = {
  id: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  starts_on: string | null;
  ends_on: string | null;
  days: number | null;
  submitted_at: string;
  files: string[];
  type: { key: string; name_en: string; name_ar: string };
  steps: { step_index: number; approver_id: string; status: string; comment: string | null }[];
};

const STATUS_STYLE = {
  pending: "bg-amber-50 text-amber-800",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-rose-50 text-rose-700",
  cancelled: "bg-slate-100 text-slate-600",
};

export function RequestList({ requests }: { requests: MyRequest[] }) {
  const t = useTranslations("requests");
  const ts = useTranslations("requestStatus");
  const locale = useLocale();
  const name = usePersonName();
  const message = useMessage();
  const router = useRouter();
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  return (
    <>
      <ul className="space-y-3">
        {requests.map((r) => (
          <li key={r.id} className="bg-card rounded-xl border p-4">
            <div className="flex flex-wrap items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{locale === "ar" ? r.type.name_ar : r.type.name_en}</p>
                <p className="text-muted-foreground text-xs" dir="ltr">
                  {r.starts_on ? `${r.starts_on}${r.ends_on && r.ends_on !== r.starts_on ? ` → ${r.ends_on}` : ""}` : ""}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {r.days ? `${t("days", { count: r.days })} · ` : ""}
                  {t("submittedOn", { date: formatCairo(r.submitted_at, "d MMM yyyy") })}
                </p>
              </div>
              <Badge className={cn("border-transparent", STATUS_STYLE[r.status])}>{ts(r.status)}</Badge>
            </div>
            {r.steps.length ? (
              <ol className="mt-3 flex flex-wrap gap-2" aria-label={t("steps")}>
                {r.steps.map((s, i) => (
                  <li key={i} className="bg-muted/60 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs">
                    {s.status === "approved" ? <Check className="size-3 text-emerald-600" aria-hidden /> : s.status === "rejected" ? <X className="size-3 text-rose-600" aria-hidden /> : <Clock className="text-muted-foreground size-3" aria-hidden />}
                    {name(s.approver_id)}
                    {s.comment && s.status === "rejected" ? <span className="text-muted-foreground">· {s.comment}</span> : null}
                  </li>
                ))}
              </ol>
            ) : null}
            {r.files.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {r.files.map((f, i) => (
                  <Button key={f} variant="outline" size="xs" onClick={() => startTransition(async () => {
                    const res = await requestFileUrl({ path: f });
                    if (res.ok) window.open(res.data.url, "_blank", "noopener,noreferrer");
                  })}>
                    <Paperclip aria-hidden /> {i + 1}
                  </Button>
                ))}
              </div>
            ) : null}
            {r.status === "pending" ? (
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => setCancelling(r.id)}>{t("cancel")}</Button>
            ) : null}
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={!!cancelling}
        onOpenChange={(o) => !o && setCancelling(null)}
        title={t("cancel")}
        body={t("cancelConfirm")}
        destructive
        onConfirm={() => {
          const id = cancelling;
          setCancelling(null);
          if (!id) return;
          startTransition(async () => {
            const res = await cancelRequest({ id });
            if (res.ok) {
              toast.success(t("cancelled"));
              router.refresh();
            } else toast.error(message(res.error));
          });
        }}
      />
    </>
  );
}
