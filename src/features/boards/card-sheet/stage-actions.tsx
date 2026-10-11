"use client";

import { ArrowLeft, ArrowRight, Hourglass } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { usePeople, usePersonName } from "@/components/people-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMessage } from "@/hooks/use-message";
import { moveCardStage, setReviewers } from "../card-actions";
import type { BoardPerms } from "../permissions";
import { StageMoveDialog, needsPayload, type StageMoveRequest } from "../stage-move-dialog";
import type { Stage } from "../types";
import type { CardDetail } from "./detail-query";
import { ReviewPanel } from "./review-panel";

type Move = { to: Stage; label: string; back?: boolean; primary?: boolean };

export function StageActions({ card, perms, me, onChanged }: { card: CardDetail; perms: BoardPerms; me: string; onChanged: () => void }) {
  const t = useTranslations("stageActions");
  const ts = useTranslations("stages");
  const tcard = useTranslations("card");
  const tc = useTranslations("common");
  const message = useMessage();
  const name = usePersonName();
  const { people } = usePeople();
  const [dialog, setDialog] = useState<StageMoveRequest | null>(null);
  const [pending, startTransition] = useTransition();
  const stage = card.stage!;
  const staff = perms.isTraffic || perms.isAdmin;
  const isAssignee = card.assignees.some((a) => a.user_id === me);
  const active = card.steps.find((s) => s.status === "active");

  const moves: Move[] = [];
  if (stage === "performance_input" && (perms.isPerformanceLead || staff)) moves.push({ to: "intake", label: t("addNotes"), primary: true });
  if (stage === "intake" && staff) {
    moves.push({ to: "brief_schedule", label: t("accept"), primary: true });
    moves.push({ to: "request", label: t("returnToRequester"), back: true });
  }
  if (stage === "brief_schedule" && staff) {
    moves.push({ to: "production", label: t("startProduction"), primary: true });
    moves.push({ to: "intake", label: t("backTo", { stage: ts("intake") }), back: true });
  }
  if (stage === "production" && (isAssignee || staff)) moves.push({ to: "creative_review", label: t("submitForReview"), primary: true });
  if (stage === "production" && staff) moves.push({ to: "brief_schedule", label: t("backTo", { stage: ts("brief_schedule") }), back: true });
  if (stage === "ready_to_publish" && (staff || perms.isCommunity || perms.isTeamLead)) moves.push({ to: "published", label: t("markPublished"), primary: true });
  if (stage === "published" && staff) moves.push({ to: "reported", label: t("markReported"), primary: true });

  function go(m: Move) {
    if (needsPayload(stage, m.to)) {
      setDialog({ cardId: card.id, title: card.title, from: stage, to: m.to, assignees: card.assignees });
      return;
    }
    startTransition(async () => {
      const r = await moveCardStage({ id: card.id, to: m.to });
      if (r.ok) toast.success(t("moved", { stage: ts(m.to) }));
      else toast.error(message(r.error, r.params));
      onChanged();
    });
  }

  const inReview = stage === "creative_review" || stage === "confirmation";

  return (
    <section className="bg-muted/40 space-y-3 rounded-xl border p-4" aria-label={t("title")}>
      <h3 className="text-sm font-semibold">{t("title")}</h3>
      {inReview && active ? (
        active.approver_id === me ? (
          <ReviewPanel stepId={active.id} onDone={onChanged} />
        ) : (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Hourglass className="size-4" aria-hidden /> {t("waitingFor", { name: name(active.approver_id) })}
          </p>
        )
      ) : null}
      {moves.length ? (
        <div className="flex flex-wrap gap-2">
          {moves.map((m) => (
            <Button key={m.to} variant={m.primary ? "default" : "outline"} size="sm" disabled={pending} onClick={() => go(m)}>
              {m.back ? <ArrowLeft className="rtl:rotate-180" aria-hidden /> : null}
              {m.label}
              {m.primary ? <ArrowRight className="rtl:rotate-180" aria-hidden /> : null}
            </Button>
          ))}
        </div>
      ) : !inReview ? (
        <p className="text-muted-foreground text-sm">{ts(stage)}</p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {(["reviewer_id", "approver_id"] as const).map((field) => (
          <div key={field} className="space-y-1">
            <Label className="text-muted-foreground text-xs">{tcard(`fields.${field}`)}</Label>
            {staff ? (
              <Select
                value={card[field] ?? "none"}
                onValueChange={(v) =>
                  startTransition(async () => {
                    const next = v === "none" ? null : v;
                    const r = await setReviewers({
                      card_id: card.id,
                      reviewer_id: field === "reviewer_id" ? next : card.reviewer_id,
                      approver_id: field === "approver_id" ? next : card.approver_id,
                    });
                    if (!r.ok) toast.error(message(r.error));
                    onChanged();
                  })
                }
              >
                <SelectTrigger size="sm" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{tc("none")}</SelectItem>
                  {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm">{name(card[field])}</p>
            )}
          </div>
        ))}
      </div>
      <StageMoveDialog request={dialog} onClose={() => setDialog(null)} onMoved={onChanged} />
    </section>
  );
}
