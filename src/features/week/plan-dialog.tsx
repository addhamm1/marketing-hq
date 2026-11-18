"use client";

import { Loader2, RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Controller } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/form/form-field";
import { SubmitButton } from "@/components/form/submit-button";
import { useActionForm } from "@/components/form/use-action-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { clearPlanEntry, savePlanEntry } from "./actions";
import { formatCairoDate } from "./format";
import type { WeekOption } from "./queries";
import type { PlanKind } from "./plan-rules";
import { planEntrySchema, type PlanEntryInput } from "./schemas";
import { KIND_ICON } from "./week-chip";
import type { EditTarget } from "./week-grid";

const PLAN_KINDS: PlanKind[] = ["branch", "field", "home", "away"];

function PlanForm({ target, branches, onClose }: { target: EditTarget; branches: WeekOption[]; onClose: () => void }) {
  const t = useTranslations("week");
  const tk = useTranslations("week.kinds");
  const router = useRouter();
  const { person, day, cell } = target;
  const [clearing, startClearing] = useTransition();
  const done = () => {
    router.refresh();
    onClose();
  };
  const { form, onSubmit, pending, message } = useActionForm<PlanEntryInput>({
    schema: planEntrySchema,
    action: savePlanEntry,
    defaultValues: {
      user_id: person.id,
      day,
      kind: cell.planned ? (cell.kind as PlanKind) : "branch",
      branch_id: cell.kind === "branch" ? (cell.branchId ?? "") : "",
      place: cell.planned ? (cell.place ?? "") : "",
    },
    successMessage: t("saved"),
    onSuccess: done,
  });
  const kind = form.watch("kind");
  const errors = form.formState.errors;

  const clear = () =>
    startClearing(async () => {
      const result = await clearPlanEntry({ user_id: person.id, day });
      if (result.ok) {
        toast.success(t("cleared"));
        done();
      } else {
        toast.error(message(result.error, result.params));
      }
    });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Controller
        control={form.control}
        name="kind"
        render={({ field }) => (
          <RadioGroup value={field.value} onValueChange={field.onChange} aria-label={t("whereLabel")} className="grid-cols-2">
            {PLAN_KINDS.map((option) => {
              const Icon = KIND_ICON[option];
              return (
                <label
                  key={option}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm",
                    field.value === option && "border-primary bg-accent font-medium",
                  )}
                >
                  <RadioGroupItem value={option} />
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span className="min-w-0 truncate">{tk(option)}</span>
                </label>
              );
            })}
          </RadioGroup>
        )}
      />

      {kind === "branch" ? (
        <FormField id="plan-branch" label={t("branchLabel")} error={errors.branch_id?.message}>
          <Controller
            control={form.control}
            name="branch_id"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="plan-branch" className="w-full" aria-invalid={!!errors.branch_id}>
                  <SelectValue placeholder={t("branchPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
      ) : null}

      {kind === "field" ? (
        <FormField id="plan-place" label={t("placeLabel")} error={errors.place?.message}>
          <Input id="plan-place" maxLength={120} placeholder={t("placePlaceholder")} aria-invalid={!!errors.place} {...form.register("place")} />
        </FormField>
      ) : null}

      <DialogFooter className="gap-2 sm:justify-between">
        {cell.planned ? (
          <Button type="button" variant="ghost" onClick={clear} disabled={clearing || pending}>
            {clearing ? <Loader2 className="animate-spin" aria-hidden /> : <RotateCcw aria-hidden />}
            {t("clear")}
          </Button>
        ) : <span />}
        <SubmitButton pending={pending} disabled={clearing}>{t("save")}</SubmitButton>
      </DialogFooter>
    </form>
  );
}

export function PlanDialog({ target, branches, onClose }: { target: EditTarget | null; branches: WeekOption[]; onClose: () => void }) {
  const t = useTranslations("week");
  const locale = useLocale();
  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {target ? (
          <>
            <DialogHeader>
              <DialogTitle>{formatCairoDate(target.day, locale, { weekday: "long", day: "numeric", month: "long" })}</DialogTitle>
              <DialogDescription>{target.person.isMe ? t("whereLabel") : t("wherePerson", { name: target.person.name })}</DialogDescription>
            </DialogHeader>
            <PlanForm key={`${target.person.id}:${target.day}`} target={target} branches={branches} onClose={onClose} />
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
