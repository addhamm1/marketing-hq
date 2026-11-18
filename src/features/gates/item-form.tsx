"use client";

import { useLocale, useTranslations } from "next-intl";
import { useWatch } from "react-hook-form";
import { FormField } from "@/components/form/form-field";
import { SubmitButton } from "@/components/form/submit-button";
import { useActionForm } from "@/components/form/use-action-form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { saveGateItem } from "./actions";
import { OptionSelect, OwnerSelect, StatusSelect } from "./form-fields";
import { monthInfo } from "./month";
import { itemSchema, type ItemOutput, type ItemValues } from "./schemas";
import { GATE_KINDS, type GateTrack } from "./types";
import { localName } from "./use-item-text";

/** The manager's form: edits one month's item, or adds a one-off when `tracks` is given. */
export function ItemForm({ defaults, tracks, onDone }: { defaults: ItemValues; tracks?: GateTrack[]; onDone: () => void }) {
  const t = useTranslations("gates");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { form, onSubmit, pending } = useActionForm<ItemValues, undefined, ItemOutput>({
    schema: itemSchema,
    action: saveGateItem,
    defaultValues: defaults,
    successMessage: t("saved"),
    onSuccess: onDone,
  });
  const { errors } = form.formState;
  const kind = useWatch({ control: form.control, name: "kind" });
  const info = monthInfo(defaults.month);
  const dateRange = { min: info.first, max: info.last };

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate data-testid="gate-item-form">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="gate-status" label={t("fields.status")} error={errors.status?.message}>
          <StatusSelect control={form.control} name="status" id="gate-status" />
        </FormField>
        <FormField id="gate-owner" label={t("fields.owner")} error={errors.owner_id?.message}>
          <OwnerSelect control={form.control} name="owner_id" id="gate-owner" />
        </FormField>
      </div>
      <FormField id="gate-note" label={t("fields.note")} error={errors.note?.message}>
        <Textarea id="gate-note" rows={3} {...form.register("note")} />
      </FormField>

      <Separator />

      {tracks ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="gate-track" label={t("fields.track")} error={errors.track_id?.message}>
            <OptionSelect control={form.control} name="track_id" id="gate-track"
              options={tracks.map((tr) => ({ value: tr.id, label: localName(tr, locale) }))} />
          </FormField>
          <FormField id="gate-kind" label={t("fields.kind")} error={errors.kind?.message}>
            <OptionSelect control={form.control} name="kind" id="gate-kind"
              options={GATE_KINDS.map((k) => ({ value: k, label: t(`kind.${k}`) }))} />
          </FormField>
        </div>
      ) : null}

      <FormField id="gate-name-en" label={t("fields.nameEn")} error={errors.name_en?.message}>
        <Input id="gate-name-en" dir="ltr" {...form.register("name_en")} />
      </FormField>
      <FormField id="gate-name-ar" label={t("fields.nameAr")} error={errors.name_ar?.message}>
        <Input id="gate-name-ar" dir="rtl" {...form.register("name_ar")} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        {kind === "phase" ? (
          <FormField id="gate-start" label={t("fields.startsOn")} error={errors.starts_on?.message}>
            <Input id="gate-start" type="date" dir="ltr" {...dateRange} {...form.register("starts_on")} />
          </FormField>
        ) : null}
        <FormField id="gate-due" label={kind === "phase" ? t("fields.dueOn") : t("fields.date")} error={errors.due_on?.message}>
          <Input id="gate-due" type="date" dir="ltr" {...dateRange} {...form.register("due_on")} />
        </FormField>
      </div>

      <SubmitButton pending={pending}>{tc("save")}</SubmitButton>
    </form>
  );
}
