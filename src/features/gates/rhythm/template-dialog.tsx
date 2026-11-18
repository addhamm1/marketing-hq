"use client";

import { useLocale, useTranslations } from "next-intl";
import { Controller, useWatch } from "react-hook-form";
import { FormField } from "@/components/form/form-field";
import { SubmitButton } from "@/components/form/submit-button";
import { useActionForm } from "@/components/form/use-action-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMessage } from "@/hooks/use-message";
import { weekdayName } from "../format";
import { OptionSelect, OwnerSelect } from "../form-fields";
import { saveGateTemplate } from "../rhythm-actions";
import { templateSchema, type TemplateOutput, type TemplateValues } from "../schemas";
import { GATE_KINDS, WORK_WEEKDAYS, type GateTemplate, type GateTrack } from "../types";
import { localName } from "../use-item-text";

export function TemplateDialog({ template, trackId, tracks, nextPosition, onClose }: {
  template: GateTemplate | null; trackId: string; tracks: GateTrack[]; nextPosition: number; onClose: () => void;
}) {
  const t = useTranslations("gates");
  const tc = useTranslations("common");
  const locale = useLocale();
  const message = useMessage();
  const { form, onSubmit, pending } = useActionForm<TemplateValues, undefined, TemplateOutput>({
    schema: templateSchema,
    action: saveGateTemplate,
    defaultValues: {
      id: template?.id ?? null,
      track_id: template?.track_id ?? trackId,
      kind: template?.kind ?? "phase",
      name_en: template?.name_en ?? "",
      name_ar: template?.name_ar ?? "",
      start_day: template?.start_day ?? 1,
      end_day: template?.end_day ?? 1,
      weekdays: template?.weekdays ?? [],
      owner_id: template?.owner_id ?? null,
      position: template?.position ?? nextPosition,
      is_active: template?.is_active ?? true,
    },
    successMessage: t("saved"),
    onSuccess: onClose,
  });
  const { errors } = form.formState;
  const kind = useWatch({ control: form.control, name: "kind" });
  const singleDay = kind === "gate" || kind === "checkpoint";

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{template ? t("rhythm.editTemplateTitle") : t("rhythm.addTemplate")}</DialogTitle>
        </DialogHeader>
        <form id="gate-template-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <FormField id="tpl-track" label={t("fields.track")} error={errors.track_id?.message}>
            <OptionSelect control={form.control} name="track_id" id="tpl-track"
              options={tracks.map((tr) => ({ value: tr.id, label: localName(tr, locale) }))} />
          </FormField>
          <FormField id="tpl-kind" label={t("fields.kind")} error={errors.kind?.message}>
            <OptionSelect control={form.control} name="kind" id="tpl-kind"
              options={GATE_KINDS.map((k) => ({ value: k, label: t(`kind.${k}`) }))} />
          </FormField>
          <FormField id="tpl-name-en" label={t("fields.nameEn")} error={errors.name_en?.message} className="sm:col-span-2">
            <Input id="tpl-name-en" dir="ltr" {...form.register("name_en")} />
          </FormField>
          <FormField id="tpl-name-ar" label={t("fields.nameAr")} error={errors.name_ar?.message} className="sm:col-span-2">
            <Input id="tpl-name-ar" dir="rtl" {...form.register("name_ar")} />
          </FormField>
          <FormField id="tpl-start" label={singleDay ? t("rhythm.fields.day") : t("rhythm.fields.startDay")} error={errors.start_day?.message}
            description={t("rhythm.fields.dayHint")}>
            <Input id="tpl-start" type="number" min={1} max={31} dir="ltr" {...form.register("start_day", { valueAsNumber: true })} />
          </FormField>
          {singleDay ? null : (
            <FormField id="tpl-end" label={t("rhythm.fields.endDay")} error={errors.end_day?.message}>
              <Input id="tpl-end" type="number" min={1} max={31} dir="ltr" {...form.register("end_day", { valueAsNumber: true })} />
            </FormField>
          )}
          {kind === "recurring" ? (
            <fieldset className="sm:col-span-2">
              <legend className="mb-2 text-sm font-medium">{t("rhythm.fields.weekdays")}</legend>
              <Controller
                control={form.control}
                name="weekdays"
                render={({ field }) => (
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {WORK_WEEKDAYS.map((d) => (
                      <Label key={d} className="flex items-center gap-2 font-normal">
                        <Checkbox
                          checked={field.value.includes(d)}
                          onCheckedChange={(on) => field.onChange(on ? [...field.value, d] : field.value.filter((x) => x !== d))}
                        />
                        {weekdayName(d, locale)}
                      </Label>
                    ))}
                  </div>
                )}
              />
              {errors.weekdays?.message ? <FieldError className="mt-2">{message(errors.weekdays.message)}</FieldError> : null}
            </fieldset>
          ) : null}
          <FormField id="tpl-owner" label={t("fields.owner")} error={errors.owner_id?.message}>
            <OwnerSelect control={form.control} name="owner_id" id="tpl-owner" />
          </FormField>
          <FormField id="tpl-order" label={t("rhythm.fields.order")} error={errors.position?.message}>
            <Input id="tpl-order" type="number" min={0} max={999} dir="ltr" {...form.register("position", { valueAsNumber: true })} />
          </FormField>
          <Controller
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <Label className="flex items-center gap-2 font-normal sm:col-span-2">
                <Switch checked={field.value} onCheckedChange={field.onChange} />
                {t("rhythm.fields.active")}
              </Label>
            )}
          />
        </form>
        <DialogFooter>
          <SubmitButton pending={pending} form="gate-template-form">{tc("save")}</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
