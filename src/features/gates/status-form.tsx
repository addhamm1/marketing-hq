"use client";

import { useTranslations } from "next-intl";
import { FormField } from "@/components/form/form-field";
import { SubmitButton } from "@/components/form/submit-button";
import { useActionForm } from "@/components/form/use-action-form";
import { Textarea } from "@/components/ui/textarea";
import { setGateStatus } from "./actions";
import { StatusSelect } from "./form-fields";
import { statusSchema, type StatusValues } from "./schemas";
import type { GateItem } from "./types";

/** For the owner of an item: progress and a note, nothing else. */
export function StatusForm({ item, onDone }: { item: GateItem; onDone: () => void }) {
  const t = useTranslations("gates");
  const tc = useTranslations("common");
  const { form, onSubmit, pending } = useActionForm<StatusValues>({
    schema: statusSchema,
    action: setGateStatus,
    defaultValues: { id: item.id, status: item.status, note: item.note },
    successMessage: t("saved"),
    onSuccess: onDone,
  });
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormField id="gate-status" label={t("fields.status")} error={form.formState.errors.status?.message}>
        <StatusSelect control={form.control} name="status" id="gate-status" />
      </FormField>
      <FormField id="gate-note" label={t("fields.note")} error={form.formState.errors.note?.message}>
        <Textarea id="gate-note" rows={3} {...form.register("note")} />
      </FormField>
      <SubmitButton pending={pending}>{tc("save")}</SubmitButton>
    </form>
  );
}
