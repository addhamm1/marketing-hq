"use client";

import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { usePeople } from "@/components/people-context";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMessage } from "@/hooks/use-message";
import { fromCairoInput } from "@/lib/dates";
import { moveCardStage } from "./card-actions";
import { ASSIGNEE_ROLES, type AssigneeRole, type Stage } from "./types";

export type StageMoveRequest = {
  cardId: string;
  title: string;
  from: Stage;
  to: Stage;
  position?: string;
  assignees: { user_id: string; role: AssigneeRole }[];
};

/** Moves that need input before they can happen. */
export function needsPayload(from: Stage, to: Stage) {
  return (
    (from === "brief_schedule" && to === "production") ||
    (from === "intake" && to === "request") ||
    (from === "performance_input" && to === "intake")
  );
}

export function StageMoveDialog({ request, onClose, onMoved }: { request: StageMoveRequest | null; onClose: () => void; onMoved: () => void }) {
  const t = useTranslations("stageActions");
  const ts = useTranslations("stages");
  const tr = useTranslations("assigneeRole");
  const tc = useTranslations("common");
  const tcard = useTranslations("card");
  const tb = useTranslations("boards");
  const message = useMessage();
  const { people } = usePeople();
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [missing, setMissing] = useState("");
  const [due, setDue] = useState("");
  const [rows, setRows] = useState<{ user_id: string; role: AssigneeRole }[]>(request?.assignees ?? []);
  const [seen, setSeen] = useState(request);
  if (request !== seen) {
    setSeen(request);
    setRows(request?.assignees.length ? request.assignees : [{ user_id: "", role: "design" }]);
    setNotes("");
    setReason("");
    setMissing("");
    setDue("");
  }
  if (!request) return null;

  const mode = request.to === "production" ? "production" : request.to === "request" ? "return" : "performance";

  function submit(payload: Record<string, unknown>) {
    if (!request) return;
    startTransition(async () => {
      const r = await moveCardStage({ id: request.cardId, to: request.to, position: request.position, payload });
      if (r.ok) {
        toast.success(t("moved", { stage: ts(request.to) }));
        onMoved();
        onClose();
      } else toast.error(message(r.error, r.params));
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "production" ? t("startProduction") : mode === "return" ? t("returnToRequester") : t("addNotes")}
          </DialogTitle>
          <DialogDescription>{request.title}</DialogDescription>
        </DialogHeader>

        {mode === "production" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{tcard("assignees")}</Label>
              {rows.map((row, i) => (
                <div key={i} className="flex gap-2">
                  <Select value={row.user_id} onValueChange={(v) => setRows(rows.map((r, j) => (j === i ? { ...r, user_id: v } : r)))}>
                    <SelectTrigger className="flex-1" aria-label={tb("assignee")}>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {people.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={row.role} onValueChange={(v) => setRows(rows.map((r, j) => (j === i ? { ...r, role: v as AssigneeRole } : r)))}>
                    <SelectTrigger className="w-32" aria-label={tc("title")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSIGNEE_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {tr(r)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label={tc("remove")}>
                    <Trash2 aria-hidden />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setRows([...rows, { user_id: "", role: "design" }])}>
                <Plus aria-hidden /> {tcard("addAssignee")}
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="production-due">{t("productionDue")}</Label>
              <Input id="production-due" type="datetime-local" dir="ltr" value={due} onChange={(e) => setDue(e.target.value)} />
            </div>
          </div>
        ) : null}

        {mode === "return" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="return-reason">{t("reason")}</Label>
              <Textarea id="return-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="return-missing">{t("missingItems")}</Label>
              <Textarea id="return-missing" rows={3} value={missing} onChange={(e) => setMissing(e.target.value)} />
            </div>
          </div>
        ) : null}

        {mode === "performance" ? (
          <div className="space-y-2">
            <Label htmlFor="perf-notes">{tcard("fields.performance_notes")}</Label>
            <Textarea id="perf-notes" rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        ) : null}

        <DialogFooter className="gap-2">
          {mode === "performance" ? (
            <>
              <Button variant="outline" disabled={pending} onClick={() => submit({ no_input: true })}>
                {t("noInput")}
              </Button>
              <Button disabled={pending || !notes.trim()} onClick={() => submit({ performance_notes: notes })}>
                {t("addNotes")}
              </Button>
            </>
          ) : mode === "return" ? (
            <Button
              disabled={pending || !reason.trim()}
              onClick={() => submit({ returned_reason: reason, missing_items: missing.split("\n").map((s) => s.trim()).filter(Boolean) })}
            >
              {t("returnToRequester")}
            </Button>
          ) : (
            <Button
              disabled={pending}
              onClick={() =>
                submit({
                  stage_due_at: fromCairoInput(due) ?? undefined,
                  assignees: rows.filter((r) => r.user_id),
                })
              }
            >
              {t("startProduction")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
