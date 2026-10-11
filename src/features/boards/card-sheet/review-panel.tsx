"use client";

import { Check, RotateCcw, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMessage } from "@/hooks/use-message";
import { decideStep } from "../card-actions";
import { REVISION_REASONS, type RevisionReason } from "../types";

/** Approve, request changes (cards) or reject (requests) an active step. */
export function ReviewPanel({ stepId, onDone, kind = "card" }: { stepId: string; onDone: () => void; kind?: "card" | "request" }) {
  const t = useTranslations("stageActions");
  const tr = useTranslations("revisionReason");
  const tc = useTranslations("common");
  const message = useMessage();
  const [mode, setMode] = useState<"idle" | "changes" | "reject">("idle");
  const [comment, setComment] = useState("");
  const [reason, setReason] = useState<RevisionReason>("quality");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function decide(decision: "approved" | "changes_requested" | "rejected") {
    if (decision !== "approved" && !comment.trim()) {
      setError("stageActions.commentRequired");
      return;
    }
    startTransition(async () => {
      const r = await decideStep({
        step_id: stepId,
        decision,
        comment: comment.trim() || undefined,
        reason: decision === "changes_requested" ? reason : undefined,
      });
      if (r.ok) {
        toast.success(t("decided"));
        setMode("idle");
        setComment("");
        onDone();
      } else toast.error(message(r.error, r.params));
    });
  }

  if (mode === "idle") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={pending} onClick={() => decide("approved")}>
          <Check aria-hidden /> {t("approve")}
        </Button>
        {kind === "card" ? (
          <Button size="sm" variant="outline" onClick={() => setMode("changes")}>
            <RotateCcw aria-hidden /> {t("requestChanges")}
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setMode("reject")}>
            <X aria-hidden /> {t("reject")}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {mode === "changes" ? (
        <div className="space-y-1">
          <Label htmlFor={`reason-${stepId}`}>{t("reason")}</Label>
          <Select value={reason} onValueChange={(v) => setReason(v as RevisionReason)}>
            <SelectTrigger id={`reason-${stepId}`} className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {REVISION_REASONS.map((r) => <SelectItem key={r} value={r}>{tr(r)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <div className="space-y-1">
        <Label htmlFor={`comment-${stepId}`}>{t("comment")}</Label>
        <Textarea
          id={`comment-${stepId}`}
          rows={3}
          value={comment}
          aria-invalid={!!error}
          onChange={(e) => {
            setComment(e.target.value);
            setError(null);
          }}
        />
        {error ? <p className="text-destructive text-sm">{message(error)}</p> : null}
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant={mode === "reject" ? "destructive" : "default"} disabled={pending}
          onClick={() => decide(mode === "changes" ? "changes_requested" : "rejected")}>
          {mode === "changes" ? t("requestChanges") : t("reject")}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setMode("idle")}>{tc("cancel")}</Button>
      </div>
    </div>
  );
}
